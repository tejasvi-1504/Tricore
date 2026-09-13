/**
 * Sign-in for the history page.
 *
 *   GET    /api/history/session            -> { signedIn, email? }
 *   POST   /api/history/session { email }  -> email a one-time code
 *   PUT    /api/history/session { email, code } -> exchange it for a session
 *   DELETE /api/history/session            -> sign out
 *
 * POST deliberately answers the same way whether or not the address has any
 * history. Saying "no bookings for that email" would turn this into a way to
 * test whether somebody is a customer.
 */
import { json, methodGuard, readBody, str, isEmail, rateLimited } from '../_lib/http.js';
import { getDb, collections, ConfigError } from '../_lib/db.js';
import {
  isConfigured, issueCode, verifyCode,
  readSession, setSessionCookie, clearSessionCookie,
} from '../_lib/userAuth.js';
import * as mailer from '../_lib/mailer.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST', 'PUT', 'DELETE'])) return;

  if (req.method === 'GET') {
    const me = readSession(req);
    return json(res, 200, {
      signedIn: Boolean(me),
      email: me?.email,
      name: me?.name || undefined,
    });
  }

  if (req.method === 'DELETE') {
    clearSessionCookie(req, res);
    return json(res, 200, { ok: true, signedIn: false });
  }

  if (!isConfigured()) {
    return json(res, 503, { error: 'Sign-in is not available right now.' });
  }
  if (!mailer.isConfigured()) {
    return json(res, 503, {
      error: 'We cannot email codes right now. Please message us on WhatsApp instead.',
    });
  }

  const body = readBody(req);
  const email = str(body.email, 160).toLowerCase();
  if (!isEmail(email)) return json(res, 400, { error: 'Please enter a valid email address.' });

  let db;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) return json(res, 503, { error: 'Sign-in is unavailable right now.' });
    console.error('[history/session] db unavailable:', err.message);
    return json(res, 503, { error: 'Sign-in is unavailable right now.' });
  }

  /* ── request a code ── */
  if (req.method === 'POST') {
    if (rateLimited(req, { key: 'history-code', max: 5, windowMs: 60000 })) {
      return json(res, 429, { error: 'Too many requests. Wait a minute and try again.' });
    }

    try {
      const out = await issueCode(db, email);
      if (!out.ok) {
        return json(res, 429, {
          error: `We just sent a code. Check your inbox, or try again in ${out.retryAfter}s.`,
        });
      }

      const sent = await mailer.sendLoginCode(email, out.code, out.expiresInMinutes);
      if (!sent) {
        return json(res, 502, { error: 'We could not send the email. Please try again.' });
      }
      return json(res, 200, { ok: true, sent: true, expiresInMinutes: out.expiresInMinutes });
    } catch (err) {
      console.error('[history/session] code failed:', err.message);
      return json(res, 500, { error: 'Something went wrong. Please try again.' });
    }
  }

  /* ── verify a code ── */
  if (rateLimited(req, { key: 'history-verify', max: 12, windowMs: 60000 })) {
    return json(res, 429, { error: 'Too many attempts. Wait a minute and try again.' });
  }

  try {
    const out = await verifyCode(db, email, body.code);
    if (!out.ok) return json(res, 401, { error: out.error });

    // Greet them by the name they gave when booking or enquiring.
    const known = await collections.bookings(db).findOne({ email }, { projection: { name: 1 } })
      ?? await collections.contacts(db).findOne({ email }, { projection: { name: 1 } });
    const name = known?.name || '';

    setSessionCookie(req, res, email, name);
    return json(res, 200, { ok: true, signedIn: true, email, name });
  } catch (err) {
    console.error('[history/session] verify failed:', err.message);
    return json(res, 500, { error: 'Something went wrong. Please try again.' });
  }
}
