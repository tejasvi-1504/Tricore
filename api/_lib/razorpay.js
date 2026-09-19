/**
 * Razorpay — server-side only.
 *
 * The browser receives an order id and the *public* key id. The key secret
 * never leaves the server; it signs and it authenticates, nothing more.
 *
 * The rule from the Cashfree adapter carries over and matters more here: a
 * payment is confirmed only by asking Razorpay directly. Checkout hands the
 * browser a signature, and a webhook posts a payload, but both arrive through
 * an untrusted channel. We verify what we can and then re-fetch regardless, so
 * a forged callback can trigger a lookup and nothing else.
 *
 * Docs: https://razorpay.com/docs/api/
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const BASE = 'https://api.razorpay.com/v1';

export class ConfigError extends Error {}
export class RazorpayError extends Error {}

function creds() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new ConfigError('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return { keyId, keySecret };
}

export function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** The only credential the browser is allowed to see. */
export function publicKeyId() {
  return process.env.RAZORPAY_KEY_ID || '';
}

/** Live keys start rzp_live_; test keys rzp_test_. Worth surfacing in the panel. */
export function isLive() {
  return String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_live_');
}

async function call(path, { method = 'GET', body } = {}) {
  const { keyId, keySecret } = creds();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const res = await fetch(BASE + path, {
    method,
    headers: {
      authorization: 'Basic ' + auth,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new RazorpayError(`Razorpay returned a non-JSON response (HTTP ${res.status}).`);
  }
  if (!res.ok) {
    throw new RazorpayError(data?.error?.description || `Razorpay request failed (HTTP ${res.status}).`);
  }
  return data;
}

/**
 * Create an order. Razorpay works in the smallest currency unit, so rupees are
 * converted to paise here and nowhere else — a stray rupee/paise mix-up is a
 * hundredfold pricing bug.
 */
export async function createOrder({ bookingId, amount, notes = {} }) {
  const paise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paise) || paise < 100) {
    throw new RazorpayError('Razorpay needs an amount of at least ₹1.');
  }

  const order = await call('/orders', {
    method: 'POST',
    body: {
      amount: paise,
      currency: 'INR',
      // Shown on the Razorpay dashboard, so a payment can be traced back.
      receipt: String(bookingId).slice(0, 40),
      notes: { bookingId: String(bookingId), ...notes },
    },
  });

  if (!order?.id) throw new RazorpayError('Razorpay did not return an order.');
  return { orderId: order.id, amount: order.amount, currency: order.currency };
}

const sameString = (a, b) => {
  const x = Buffer.from(String(a ?? ''), 'utf8');
  const y = Buffer.from(String(b ?? ''), 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Verify the signature Checkout hands back: HMAC-SHA256(order_id|payment_id).
 *
 * A pass means the browser is not making it up. It is still not proof of
 * payment — only a captured payment on Razorpay's side is that.
 */
export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  return sameString(expected, signature);
}

/**
 * Webhook signature: HMAC-SHA256 of the exact raw body, keyed on the webhook
 * secret (which is separate from the API key secret).
 */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawBody || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return sameString(expected, signature);
}

/**
 * Ask Razorpay what actually happened to an order. This is the authoritative
 * check; everything else is a hint that triggers it.
 *
 * Returns { status, paid, amountPaid, paymentId }. `amountPaid` is in rupees.
 */
export async function getOrderStatus(orderId) {
  const order = await call('/orders/' + encodeURIComponent(orderId));

  // 'paid' on the order means Razorpay has a captured payment against it, but
  // read the payment itself so the id and the exact captured amount are real.
  let paymentId = null;
  let captured = 0;

  try {
    const list = await call(`/orders/${encodeURIComponent(orderId)}/payments`);
    const hit = (list.items || []).find((p) => p.status === 'captured')
             || (list.items || []).find((p) => p.status === 'authorized');
    if (hit) {
      paymentId = hit.id;
      if (hit.status === 'captured') captured = (hit.amount || 0) / 100;
    }
  } catch (err) {
    // The order status alone is still usable if the payment list fails.
    console.error('[razorpay] payment list failed:', err.message);
  }

  const paid = order.status === 'paid';
  return {
    status: String(order.status || 'unknown').toUpperCase(),
    paid,
    amountPaid: captured || (paid ? (order.amount_paid || 0) / 100 : 0),
    paymentId,
    raw: order,
  };
}

/** A single payment, for the admin panel and for refund checks. */
export async function getPayment(paymentId) {
  const p = await call('/payments/' + encodeURIComponent(paymentId));
  return {
    id: p.id,
    status: p.status,
    paid: p.status === 'captured',
    amount: (p.amount || 0) / 100,
    method: p.method,
    email: p.email,
    contact: p.contact,
    orderId: p.order_id,
  };
}
