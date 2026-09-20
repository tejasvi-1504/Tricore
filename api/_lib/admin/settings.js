/**
 * GET  /api/admin/settings          -> { meetLink, fromEnv, payments }
 * POST /api/admin/settings { meetLink } -> save it (empty string clears)
 *
 * Editable from the panel so the Meet room can change without a redeploy.
 */
import { json, methodGuard, readBody, rateLimited } from '../http.js';
import { isConfigured, isAuthenticated } from '../adminAuth.js';
import { getDb, ConfigError } from '../db.js';
import { getSettings, setMeetLink, setPhotoVisible, setTheme, setSiteTheme } from '../settings.js';
import { paymentModeReason } from '../availability.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST'])) return;

  if (!isConfigured()) {
    return json(res, 503, { error: 'The admin panel is not set up. Add ADMIN_PASSWORD and redeploy.' });
  }
  if (!isAuthenticated(req)) return json(res, 401, { error: 'Not signed in.' });

  let db;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) return json(res, 503, { error: err.message });
    console.error('[admin/settings] db unavailable:', err.message);
    return json(res, 503, { error: 'The database is unavailable right now.' });
  }

  if (req.method === 'GET') {
    // How this deployment is taking money, and why. Production was on
    // manual while local was on Razorpay, and nothing on screen said so.
    return json(res, 200, { ...(await getSettings(db)), payments: paymentModeReason() });
  }

  if (rateLimited(req, { key: 'admin-settings', max: 30, windowMs: 60000 })) {
    return json(res, 429, { error: 'Slow down a moment.' });
  }

  const body = readBody(req);

  if (typeof body.siteTheme === 'string') {
    const out = await setSiteTheme(db, body.siteTheme);
    if (!out.ok) return json(res, 400, { error: out.error });
    return json(res, 200, { ok: true, ...(await getSettings(db)) });
  }

  if (typeof body.theme === 'string') {
    const out = await setTheme(db, body.theme);
    if (!out.ok) return json(res, 400, { error: out.error });
    return json(res, 200, { ok: true, ...(await getSettings(db)) });
  }

  if (typeof body.showMentorPhoto === 'boolean') {
    await setPhotoVisible(db, body.showMentorPhoto);
    return json(res, 200, { ok: true, ...(await getSettings(db)) });
  }

  const out = await setMeetLink(db, body.meetLink);
  if (!out.ok) return json(res, 400, { error: out.error });
  return json(res, 200, { ok: true, ...(await getSettings(db)) });
}
