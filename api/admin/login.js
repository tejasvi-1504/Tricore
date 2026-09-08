/**
 * Admin session.
 *
 *   GET    /api/admin/login  -> { configured, authenticated }
 *   POST   /api/admin/login  -> exchange { password } for a session cookie
 *   DELETE /api/admin/login  -> log out
 *
 * Failed attempts are rate limited per IP, so the shared password cannot be
 * brute-forced from a single host at any useful speed.
 */
import { json, methodGuard, readBody, rateLimited } from '../_lib/http.js';
import {
  isConfigured, passwordMatches, isAuthenticated,
  setSessionCookie, clearSessionCookie,
} from '../_lib/adminAuth.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return;

  if (req.method === 'GET') {
    return json(res, 200, {
      configured: isConfigured(),
      authenticated: isAuthenticated(req),
    });
  }

  if (req.method === 'DELETE') {
    clearSessionCookie(req, res);
    return json(res, 200, { ok: true, authenticated: false });
  }

  if (!isConfigured()) {
    return json(res, 503, {
      error: 'The admin panel is not set up. Add ADMIN_PASSWORD (at least 8 characters) in your Vercel project settings, then redeploy.',
    });
  }

  // Deliberately tight: 8 tries a minute per IP.
  if (rateLimited(req, { key: 'admin-login', max: 8, windowMs: 60000 })) {
    return json(res, 429, { error: 'Too many attempts. Wait a minute and try again.' });
  }

  const { password } = readBody(req);
  if (!passwordMatches(password)) {
    return json(res, 401, { error: 'Wrong password.' });
  }

  setSessionCookie(req, res);
  return json(res, 200, { ok: true, authenticated: true });
}
