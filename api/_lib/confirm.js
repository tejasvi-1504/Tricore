/**
 * Settle a pending booking against Cashfree.
 *
 * Both the webhook and the return page funnel through here. The rule is that we
 * never trust an incoming payload to tell us a booking is paid — we ask
 * Cashfree directly. That makes a forged webhook harmless: it can trigger a
 * lookup, but only Cashfree's own answer can confirm a booking.
 *
 * Safe to call repeatedly; confirmation and email are guarded so a webhook plus
 * a page refresh will not double-send.
 */
import { collections } from './db.js';
import { releaseSeat } from './reservations.js';
import * as cashfree from './cashfree.js';
import { sendBookingConfirmation, sendBookingNotification } from './mailer.js';

export async function settleBooking(db, bookingId) {
  const bookings = collections.bookings(db);
  const booking = await bookings.findOne({ bookingId });
  if (!booking) return { found: false };

  // Already settled — nothing to do.
  if (booking.status === 'confirmed' || booking.status === 'cancelled') {
    return { found: true, booking, changed: false };
  }
  if (booking.amount <= 0) {
    return { found: true, booking, changed: false };
  }

  const orderId = booking.payment?.orderId || booking.bookingId;

  let status;
  try {
    status = await cashfree.getPaymentLinkStatus(orderId);
  } catch (err) {
    console.error('[confirm] Cashfree lookup failed:', err.message);
    return { found: true, booking, changed: false, error: 'lookup_failed' };
  }

  /* ── paid ──────────────────────────────────────────────────────────────── */
  if (status.paid) {
    // Only the update that actually flips `pending` -> `confirmed` sends email,
    // so concurrent webhook + page-refresh cannot double-send.
    const result = await bookings.findOneAndUpdate(
      { bookingId, status: 'pending' },
      {
        $set: {
          status: 'confirmed',
          'payment.status': 'PAID',
          'payment.amountPaid': status.amountPaid,
          'payment.paidAt': new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    const updated = result?.value ?? result;
    if (updated) {
      await Promise.allSettled([
        sendBookingConfirmation(updated),
        sendBookingNotification(updated),
      ]);
      return { found: true, booking: updated, changed: true };
    }
    // Someone else confirmed it first.
    return { found: true, booking: await bookings.findOne({ bookingId }), changed: false };
  }

  /* ── expired or failed: release the slot for someone else ──────────────── */
  if (status.status === 'EXPIRED' || status.status === 'CANCELLED') {
    const result = await bookings.findOneAndUpdate(
      { bookingId, status: 'pending' },
      {
        $set: {
          status: 'cancelled',
          cancelReason: 'payment_' + status.status.toLowerCase(),
          'payment.status': status.status,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    const updated = result?.value ?? result;
    if (updated) await releaseSeat(db, updated.slotId);
    return { found: true, booking: updated ?? booking, changed: Boolean(updated) };
  }

  /* ── still awaiting payment ────────────────────────────────────────────── */
  await bookings.updateOne(
    { bookingId, status: 'pending' },
    { $set: { 'payment.status': status.status, updatedAt: new Date() } }
  );
  return { found: true, booking, changed: false };
}
