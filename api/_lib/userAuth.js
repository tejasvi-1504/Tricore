/**
 * Visitor identity for the history page.
 *
 * Students and businesses have no accounts, but their history holds phone
 * numbers, colleges and message text — so an email address alone cannot be
 * enough to read it, or anyone could type someone else's address.
 *
 * Instead: we email a six-digit code, and only a correct code mints a session.
 * The session is an HMAC-signed cookie carrying the email and an expiry, so
 * there is no server-side session table to keep.
 *
 * Codes are stored hashed with a short expiry and an attempt counter, so a
 * stolen database dump does not hand over live codes and guessing is bounded.
 */
import crypto from 'node:crypto';
import { collections } from './db.js';

export const COOKIE_NAME = 'kc_me';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CODE_TTL_MS = 10 * 60 * 1000;              // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_GAP_MS = 60 * 1000;

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest();

/**
 * Signing key. Derived from MONGODB_URI so the feature needs no new
 * configuration — it is a server-side secret that is always present when the
 * app can run at all. Set SESSION_SECRET to rotate every session on demand.
 */
function signingKey() {
  const seed = process.env.SESSION_SECRET || process.env.MONGODB_URI;
  if (!seed) return null;
  return sha256('kc-history-session|' + seed);
}

export function isConfigured() {
  return signingKey() !== null;
}

function sameBuf(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ── session cookie ───────────────────────────────────────────────────────── */

function sign(payload) {
  return crypto.createHmac('sha256', signingKey()).update(payload).digest('hex');
}

/**
 * The display name rides inside the signed payload rather than being looked up
 * per request — the navbar needs it on every page load, and a database round
 * trip for a greeting is not worth it. Signed, so it cannot be edited.
 */
export function issueSession(email, name = '') {
  const exp = Date.now() + SESSION_TTL_MS;
  const body = JSON.stringify({ e: email, n: String(name || '').slice(0, 80) });
  const payload = `${Buffer.from(body).toString('base64url')}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns { email, name } for a valid session, or null. */
export function readSession(req) {
  if (!signingKey()) return null;
  const token = readCookie(req, COOKIE_NAME);
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [b64, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  const payload = `${b64}.${expStr}`;
  if (!sameBuf(Buffer.from(sig, 'utf8'), Buffer.from(sign(payload), 'utf8'))) return null;

  try {
    const raw = Buffer.from(b64, 'base64url').toString('utf8');
    const { e, n } = JSON.parse(raw);
    if (typeof e !== 'string' || !e.includes('@')) return null;
    return { email: e, name: typeof n === 'string' ? n : '' };
  } catch {
    return null;
  }
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

function cookieAttrs(req, maxAgeSeconds) {
  const https = String(req.headers['x-forwarded-proto'] || '').includes('https');
  return [
    'Path=/', 'HttpOnly', 'SameSite=Lax',
    https ? 'Secure' : '',
    `Max-Age=${maxAgeSeconds}`,
  ].filter(Boolean).join('; ');
}

export function setSessionCookie(req, res, email, name = '') {
  res.setHeader('set-cookie',
    `${COOKIE_NAME}=${encodeURIComponent(issueSession(email, name))}; ${cookieAttrs(req, SESSION_TTL_MS / 1000)}`);
}

export function clearSessionCookie(req, res) {
  res.setHeader('set-cookie', `${COOKIE_NAME}=; ${cookieAttrs(req, 0)}`);
}

/* ── one-time codes ───────────────────────────────────────────────────────── */

/** Six digits, uniformly drawn — Math.random is not good enough for this. */
function makeCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Create and store a code for this email.
 *
 * Returns { ok:false, retryAfter } when one was sent moments ago, so the page
 * cannot be used to flood somebody's inbox.
 */
export async function issueCode(db, email) {
  const col = collections.otps(db);
  const now = new Date();

  const existing = await col.findOne({ email });
  if (existing?.sentAt && now - existing.sentAt < RESEND_GAP_MS) {
    return { ok: false, retryAfter: Math.ceil((RESEND_GAP_MS - (now - existing.sentAt)) / 1000) };
  }

  const code = makeCode();
  await col.replaceOne(
    { email },
    {
      email,
      codeHash: sha256(email + '|' + code).toString('hex'),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      attempts: 0,
      sentAt: now,
      createdAt: now,
    },
    { upsert: true }
  );
  return { ok: true, code, expiresInMinutes: Math.round(CODE_TTL_MS / 60000) };
}

/**
 * Check a submitted code. Consumes the record on success, and counts failures
 * so a six-digit space cannot be walked through.
 */
export async function verifyCode(db, email, submitted) {
  const col = collections.otps(db);
  const rec = await col.findOne({ email });

  if (!rec) return { ok: false, error: 'Ask for a new code — that one has expired.' };
  if (rec.expiresAt && rec.expiresAt < new Date()) {
    await col.deleteOne({ email });
    return { ok: false, error: 'That code has expired. Ask for a new one.' };
  }
  if ((rec.attempts || 0) >= MAX_ATTEMPTS) {
    await col.deleteOne({ email });
    return { ok: false, error: 'Too many wrong tries. Ask for a new code.' };
  }

  const given = String(submitted ?? '').replace(/\D/g, '');
  const match = given.length === 6 && sameBuf(
    Buffer.from(sha256(email + '|' + given).toString('hex'), 'utf8'),
    Buffer.from(rec.codeHash, 'utf8')
  );

  if (!match) {
    await col.updateOne({ email }, { $inc: { attempts: 1 } });
    const left = MAX_ATTEMPTS - (rec.attempts || 0) - 1;
    return {
      ok: false,
      error: left > 0 ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.`
                      : 'That code is not right. Ask for a new one.',
    };
  }

  await col.deleteOne({ email });
  return { ok: true };
}
