/**
 * GET    /api/admin/curriculum            -> modules, track, principles, DSA
 * POST   /api/admin/curriculum { ... }    -> add a DSA question
 * DELETE /api/admin/curriculum { id }     -> remove one
 *
 * The taught material is static and ships with the code; only the DSA bank is
 * stored, so a database outage still leaves the teaching notes readable.
 */
import { json, methodGuard, readBody, rateLimited } from '../http.js';
import { isConfigured, isAuthenticated } from '../adminAuth.js';
import { getDb, ConfigError } from '../db.js';
import { MODULES, TRACKS, PRINCIPLES } from '../curriculum.js';
import { listDsa, addDsa, removeDsa } from '../dsa.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return;

  if (!isConfigured()) {
    return json(res, 503, { error: 'The admin panel is not set up. Add ADMIN_PASSWORD and redeploy.' });
  }
  if (!isAuthenticated(req)) return json(res, 401, { error: 'Not signed in.' });

  let db = null;
  try {
    db = await getDb();
  } catch (err) {
    if (!(err instanceof ConfigError)) console.error('[admin/curriculum] db unavailable:', err.message);
    // GET still works without a database — the notes matter more than the bank.
    if (req.method !== 'GET') return json(res, 503, { error: 'The database is unavailable right now.' });
  }

  if (req.method === 'GET') {
    let dsa = { topics: [], total: 0, unavailable: true };
    if (db) {
      try {
        dsa = await listDsa(db);
      } catch (err) {
        console.error('[admin/curriculum] dsa read failed:', err.message);
      }
    }
    return json(res, 200, { modules: MODULES, tracks: TRACKS, principles: PRINCIPLES, dsa });
  }

  if (rateLimited(req, { key: 'admin-curriculum', max: 60, windowMs: 60000 })) {
    return json(res, 429, { error: 'Slow down a moment.' });
  }

  const body = readBody(req);
  const out = req.method === 'POST' ? await addDsa(db, body) : await removeDsa(db, body.id);
  if (!out.ok) return json(res, 400, { error: out.error });

  return json(res, 200, { ok: true, dsa: await listDsa(db) });
}
