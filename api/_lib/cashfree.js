/**
 * Cashfree Payment Gateway — server-side only.
 *
 * Uses the Payment Links API, so the browser only ever receives a hosted
 * checkout URL. The client id / secret must never reach the frontend.
 *
 * Docs: https://docs.cashfree.com/reference/pg-new-apis-endpoint
 */

const API_VERSION = '2023-08-01';

export class ConfigError extends Error {}
export class CashfreeError extends Error {}

function creds() {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) {
    throw new ConfigError(
      'Cashfree is not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.'
    );
  }
  // 'production' switches to live money. Anything else stays in sandbox.
  const base =
    process.env.CASHFREE_ENV === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  return { appId, secret, base };
}

export function isConfigured() {
  return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
}

async function call(path, { method = 'GET', body } = {}) {
  const { appId, secret, base } = creds();
  const res = await fetch(base + path, {
    method,
    headers: {
      'x-client-id': appId,
      'x-client-secret': secret,
      'x-api-version': API_VERSION,
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
    throw new CashfreeError(`Cashfree returned a non-JSON response (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    throw new CashfreeError(data.message || `Cashfree request failed (HTTP ${res.status}).`);
  }
  return data;
}

/**
 * Create a hosted payment link for a booking.
 * Returns { linkId, linkUrl }.
 */
export async function createPaymentLink({
  linkId,
  amount,
  purpose,
  customer,
  returnUrl,
  notifyUrl,
  expiryMinutes = 30,
}) {
  const expiry = new Date(Date.now() + expiryMinutes * 60000);

  const payload = {
    link_id: linkId,
    link_amount: Number(amount),
    link_currency: 'INR',
    link_purpose: purpose.slice(0, 100),
    customer_details: {
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
    },
    link_partial_payments: false,
    link_expiry_time: expiry.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    link_notify: { send_email: false, send_sms: false },
    link_auto_reminders: false,
    link_meta: {
      return_url: returnUrl,
      ...(notifyUrl ? { notify_url: notifyUrl } : {}),
    },
  };

  const data = await call('/links', { method: 'POST', body: payload });
  if (!data.link_url) throw new CashfreeError('Cashfree did not return a payment link.');
  return { linkId: data.link_id, linkUrl: data.link_url };
}

/**
 * Ask Cashfree directly whether a link has been paid.
 *
 * This is the authoritative check. Webhook payloads are only ever used as a
 * hint to trigger this call, so a forged webhook can never confirm a booking.
 * Returns { status, paid, amountPaid }.
 */
export async function getPaymentLinkStatus(linkId) {
  const data = await call('/links/' + encodeURIComponent(linkId));
  const status = data.link_status || 'UNKNOWN';
  return {
    status,
    paid: status === 'PAID',
    amountPaid: data.link_amount_paid ?? 0,
    raw: data,
  };
}

/**
 * Verify a Cashfree webhook signature: base64(HMAC-SHA256(timestamp + rawBody)).
 * Returns true/false; callers treat a false as "untrusted hint", not as proof
 * of fraud, because the order is re-fetched from Cashfree either way.
 */
export async function verifyWebhookSignature(rawBody, signature, timestamp) {
  if (!signature || !timestamp || !rawBody) return false;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret) return false;

  const { createHmac } = await import('node:crypto');
  const expected = createHmac('sha256', secret)
    .update(timestamp + rawBody)
    .digest('base64');

  const { timingSafeEqual } = await import('node:crypto');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
