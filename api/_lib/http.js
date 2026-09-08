/** Small helpers shared by every API route. */

export function json(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

export function methodGuard(req, res, allowed) {
  if (allowed.includes(req.method)) return false;
  res.setHeader('allow', allowed.join(', '));
  json(res, 405, { error: 'Method not allowed.' });
  return true;
}

/** Vercel parses JSON bodies, but be tolerant of a raw string body too. */
export function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return b;
}

export function str(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v) => EMAIL_RE.test(v);

/** Accepts Indian mobile numbers with or without +91 / spaces / dashes. */
export function normalisePhone(v) {
  const digits = String(v ?? '').replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return '+91' + digits.slice(1);
  return null;
}

/** Short, human-quotable id: KVX-8FQ2M4. */
export function makeBookingId() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return 'KVX-' + out;
}

/**
 * Crude per-IP throttle. Serverless instances are short-lived so this only
 * blunts bursts from a single warm instance — it is a speed bump, not a
 * security control. Real abuse should be handled at the edge (Vercel WAF).
 */
const hits = (globalThis.__krevolRate ??= new Map());
export function rateLimited(req, { key = 'default', max = 12, windowMs = 60000 } = {}) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const id = key + ':' + ip;
  const now = Date.now();
  const rec = hits.get(id);

  if (!rec || now > rec.reset) {
    hits.set(id, { count: 1, reset: now + windowMs });
    return false;
  }
  rec.count += 1;
  if (hits.size > 5000) hits.clear(); // bound memory
  return rec.count > max;
}

export function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

/** 'YYYY-MM-DD' -> 'Mon, 8 September 2026' */
export function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
