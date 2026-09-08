/**
 * GET /api/admin/bookings — the queue behind the admin panel.
 *
 * Query:
 *   status  awaiting_confirmation | pending | confirmed | cancelled | all
 *   q       free text over name, email, phone and reference
 *   limit   page size, max 100 (default 50)
 *   skip    offset for paging
 *
 * Returns the full booking rows (this is the admin view — unlike the student's
 * `publicView`, contact details are the entire point) plus per-status counts so
 * the panel can show its tabs without a second request.
 */
import { json, methodGuard, str } from '../_lib/http.js';
import { isConfigured, isAuthenticated } from '../_lib/adminAuth.js';
import { getDb, collections, ConfigError } from '../_lib/db.js';
import { bookingWhatsappUrl } from '../_lib/handoff.js';

const STATUSES = ['awaiting_confirmation', 'pending', 'confirmed', 'cancelled'];

/** Escape a user string so it cannot inject regex syntax into the query. */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET'])) return;

  if (!isConfigured()) {
    return json(res, 503, { error: 'The admin panel is not set up. Add ADMIN_PASSWORD and redeploy.' });
  }
  if (!isAuthenticated(req)) {
    return json(res, 401, { error: 'Not signed in.' });
  }

  let db;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) return json(res, 503, { error: err.message });
    console.error('[admin/bookings] db unavailable:', err.message);
    return json(res, 503, { error: 'The database is unavailable right now.' });
  }

  const q = str(req.query?.q || '', 120);
  const status = str(req.query?.status || 'awaiting_confirmation', 40);
  const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 100);
  const skip = Math.max(Number(req.query?.skip) || 0, 0);

  const filter = {};
  if (STATUSES.includes(status)) filter.status = status;

  if (q) {
    const re = new RegExp(escapeRe(q), 'i');
    filter.$or = [
      { name: re }, { email: re }, { phone: re },
      { bookingId: re }, { college: re },
    ];
  }

  const bookings = collections.bookings(db);

  try {
    const [rows, total, counts] = await Promise.all([
      bookings.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      bookings.countDocuments(filter),
      bookings.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray(),
    ]);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    let all = 0;
    for (const c of counts) {
      if (c._id in byStatus) byStatus[c._id] = c.n;
      all += c.n;
    }

    return json(res, 200, {
      bookings: rows.map(adminView),
      total,
      skip,
      limit,
      counts: { ...byStatus, all },
    });
  } catch (err) {
    console.error('[admin/bookings] query failed:', err.message);
    return json(res, 500, { error: 'Could not load bookings.' });
  }
}

function adminView(b) {
  return {
    bookingId: b.bookingId,
    kind: b.kind,
    plan: b.plan,
    planLabel: b.planLabel,
    mode: b.mode,
    modeLabel: b.modeLabel,
    date: b.date,
    dateLabel: b.dateLabel,
    endDateLabel: b.endDateLabel,
    time: b.time,
    timeLabel: b.timeLabel,
    needsTime: b.needsTime,
    weeks: b.weeks,
    name: b.name,
    email: b.email,
    phone: b.phone,
    college: b.college || '',
    year: b.year || '',
    topic: b.topic || '',
    amount: b.amount,
    listPrice: b.listPrice,
    status: b.status,
    paymentMode: b.paymentMode,
    payment: b.payment || null,
    cancelReason: b.cancelReason || '',
    createdAt: b.createdAt,
    confirmedAt: b.confirmedAt || null,
    whatsappUrl: safeWhatsapp(b),
  };
}

/** The link is a convenience — never let a bad row break the whole list. */
function safeWhatsapp(b) {
  try {
    return bookingWhatsappUrl(b);
  } catch {
    return '';
  }
}
