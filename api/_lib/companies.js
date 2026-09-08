/**
 * The "interviewed at" list.
 *
 * Stored in Mongo so it can be edited from the admin panel without a redeploy.
 * Until someone adds one, the DEFAULTS below are what the site shows — that way
 * a fresh database, or an unreachable one, still renders a sensible list rather
 * than an empty strip.
 */
import { collections } from './db.js';

export const DEFAULTS = ['Google', 'Uber', 'ServiceNow', 'CuddlyNest'];

/** Normalise a submitted name: trimmed, collapsed whitespace, length-capped. */
export function cleanName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** Ordered list of company names. Falls back to DEFAULTS when none are stored. */
export async function listCompanies(db) {
  const rows = await collections
    .companies(db)
    .find({ placeholder: { $ne: true } })
    .sort({ order: 1, createdAt: 1 })
    .toArray();

  // A collection holding only the "everything was removed" marker is still a
  // deliberate empty list, so check the raw count rather than the filtered one.
  if (!rows.length) {
    const anyRows = await collections.companies(db).countDocuments({});
    if (!anyRows) return { companies: DEFAULTS.map((name) => ({ name })), usingDefaults: true };
    return { companies: [], usingDefaults: false };
  }
  return { companies: rows.map((r) => ({ name: r.name })), usingDefaults: false };
}

/**
 * Add a company. The first write seeds the DEFAULTS first, so switching from
 * the built-in list to a managed one never silently drops Google and friends.
 */
export async function addCompany(db, rawName) {
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: 'Give the company a name.' };

  const col = collections.companies(db);
  const existing = await col.countDocuments({});

  if (!existing) {
    const now = new Date();
    await col.insertMany(
      DEFAULTS.map((n, i) => ({ name: n, order: i, createdAt: now })),
      { ordered: false }
    ).catch(() => {});
  }

  // Case-insensitive duplicate check, so "google" cannot sit beside "Google".
  const clash = await col.findOne({ name: { $regex: `^${escapeRe(name)}$`, $options: 'i' } });
  if (clash) return { ok: false, error: `${clash.name} is already on the list.` };

  const last = await col.find({}).sort({ order: -1 }).limit(1).toArray();
  const order = (last[0]?.order ?? -1) + 1;

  await col.insertOne({ name, order, createdAt: new Date() });
  return { ok: true, name };
}

/** Remove a company by exact stored name. */
export async function removeCompany(db, rawName) {
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: 'Which company?' };

  const col = collections.companies(db);
  const existing = await col.countDocuments({});

  // Removing from the built-in list means materialising it first, minus this one.
  if (!existing) {
    const keep = DEFAULTS.filter((n) => n.toLowerCase() !== name.toLowerCase());
    if (keep.length === DEFAULTS.length) return { ok: false, error: 'That company is not on the list.' };
    const now = new Date();
    if (keep.length) {
      await col.insertMany(keep.map((n, i) => ({ name: n, order: i, createdAt: now })), { ordered: false });
    } else {
      // Everything removed: park a marker so the defaults do not reappear.
      await col.insertOne({ name: '\u200b', order: 0, createdAt: now, placeholder: true });
    }
    return { ok: true, name };
  }

  const res = await col.deleteOne({ name: { $regex: `^${escapeRe(name)}$`, $options: 'i' } });
  if (!res.deletedCount) return { ok: false, error: 'That company is not on the list.' };
  return { ok: true, name };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
