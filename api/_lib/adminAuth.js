/**
 * Admin authentication.
 *
 * A single shared password (ADMIN_PASSWORD) exchanged for a short-lived signed
 * cookie. There is one admin, so there is no user table — but the password
 * itself is never stored in the cookie or in the browser. The cookie holds an
 * expiry plus an HMAC of that expiry, keyed on the password, so:
 *
 *   - a stolen cookie expires on its own,
 *   - changing ADMIN_PASSWORD invalidates every existing session,
 *   - the cookie cannot be forged without knowing the password.
 *
 * Comparisons are timing-safe. This is deliberately simple; if more than one
 * person ever needs access, replace it with real accounts rather than sharing
 * the password around.
 */
import crypto from 'node:crypto';

export const COOKIE_NAME = 'kv_admin';
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/** The configured password, or null when the admin panel is switched off. */
function secret() {
  const p = process.env.ADMIN_PASSWORD;
  return typeof p === 'string' && p.length >= 8 ? p : null;
}

/** False when ADMIN_PASSWORD is unset or too short — every route 503s then. */
export function isConfigured() {
  return secret() !== null;
}

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest();

/** Constant-time compare of two equal-length digests. */
function sameDigest(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function passwordMatches(given) {
  const p = secret();
  if (!p || typeof given !== 'string') return false;
  // Hashing first keeps the compare constant-length, so nothing leaks the
  // real password's length.
  return sameDigest(sha256(given), sha256(p));
}

function sign(exp) {
  return crypto
    .createHmac('sha256', sha256('kv-admin-session|' + secret()))
    .update(String(exp))
    .digest('hex');
}

export function issueToken() {
  const exp = Date.now() + TTL_MS;
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token) {
  if (!secret() || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;

  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  return sameDigest(
    Buffer.from(token.slice(dot + 1), 'utf8'),
    Buffer.from(sign(exp), 'utf8')
  );
}

export function readCookie(req, name) {
  const raw = req.headers?.cookie || '';
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return part.slice(eq + 1).trim();
    }
  }
  return null;
}

/** Secure only over https, so the cookie still works on http://localhost. */
function cookieAttrs(req, maxAgeSeconds) {
  const proto = req.headers['x-forwarded-proto'] || '';
  const https = proto.includes('https');
  return [
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    https ? 'Secure' : '',
    `Max-Age=${maxAgeSeconds}`,
  ].filter(Boolean).join('; ');
}

export function setSessionCookie(req, res) {
  const token = issueToken();
  res.setHeader('set-cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttrs(req, TTL_MS / 1000)}`);
}

export function clearSessionCookie(req, res) {
  res.setHeader('set-cookie', `${COOKIE_NAME}=; ${cookieAttrs(req, 0)}`);
}

export function isAuthenticated(req) {
  return verifyToken(readCookie(req, COOKIE_NAME));
}
