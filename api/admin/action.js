/**
 * POST /api/admin/action — settle a booking by hand.
 *
 * Body: { bookingId, action, amountPaid?, method?, note?, notify? }
 *
 *   confirm  payment received -> status `confirmed`, confirmation email to the
 *            student. The seat was already held from the moment they submitted
 *            the form, so nothing is reserved here; this settles the booking
 *            that is already holding it.
 *   cancel   status `cancelled` and the seat goes back to the batch. Emails the
 *            student only when `notify` is true.
 *
 * Both are idempotent — the status flip is the guard, so a double-click cannot
 * send two emails or release a seat twice.
 */
import { json, methodGuard, readBody, str, rateLimited } from '../_lib/http.js';
import { isConfigured, isAuthenticated } from '../_lib/adminAuth.js';
import { getDb, ConfigError } from '../_lib/db.js';
import { confirmManualBooking, cancelBooking } from '../_lib/confirm.js';
import * as mailer from '../_lib/mailer.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return;

  if (!isConfigured()) {
    return json(res, 503, { error: 'The admin panel is not set up. Add ADMIN_PASSWORD and redeploy.' });
  }
  if (!isAuthenticated(req)) {
    return json(res, 401, { error: 'Not signed in.' });
  }
  if (rateLimited(req, { key: 'admin-action', max: 60, windowMs: 60000 })) {
    return json(res, 429, { error: 'Slow down a moment.' });
  }

  const body = readBody(req);
  const bookingId = str(body.bookingId, 40);
  const action = str(body.action, 20);

  if (!bookingId) return json(res, 400, { error: 'Which booking?' });
  if (action !== 'confirm' && action !== 'cancel') {
    return json(res, 400, { error: 'Unknown action.' });
  }

  let db;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) return json(res, 503, { error: err.message });
    console.error('[admin/action] db unavailable:', err.message);
    return json(res, 503, { error: 'The database is unavailable right now.' });
  }

  try {
    if (action === 'confirm') {
      const out = await confirmManualBooking(db, bookingId, {
        amountPaid: body.amountPaid,
        method: str(body.method, 30) || 'manual',
        note: str(body.note, 300),
      });

      if (!out.found) return json(res, 404, { error: 'No booking with that reference.' });

      if (!out.changed) {
        const why = out.reason === 'cancelled'
          ? 'That booking was cancelled — it cannot be confirmed.'
          : 'That booking was already confirmed.';
        return json(res, 409, { error: why, status: out.booking?.status, booking: out.booking });
      }

      return json(res, 200, {
        ok: true,
        status: 'confirmed',
        emailed: out.emailed,
        // Surfaced so the panel can warn instead of silently not emailing.
        emailConfigured: mailer.isConfigured(),
        bookingId,
      });
    }

    /* ── cancel ── */
    const out = await cancelBooking(db, bookingId, {
      reason: str(body.note, 300) || 'admin_cancelled',
      notify: body.notify === true,
    });

    if (!out.found) return json(res, 404, { error: 'No booking with that reference.' });
    if (!out.changed) {
      return json(res, 409, { error: 'That booking was already cancelled.', status: 'cancelled' });
    }

    return json(res, 200, {
      ok: true,
      status: 'cancelled',
      emailed: out.emailed,
      emailConfigured: mailer.isConfigured(),
      bookingId,
    });
  } catch (err) {
    console.error('[admin/action] failed:', err.message);
    return json(res, 500, { error: 'That did not go through. Try again.' });
  }
}
