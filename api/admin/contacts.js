/**
 * Project enquiries in the admin panel.
 *
 *   GET  /api/admin/contacts?q=&skip=&limit=   -> list
 *   POST /api/admin/contacts { id, status }    -> mark new | replied | closed
 *
 * The contact form has always stored these, but nothing ever read them back —
 * they only existed as an email in an inbox. This is the other half of the
 * queue: students arrive as bookings, businesses arrive here.
 */
import { ObjectId } from 'mongodb';
import { json, methodGuard, readBody, str, rateLimited } from '../_lib/http.js';
import { isConfigured, isAuthenticated } from '../_lib/adminAuth.js';
import { getDb, collections, ConfigError } from '../_lib/db.js';

const STATUSES = ['new', 'replied', 'closed'];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST'])) return;

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
    console.error('[admin/contacts] db unavailable:', err.message);
    return json(res, 503, { error: 'The database is unavailable right now.' });
  }

  const contacts = collections.contacts(db);

  /* ── update one ── */
  if (req.method === 'POST') {
    if (rateLimited(req, { key: 'admin-contacts', max: 60, windowMs: 60000 })) {
      return json(res, 429, { error: 'Slow down a moment.' });
    }

    const { id, status } = readBody(req);
    if (!STATUSES.includes(status)) return json(res, 400, { error: 'Unknown status.' });

    let _id;
    try {
      _id = new ObjectId(String(id));
    } catch {
      return json(res, 400, { error: 'Which enquiry?' });
    }

    const result = await contacts.updateOne({ _id }, { $set: { status, updatedAt: new Date() } });
    if (!result.matchedCount) return json(res, 404, { error: 'No such enquiry.' });
    return json(res, 200, { ok: true, id: String(_id), status });
  }

  /* ── list ── */
  const q = str(req.query?.q || '', 120);
  const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 100);
  const skip = Math.max(Number(req.query?.skip) || 0, 0);

  const filter = {};
  if (q) {
    const re = new RegExp(escapeRe(q), 'i');
    filter.$or = [{ name: re }, { email: re }, { phone: re }, { service: re }, { message: re }];
  }

  try {
    const [rows, total, counts] = await Promise.all([
      contacts.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      contacts.countDocuments(filter),
      contacts.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray(),
    ]);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    let all = 0;
    for (const c of counts) {
      if (c._id in byStatus) byStatus[c._id] = c.n;
      all += c.n;
    }

    return json(res, 200, {
      enquiries: rows.map((c) => ({
        id: String(c._id),
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        service: c.service || '',
        budget: c.budget || '',
        message: c.message || '',
        status: c.status || 'new',
        createdAt: c.createdAt,
      })),
      total, skip, limit,
      counts: { ...byStatus, all },
    });
  } catch (err) {
    console.error('[admin/contacts] query failed:', err.message);
    return json(res, 500, { error: 'Could not load enquiries.' });
  }
}
