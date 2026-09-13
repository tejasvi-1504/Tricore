/**
 * Shared dispatcher for the [...path] catch-all functions.
 *
 * The Hobby plan caps a deployment at 12 Serverless Functions, so the admin
 * and history routes each live behind one catch-all file instead of one file
 * per route.
 *
 * The route name comes from req.url rather than req.query. Vercel's catch-all
 * param does not arrive in the shape the local dev server produces, and the
 * mismatch 404s every route in production while working perfectly in
 * development. The URL is the one thing both agree on.
 */
import { json } from './http.js';

export function makeDispatcher(base, routes, label) {
  const prefix = `/api/${base}/`;

  return async function handler(req, res) {
    let name = '';

    // Primary: read it straight off the request path.
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      if (pathname.startsWith(prefix)) {
        name = decodeURIComponent(pathname.slice(prefix.length).split('/')[0] || '');
      }
    } catch {
      /* fall through to the query param */
    }

    // Fallback: whatever the platform put in the catch-all param, array or not.
    if (!name) {
      const raw = req.query?.path ?? req.query?.[base];
      const first = Array.isArray(raw) ? raw[0] : raw;
      if (typeof first === 'string') name = first.split('/')[0];
    }

    // Own-property check only, so "constructor" and friends cannot reach through.
    const route = Object.prototype.hasOwnProperty.call(routes, name) ? routes[name] : null;
    if (!route) {
      return json(res, 404, { error: `No such ${label} route.`, route: name || null });
    }

    return route(req, res);
  };
}
