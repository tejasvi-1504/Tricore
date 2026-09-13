/**
 * Small editable settings, stored as one document so the admin panel can
 * change them without a redeploy.
 *
 * Currently just the Google Meet room. It falls back to the MEET_LINK
 * environment variable, so the link can be set either way.
 */
import { collections } from './db.js';

const DOC_ID = 'site';

/** Only accept a real Google Meet / Zoom style https link. */
export function cleanMeetLink(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  return url.toString();
}

export async function getSettings(db) {
  let doc = null;
  try {
    doc = await collections.settings(db).findOne({ _id: DOC_ID });
  } catch (err) {
    console.error('[settings] read failed:', err.message);
  }
  return {
    meetLink: doc?.meetLink || process.env.MEET_LINK || '',
    fromEnv: !doc?.meetLink && Boolean(process.env.MEET_LINK),
  };
}

export async function setMeetLink(db, value) {
  const link = cleanMeetLink(value);
  if (link === null) return { ok: false, error: 'That does not look like a valid https link.' };

  await collections.settings(db).updateOne(
    { _id: DOC_ID },
    { $set: { meetLink: link, updatedAt: new Date() } },
    { upsert: true }
  );
  return { ok: true, meetLink: link };
}

/**
 * The join link for one booking: an in-person session never gets one, and a
 * booking may carry its own link that overrides the shared room.
 */
export function meetLinkFor(booking, settings) {
  if (!booking || booking.mode !== 'online') return '';
  return booking.meetLink || settings?.meetLink || '';
}
