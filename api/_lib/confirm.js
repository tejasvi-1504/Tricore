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
import * as razorpay from './razorpay.js';
import { sendBookingConfirmation, sendBookingNotification, sendBookingCancelled } from './mailer.js';
import { getSettings, meetLinkFor } from './settings.js';

export async function settleBooking(db, bookingId) {
  const bookings = collections.bookings(db);
  // Accept either our own reference or the gateway's order id, since a webhook
  // may only know the latter.
  const booking = await bookings.findOne({ bookingId })
    ?? await bookings.findOne({ 'payment.orderId': bookingId });
  if (!booking) return { found: false };
  bookingId = booking.bookingId;

  // Already settled — nothing to do.
  if (booking.status === 'confirmed' || booking.status === 'cancelled') {
    return { found: true, booking, changed: false };
  }
  if (booking.amount <= 0) {
    return { found: true, booking, changed: false };
  }

  const provider = booking.payment?.provider || 'cashfree';
  const orderId = booking.payment?.orderId || booking.bookingId;

  // Whichever gateway took the money is the one we ask. Nothing in the
  // incoming request decides this — it comes off the stored booking.
  let status;
  try {
    status = provider === 'razorpay'
      ? await razorpay.getOrderStatus(orderId)
      : await cashfree.getPaymentLinkStatus(orderId);
  } catch (err) {
    console.error(`[confirm] ${provider} lookup failed:`, err.message);
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
          ...(status.paymentId ? { 'payment.paymentId': status.paymentId } : {}),
          'payment.paidAt': new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    const updated = result?.value ?? result;
    if (updated) {
      const meetLink = meetLinkFor(updated, await getSettings(db));
      await Promise.allSettled([
        sendBookingConfirmation(updated, meetLink),
        sendBookingNotification(updated),
      ]);
      return { found: true, booking: updated, changed: true };
    }
    // Someone else confirmed it first.
    return { found: true, booking: await bookings.findOne({ bookingId }), changed: false };
  }

  /* ── expired or failed: release the slot for someone else ──────────────── */
  /*
   * Only a gateway that actually reports a dead link releases the seat.
   * Razorpay orders go created -> attempted -> paid, and "attempted" means
   * someone tried and can still retry — cancelling on it would free a seat
   * out from under a student who is mid-payment.
   */
  const dead = provider === 'cashfree' && ['EXPIRED', 'CANCELLED'].includes(status.status);
  if (dead) {
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
 * Record an off-gateway payment and confirm the booking.
 *
 * The seat was already reserved when the student submitted the form, so this
 * does not take a new one — it settles the booking that is already holding it.
 *
 * Two rules, both of them about not confirming something that was not paid:
 *
 *   1. A booking that went to a gateway belongs to that gateway. Confirming it
 *      from the panel would stamp it PAID and email the student on nothing
 *      more than a click, so we ask the gateway and refuse if the answer is
 *      no. If the answer is yes, it is settled through the normal path so the
 *      amount and payment id come from the gateway rather than the form.
 *   2. A genuinely manual booking needs a real figure. It used to fall back to
 *      the full amount when none was given, which recorded "paid in full" for
 *      an admin who simply left the field empty.
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

  const due = Number(existing.amount) || 0;

  /* ── a gateway booking is the gateway's to settle ───────────────────── */
  const provider = existing.payment?.provider;
  const orderId = existing.payment?.orderId;
  if (due > 0 && orderId && (provider === 'razorpay' || provider === 'cashfree')) {
    let status;
    try {
      status = provider === 'razorpay'
        ? await razorpay.getOrderStatus(orderId)
        : await cashfree.getPaymentLinkStatus(orderId);
    } catch (err) {
      console.error(`[confirm] ${provider} lookup failed for ${bookingId}:`, err.message);
      return { found: true, booking: existing, changed: false, reason: 'lookup_failed' };
    }
    if (!status.paid) {
      return {
        found: true, booking: existing, changed: false,
        reason: 'not_paid', provider, gatewayStatus: status.status,
      };
    }
    const settled = await settleBooking(db, bookingId);
    return { ...settled, emailed: Boolean(settled.changed) };
  }

  /* ── an off-gateway payment has to be stated, and has to cover it ───── */
  const paid = Number(amountPaid);
  if (due > 0) {
    if (!Number.isFinite(paid) || paid <= 0) {
      return { found: true, booking: existing, changed: false, reason: 'amount_required', due };
    }
    // A rupee of slack for rounding, nothing more.
    if (paid + 1 < due) {
      return { found: true, booking: existing, changed: false, reason: 'short_payment', due, paid };
    }
  }

  const now = new Date();

  const result = await bookings.findOneAndUpdate(
    { bookingId, status: { $in: ['awaiting_confirmation', 'pending'] } },
    {
      $set: {
        status: 'confirmed',
        'payment.provider': existing.payment?.provider || 'manual',
        'payment.status': 'PAID',
        'payment.method': method,
        'payment.amountPaid': Number.isFinite(paid) && paid >= 0 ? paid : due,
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

  const meetLink = meetLinkFor(updated, await getSettings(db));
  const emailed = await sendBookingConfirmation(updated, meetLink);
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

/* ── stale holds ──────────────────────────────────────────────────────────── */

/** How long a checkout may hold a seat before we go and ask about it. */
const HOLD_MINUTES = 20;

/**
 * Release the seats behind abandoned checkouts.
 *
 * A booking goes `pending` and takes its seat the moment the form is
 * submitted, which is right — two people must not be sold the same slot while
 * one of them is inside Razorpay. But nothing ever gave the seat back when the
 * student simply closed the window, so an unpaid booking held capacity for
 * ever.
 *
 * Every stale one is checked against its own gateway rather than assumed dead:
 * if it turns out to be paid, `settleBooking` confirms it and sends the email
 * that a missing webhook would otherwise have cost the student. Only a gateway
 * that does not say "paid" loses the seat.
 *
 * Called opportunistically while reading availability, so it costs nothing on
 * a quiet day. Bounded, and never allowed to fail the request it rides on.
 */
export async function reapStaleHolds(db, { date, mode, plan, limit = 8 } = {}) {
  const cutoff = new Date(Date.now() - HOLD_MINUTES * 60_000);
  const query = { status: 'pending', createdAt: { $lt: cutoff } };
  if (date) query.date = date;
  if (mode) query.mode = mode;
  if (plan) query.plan = plan;

  let stale = [];
  try {
    stale = await collections.bookings(db)
      .find(query, { projection: { bookingId: 1 } })
      .limit(limit)
      .toArray();
  } catch (err) {
    console.error('[confirm] stale lookup failed:', err.message);
    return { checked: 0, released: 0, confirmed: 0 };
  }

  let released = 0;
  let confirmed = 0;

  for (const { bookingId } of stale) {
    // Ask the gateway. Paid ones get confirmed here, not cancelled.
    let out;
    try {
      out = await settleBooking(db, bookingId);
    } catch (err) {
      console.error(`[confirm] settle failed for ${bookingId}:`, err.message);
      continue;
    }
    if (out.booking?.status === 'confirmed') { confirmed += 1; continue; }
    if (out.error === 'lookup_failed') continue;   // unknown is not unpaid
    if (out.booking?.status === 'cancelled') { released += 1; continue; }

    // Still pending after the gateway was asked: it was never paid.
    const result = await collections.bookings(db).findOneAndUpdate(
      { bookingId, status: 'pending', createdAt: { $lt: cutoff } },
      {
        $set: {
          status: 'cancelled',
          cancelReason: 'hold_expired',
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    const updated = result?.value ?? result;
    if (updated) {
      await releaseSeat(db, updated.slotId);
      released += 1;
    }
  }

  if (released || confirmed) {
    console.log(`[confirm] stale holds: ${released} released, ${confirmed} confirmed late`);
  }
  return { checked: stale.length, released, confirmed };
}
