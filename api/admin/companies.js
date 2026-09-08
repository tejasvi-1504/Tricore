/**
 * Manage the "interviewed at" list from the admin panel.
 *
 *   GET    /api/admin/companies              -> { companies, usingDefaults }
 *   POST   /api/admin/companies { name }     -> add one
 *   DELETE /api/admin/companies { name }     -> remove one
 *
 * `usingDefaults` tells the panel that nothing has been stored yet, so it can
 * say the list is the built-in one rather than implying someone typed it.
 */
import { json, methodGuard, readBody, rateLimited } from '../_lib/http.js';
import { isConfigured, isAuthenticated } from '../_lib/adminAuth.js';
import { getDb, ConfigError } from '../_lib/db.js';
import { listCompanies, addCompany, removeCompany } from '../_lib/companies.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return;

  if (!isConfigured()) {
    return json(res, 503, { error: 'The admin panel is not set up. Add ADMIN_PASSWORD and redeploy.' });
  }
  if (!isAuthenticated(req)) {
    return json(res, 401, { error: 'Not signed in.' });
  }
  if (req.method !== 'GET' && rateLimited(req, { key: 'admin-companies', max: 40, windowMs: 60000 })) {
    return json(res, 429, { error: 'Slow down a moment.' });
  }

  let db;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) return json(res, 503, { error: err.message });
    console.error('[admin/companies] db unavailable:', err.message);
    return json(res, 503, { error: 'The database is unavailable right now.' });
  }

  try {
    if (req.method === 'GET') {
      return json(res, 200, await listCompanies(db));
    }

    const { name } = readBody(req);
    const out = req.method === 'POST'
      ? await addCompany(db, name)
      : await removeCompany(db, name);

    if (!out.ok) return json(res, 400, { error: out.error });

    return json(res, 200, { ok: true, ...(await listCompanies(db)) });
  } catch (err) {
    console.error('[admin/companies] failed:', err.message);
    return json(res, 500, { error: 'That did not go through. Try again.' });
  }
}
