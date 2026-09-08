/**
 * POST /api/payment-webhook — Cashfree payment notifications.
 *
 * Set this URL as the webhook endpoint in the Cashfree dashboard.
 *
 * The payload is treated only as a hint: we pull the booking id out of it and
 * then ask Cashfree directly whether that link is paid (see _lib/confirm.js).
 * A forged webhook therefore cannot confirm an unpaid booking. The signature is
 * still verified when the raw body is available, and logged if it fails.
 *
 * Always returns 200 for anything well-formed — Cashfree retries non-2xx, and
 * we do not want retries for a booking id we simply do not recognise.
 */
import { getDb, ConfigError } from './_lib/db.js';
import { json, methodGuard, readBody } from './_lib/http.js';
import { verifyWebhookSignature } from './_lib/cashfree.js';
import { settleBooking } from './_lib/confirm.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return;

  const payload = readBody(req);
  const rawBody = typeof req.body === 'string' ? req.body : null;

  // Best-effort signature check. Vercel pre-parses JSON bodies, so the raw
  // bytes are not always recoverable — hence the direct Cashfree lookup below
  // being the actual source of truth.
  if (rawBody) {
    const ok = await verifyWebhookSignature(
      rawBody,
      req.headers['x-webhook-signature'],
      req.headers['x-webhook-timestamp']
    );
    if (!ok) console.warn('[webhook] signature mismatch — verifying with Cashfree directly');
  }

  const bookingId =
    payload?.data?.link?.link_id ||
    payload?.data?.order?.order_id ||
    payload?.link_id ||
    payload?.order_id;

  if (!bookingId) {
    console.warn('[webhook] no booking id in payload', payload?.type ?? '');
    return json(res, 200, { received: true, ignored: true });
  }

  try {
    const db = await getDb();
    const result = await settleBooking(db, String(bookingId));
    console.log(
      `[webhook] ${bookingId} -> ${result.booking?.status ?? 'not-found'}${
        result.changed ? ' (updated)' : ''
      }`
    );
    return json(res, 200, { received: true });
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error('[webhook]', err.message);
      return json(res, 200, { received: true, ignored: true });
    }
    // A real outage: 500 asks Cashfree to retry later.
    console.error('[webhook] failed:', err.message);
    return json(res, 500, { error: 'Could not process webhook.' });
  }
}
