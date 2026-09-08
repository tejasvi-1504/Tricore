/**
 * GET /api/booking-status?id=KVX-XXXXXX
 *
 * Used by booking-status.html after the student returns from Cashfree. It runs
 * the same verification the webhook does, so a booking still gets confirmed
 * even if the webhook never arrives.
 *
 * Only non-sensitive fields are returned — the booking id alone is not treated
 * as an authentication token.
 */
import { getDb, collections, ConfigError } from './_lib/db.js';
import { json, methodGuard, str, rateLimited } from './_lib/http.js';
import { settleBooking } from './_lib/confirm.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET'])) return;

  if (rateLimited(req, { key: 'status', max: 30, windowMs: 60000 })) {
    return json(res, 429, { error: 'Too many requests. Please wait a moment.' });
  }

  const bookingId = str(req.query?.id, 20).toUpperCase();
  // KC- is the current prefix; KVX- was used before the rename, so references
  // students were already given keep working.
  if (!/^(KC|KVX)-[A-Z0-9]{6}$/.test(bookingId)) {
    return json(res, 400, { error: 'Invalid booking reference.' });
  }

  let db;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error('[booking-status]', err.message);
      return json(res, 503, { error: 'Booking system unavailable.' });
    }
    throw err;
  }

  // Settle first (confirms the booking if Cashfree says it is paid), then read.
  await settleBooking(db, bookingId).catch((err) =>
    console.error('[booking-status] settle failed:', err.message)
  );

  const booking = await collections.bookings(db).findOne(
    { bookingId },
    {
      projection: {
        _id: 0,
        bookingId: 1,
        sessionLabel: 1,
        dateLabel: 1,
        timeLabel: 1,
        durationMins: 1,
        amount: 1,
        status: 1,
        name: 1,
      },
    }
  );

  if (!booking) return json(res, 404, { error: 'Booking not found.' });

  return json(res, 200, {
    ...booking,
    // Only the first name, so a guessed id leaks as little as possible.
    name: String(booking.name || '').split(' ')[0],
  });
}
