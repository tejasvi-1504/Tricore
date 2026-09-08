/**
 * GET /api/companies — the public "interviewed at" list.
 *
 * The site ships the same names in its HTML, so this only ever upgrades what is
 * already on the page. Any failure returns the defaults with a 200 rather than
 * an error: a wobbly database should never blank out a section of the site.
 */
import { json, methodGuard } from './_lib/http.js';
import { getDb } from './_lib/db.js';
import { listCompanies, DEFAULTS } from './_lib/companies.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET'])) return;

  try {
    const db = await getDb();
    const { companies } = await listCompanies(db);
    res.setHeader('cache-control', 'public, max-age=60, stale-while-revalidate=300');
    return json(res, 200, { companies });
  } catch (err) {
    console.error('[companies] falling back to defaults:', err.message);
    return json(res, 200, { companies: DEFAULTS.map((name) => ({ name })), fallback: true });
  }
}
