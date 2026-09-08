/**
 * POST /api/bookings — book a trial or enrol in the monthly programme.
 *
 * Flow:
 *   1. Validate plan + mode + date (+ time where the combination needs one).
 *      The server is authoritative; the browser's copy of the rules is only a
 *      convenience.
 *   2. Atomically take a seat, so two students can't claim the same slot.
 *   3. Store the booking.
 *   4. Hand it off for payment:
 *        PAYMENT_MODE=manual   (default) -> status `awaiting_confirmation`,
 *          return a WhatsApp link pre-filled with the booking details.
 *          Krevol confirms and collects payment by hand.
 *        PAYMENT_MODE=cashfree -> status `pending`, return a payment link.
 *
 * If anything fails after the seat is taken, the seat is released again.
 */
import { getDb, collections, ConfigError } from './_lib/db.js';
import {
  json, methodGuard, readBody, str, isEmail, normalisePhone,
  makeBookingId, rateLimited, siteOrigin,
} from './_lib/http.js';
import {
  PLANS, MODES, PROGRAMME, validateEnrolment, needsTime,
  priceForPlan, listPriceForPlan, paymentMode,
  formatDate, addDays, toLabel,
} from './_lib/availability.js';
import { reserveSeat, releaseSeat } from './_lib/reservations.js';
import { bookingWhatsappUrl } from './_lib/handoff.js';
import * as cashfree from './_lib/cashfree.js';
import { sendBookingNotification, sendBookingConfirmation } from './_lib/mailer.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return;

  if (rateLimited(req, { key: 'bookings', max: 8, windowMs: 60000 })) {
    return json(res, 429, { error: 'Too many attempts. Please try again in a minute.' });
  }

  const body = readBody(req);

  /* ── validate input ────────────────────────────────────────────────────── */
  const planKey = str(body.plan, 40) || 'monthly';
  // `session` is still accepted as an alias so an older cached page keeps working.
  const modeKey = str(body.mode || body.session, 40);
  const date    = str(body.date, 10);
  const time    = str(body.time, 5);
  const name    = str(body.name, 120);
  const email   = str(body.email, 160).toLowerCase();
  const phone   = normalisePhone(body.phone);
  const college = str(body.college, 160);
  const year    = str(body.year, 40);
  const topic   = str(body.topic, 1200);

  const plan = PLANS[planKey];
  const mode = MODES[modeKey];
  if (!plan) return json(res, 400, { error: 'Please choose a plan.' });
  if (!mode) return json(res, 400, { error: 'Please choose how you want to attend.' });
  if (name.length < 2) return json(res, 400, { error: 'Please enter your full name.' });
  if (!isEmail(email)) return json(res, 400, { error: 'Please enter a valid email address.' });
  if (!phone) return json(res, 400, { error: 'Please enter a valid 10-digit mobile number.' });

  const invalid = validateEnrolment(date, modeKey, time, planKey);
  if (invalid) return json(res, 400, { error: invalid });

  const timed = needsTime(planKey, modeKey);

  /* ── connect ───────────────────────────────────────────────────────────── */
  let db;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error('[bookings]', err.message);
      return json(res, 503, {
        error: 'Booking is not live yet. Please message us on WhatsApp and we will get you in.',
      });
    }
    console.error('[bookings] db error:', err.message);
    return json(res, 503, { error: 'We could not reach the booking system. Please try again.' });
  }

  /* ── take a seat atomically ────────────────────────────────────────────── */
  const slotId = await reserveSeat(db, { date, mode, time: timed ? time : null, plan: planKey });
  if (!slotId) {
    return json(res, 409, {
      error: timed
        ? 'That time slot just filled up. Please pick another.'
        : 'That batch just filled up. Please pick the next Saturday.',
      code: 'SLOT_TAKEN',
    });
  }

  /* ── store ─────────────────────────────────────────────────────────────── */
  const amount = priceForPlan(planKey);
  const bookingId = makeBookingId();
  const now = new Date();
  const endDate = plan.weeks ? addDays(date, plan.weeks * 7 - 1) : date;
  const manual = paymentMode() === 'manual';

  const booking = {
    bookingId,
    kind: plan.kind,
    plan: planKey,
    planLabel: plan.label,
    mode: modeKey,
    modeLabel: mode.label,
    scheduling: mode.scheduling,
    needsTime: timed,
    programme: plan.label,
    weeks: plan.weeks,
    date,
    dateLabel: formatDate(date),
    endDate,
    endDateLabel: formatDate(endDate),
    time: timed ? time : PROGRAMME.startTime,
    timeLabel: timed ? toLabel(time) : '10:00 AM',
    slotId,
    name, email, phone, college, year, topic,
    amount,
    listPrice: listPriceForPlan(planKey),
    currency: 'INR',
    paymentMode: manual ? 'manual' : 'cashfree',
    status: manual ? 'awaiting_confirmation' : (amount > 0 ? 'pending' : 'confirmed'),
    payment: manual
      ? { provider: 'manual', status: 'AWAITING_WHATSAPP' }
      : (amount > 0 ? { provider: 'cashfree', status: 'PENDING' } : null),
    source: 'website',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await collections.bookings(db).insertOne({ ...booking });
  } catch (err) {
    console.error('[bookings] insert failed:', err.message);
    await releaseSeat(db, slotId);
    return json(res, 500, { error: 'We could not save your booking. Please try again.' });
  }

  /* ── manual: hand the student to WhatsApp ──────────────────────────────── */
  if (manual) {
    // Krevol gets the email immediately so a booking is never only in WhatsApp.
    sendBookingNotification(booking).catch(() => {});
    return json(res, 201, {
      bookingId,
      status: 'awaiting_confirmation',
      requiresPayment: true,
      paymentMode: 'manual',
      amount,
      whatsappUrl: bookingWhatsappUrl(booking),
      booking: publicView(booking),
    });
  }

  /* ── free ──────────────────────────────────────────────────────────────── */
  if (amount <= 0) {
    await Promise.allSettled([
      sendBookingNotification(booking),
      sendBookingConfirmation(booking),
    ]);
    return json(res, 201, {
      bookingId, status: 'confirmed', requiresPayment: false, booking: publicView(booking),
    });
  }

  /* ── cashfree ──────────────────────────────────────────────────────────── */
  if (!cashfree.isConfigured()) {
    console.error('[bookings] PAYMENT_MODE=cashfree but keys are missing.');
    await releaseSeat(db, slotId);
    await collections.bookings(db).updateOne(
      { bookingId },
      { $set: { status: 'cancelled', cancelReason: 'gateway_unconfigured', updatedAt: new Date() } }
    );
    return json(res, 503, {
      error: 'Online payment is not available right now. Please message us on WhatsApp to book.',
    });
  }

  const origin = siteOrigin(req);
  try {
    const { linkId, linkUrl } = await cashfree.createPaymentLink({
      linkId: bookingId,
      amount,
      purpose: `Krevol ${plan.label} (${mode.short}) from ${booking.dateLabel}`,
      customer: { name, email, phone },
      returnUrl: `${origin}/booking-status.html?id=${encodeURIComponent(bookingId)}`,
      notifyUrl: `${origin}/api/payment-webhook`,
      expiryMinutes: 30,
    });

    await collections.bookings(db).updateOne(
      { bookingId },
      {
        $set: {
          'payment.orderId': linkId,
          'payment.linkUrl': linkUrl,
          'payment.status': 'CREATED',
          updatedAt: new Date(),
        },
      }
    );
    sendBookingNotification(booking).catch(() => {});

    return json(res, 201, {
      bookingId,
      status: 'pending',
      requiresPayment: true,
      paymentMode: 'cashfree',
      amount,
      paymentUrl: linkUrl,
      booking: publicView(booking),
    });
  } catch (err) {
    console.error('[bookings] payment link failed:', err.message);
    await releaseSeat(db, slotId);
    await collections.bookings(db).updateOne(
      { bookingId },
      { $set: { status: 'cancelled', cancelReason: 'payment_link_failed', updatedAt: new Date() } }
    );
    return json(res, 502, {
      error: 'We could not start the payment. Your seat was released — please try again.',
    });
  }
}

function publicView(b) {
  return {
    bookingId: b.bookingId,
    kind: b.kind,
    planLabel: b.planLabel,
    modeLabel: b.modeLabel,
    date: b.date,
    dateLabel: b.dateLabel,
    endDateLabel: b.endDateLabel,
    weeks: b.weeks,
    timeLabel: b.timeLabel,
    needsTime: b.needsTime,
    scheduling: b.scheduling,
    amount: b.amount,
    status: b.status,
  };
}
