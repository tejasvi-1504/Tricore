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
import { sendBookingConfirmation, sendBookingNotification, sendBookingCancelled } from './mailer.js';

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

/* ── manual confirmation (admin panel) ────────────────────────────────────── */

/**
 * Mark a manually-paid booking as confirmed and email the student.
 *
 * The seat was already reserved when the student submitted the form, so this
 * does not take a new one — it settles the booking that is already holding it.
 *
 * Idempotent by the same trick `settleBooking` uses: only the update that
 * actually flips the status sends mail, so a double-click cannot send twice.
 */
export async function confirmManualBooking(db, bookingId, opts = {}) {
  const { amountPaid, method = 'manual', note = '', by = 'admin' } = opts;
  const bookings = collections.bookings(db);

  const existing = await bookings.findOne({ bookingId });
  if (!existing) return { found: false };
  if (existing.status === 'confirmed') {
    return { found: true, booking: existing, changed: false, reason: 'already_confirmed' };
  }
  if (existing.status === 'cancelled') {
    return { found: true, booking: existing, changed: false, reason: 'cancelled' };
  }

  const now = new Date();
  const paid = Number(amountPaid);

  const result = await bookings.findOneAndUpdate(
    { bookingId, status: { $in: ['awaiting_confirmation', 'pending'] } },
    {
      $set: {
        status: 'confirmed',
        'payment.provider': existing.payment?.provider || 'manual',
        'payment.status': 'PAID',
        'payment.method': method,
        'payment.amountPaid': Number.isFinite(paid) && paid >= 0 ? paid : existing.amount,
        'payment.paidAt': now,
        'payment.confirmedBy': by,
        ...(note ? { 'payment.note': note } : {}),
        confirmedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  );

  const updated = result?.value ?? result;
  if (!updated) {
    // Another request confirmed it between our read and our write.
    return {
      found: true,
      booking: await bookings.findOne({ bookingId }),
      changed: false,
      reason: 'race',
    };
  }

  const emailed = await sendBookingConfirmation(updated);
  return { found: true, booking: updated, changed: true, emailed };
}

/**
 * Cancel a booking and hand its seat back to the batch.
 *
 * Releasing is guarded on the status flip for the same reason as above: only
 * the caller that actually cancelled the booking returns the seat, so a
 * double-click cannot decrement the slot count twice.
 */
export async function cancelBooking(db, bookingId, opts = {}) {
  const { reason = 'admin_cancelled', by = 'admin', notify = false } = opts;
  const bookings = collections.bookings(db);

  const existing = await bookings.findOne({ bookingId });
  if (!existing) return { found: false };
  if (existing.status === 'cancelled') {
    return { found: true, booking: existing, changed: false, reason: 'already_cancelled' };
  }

  const now = new Date();
  const result = await bookings.findOneAndUpdate(
    { bookingId, status: { $ne: 'cancelled' } },
    {
      $set: {
        status: 'cancelled',
        cancelReason: reason,
        cancelledBy: by,
        cancelledAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  );

  const updated = result?.value ?? result;
  if (!updated) {
    return {
      found: true,
      booking: await bookings.findOne({ bookingId }),
      changed: false,
      reason: 'race',
    };
  }

  await releaseSeat(db, updated.slotId);

  let emailed = false;
  if (notify) emailed = await sendBookingCancelled(updated);

  return { found: true, booking: updated, changed: true, emailed };
}
