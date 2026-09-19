/**
 * GET /api/history/me — everything on file for the signed-in email.
 *
 * Covers both sides of the business: sessions booked by students, and project
 * enquiries sent by businesses. The email in the signed cookie is the only
 * thing that selects rows, so a visitor can never read another address.
 */
import { json, methodGuard } from '../http.js';
import { getDb, collections, ConfigError } from '../db.js';
import { readSession } from '../userAuth.js';
import { getOrCreateReferral, getCredit, getOffers } from '../pricing.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET'])) return;

  const me = readSession(req);
  if (!me) return json(res, 401, { error: 'Not signed in.' });
  const { email } = me;

  let db;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) return json(res, 503, { error: 'Unavailable right now.' });
    console.error('[history/me] db unavailable:', err.message);
    return json(res, 503, { error: 'Unavailable right now.' });
  }

  try {
    const [bookings, enquiries] = await Promise.all([
      collections.bookings(db).find({ email }).sort({ createdAt: -1 }).limit(100).toArray(),
      collections.contacts(db).find({ email }).sort({ createdAt: -1 }).limit(100).toArray(),
    ]);

    // Their own code exists only once they have booked; do not mint one just
    // for visiting the page.
    const hasBooked = bookings.length > 0;
    const [ref, credit, offers] = await Promise.all([
      hasBooked ? getOrCreateReferral(db, email, bookings[0]?.name).catch(() => null) : null,
      getCredit(db, email).catch(() => 0),
      getOffers(db).catch(() => null),
    ]);

    return json(res, 200, {
      email,
      name: me.name || bookings[0]?.name || enquiries[0]?.name || '',
      referral: ref && offers?.referral?.active ? {
        code: ref.code,
        uses: ref.uses || 0,
        credit,
        discount: offers.referral.discount,
        reward: offers.referral.reward,
      } : null,
      bookings: bookings.map(bookingView),
      enquiries: enquiries.map(enquiryView),
    });
  } catch (err) {
    console.error('[history/me] query failed:', err.message);
    return json(res, 500, { error: 'Could not load your history.' });
  }
}

/** The visitor's own booking — their details, minus anything internal. */
function bookingView(b) {
  return {
    bookingId: b.bookingId,
    kind: b.kind,
    planLabel: b.planLabel || b.programme,
    modeLabel: b.modeLabel,
    date: b.date,
    dateLabel: b.dateLabel,
    endDateLabel: b.endDateLabel,
    timeLabel: b.timeLabel,
    needsTime: b.needsTime,
    amount: b.amount,
    amountPaid: b.payment?.amountPaid ?? null,
    status: b.status,
    paymentMode: b.paymentMode,
    topic: b.topic || '',
    createdAt: b.createdAt,
    confirmedAt: b.confirmedAt || null,
  };
}

function enquiryView(c) {
  return {
    service: c.service || '',
    budget: c.budget || '',
    message: c.message || '',
    status: c.status || 'new',
    createdAt: c.createdAt,
  };
}
