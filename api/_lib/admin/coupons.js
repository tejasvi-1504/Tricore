/**
 * Discount codes and offer settings.
 *
 *   GET    /api/admin/coupons              -> coupons, offers, referral leaders
 *   POST   /api/admin/coupons { ...coupon } -> create one
 *   PUT    /api/admin/coupons { code, active } -> switch one on or off
 *   PATCH  /api/admin/coupons { earlyBird, referral, prices } -> offers and prices
 *   DELETE /api/admin/coupons { code }     -> remove one
 */
import { json, methodGuard, readBody, str, rateLimited } from '../http.js';
import { isConfigured, isAuthenticated } from '../adminAuth.js';
import { getDb, collections, ConfigError } from '../db.js';
import { getOffers, setOffers, getPrices, setPrices, effectivePrices, normaliseCode } from '../pricing.js';

const TYPES = ['flat', 'percent'];
const PLANS = ['trial', 'monthly'];

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])) return;

  if (!isConfigured()) {
    return json(res, 503, { error: 'The admin panel is not set up. Add ADMIN_PASSWORD and redeploy.' });
  }
  if (!isAuthenticated(req)) return json(res, 401, { error: 'Not signed in.' });

  let db;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) return json(res, 503, { error: err.message });
    console.error('[admin/coupons] db unavailable:', err.message);
    return json(res, 503, { error: 'The database is unavailable right now.' });
  }

  const load = async () => ({
    coupons: (await collections.coupons(db).find({}).sort({ createdAt: -1 }).limit(100).toArray())
      .map((c) => ({
        code: c.code, type: c.type, value: c.value, label: c.label || '',
        plans: c.plans || [], active: c.active !== false,
        usageLimit: c.usageLimit || 0, usedCount: c.usedCount || 0,
        minAmount: c.minAmount || 0, maxDiscount: c.maxDiscount || 0,
        expiresAt: c.expiresAt || null, createdAt: c.createdAt,
      })),
    offers: await getOffers(db),
    // What is stored, and what those settings actually come out as.
    prices: await getPrices(db),
    rates: await effectivePrices(db).then((r) => ({
      firstCall: r.firstCall, monthly: r.monthly, session: r.session, weekends: r.weekends,
    })),
    referrers: (await collections.referrals(db).find({ uses: { $gt: 0 } })
      .sort({ uses: -1 }).limit(20).toArray())
      .map((r) => ({ code: r.code, email: r.email, name: r.name || '', uses: r.uses, earned: r.earned || 0 })),
  });

  if (req.method === 'GET') return json(res, 200, await load());

  if (rateLimited(req, { key: 'admin-coupons', max: 60, windowMs: 60000 })) {
    return json(res, 429, { error: 'Slow down a moment.' });
  }

  const body = readBody(req);

  try {
    if (req.method === 'PATCH') {
      // Prices and offers arrive on the same request; either may be absent.
      if (body.prices) {
        const p = await setPrices(db, body.prices);
        if (!p.ok) return json(res, 400, { error: p.error });
      }
      if (body.earlyBird || body.referral) {
        const out = await setOffers(db, body);
        if (!out.ok) return json(res, 400, { error: out.error });
      }
      return json(res, 200, { ok: true, ...(await load()) });
    }

    if (req.method === 'DELETE') {
      const code = normaliseCode(body.code);
      const r = await collections.coupons(db).deleteOne({ code });
      if (!r.deletedCount) return json(res, 404, { error: 'No such code.' });
      return json(res, 200, { ok: true, ...(await load()) });
    }

    if (req.method === 'PUT') {
      const code = normaliseCode(body.code);
      const r = await collections.coupons(db).updateOne(
        { code }, { $set: { active: body.active === true, updatedAt: new Date() } }
      );
      if (!r.matchedCount) return json(res, 404, { error: 'No such code.' });
      return json(res, 200, { ok: true, ...(await load()) });
    }

    /* ── create ── */
    const code = normaliseCode(body.code);
    if (code.length < 3) return json(res, 400, { error: 'Codes need at least 3 letters or digits.' });

    const type = TYPES.includes(body.type) ? body.type : 'flat';
    const value = Number(body.value);
    if (!Number.isFinite(value) || value <= 0) {
      return json(res, 400, { error: 'The discount must be a number above zero.' });
    }
    if (type === 'percent' && value > 100) {
      return json(res, 400, { error: 'A percentage cannot be over 100.' });
    }

    const plans = Array.isArray(body.plans) ? body.plans.filter((p) => PLANS.includes(p)) : [];
    const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : 0);

    let expiresAt = null;
    if (body.expiresAt) {
      const d = new Date(body.expiresAt);
      if (isNaN(d)) return json(res, 400, { error: 'That expiry date is not valid.' });
      expiresAt = d;
    }

    try {
      await collections.coupons(db).insertOne({
        code, type, value: Math.round(value), plans,
        label: str(body.label, 60),
        active: body.active !== false,
        usageLimit: num(body.usageLimit),
        minAmount: num(body.minAmount),
        maxDiscount: num(body.maxDiscount),
        usedCount: 0, expiresAt, createdAt: new Date(),
      });
    } catch (err) {
      if (err?.code === 11000) return json(res, 409, { error: `${code} already exists.` });
      throw err;
    }
    return json(res, 200, { ok: true, ...(await load()) });
  } catch (err) {
    console.error('[admin/coupons] failed:', err.message);
    return json(res, 500, { error: 'That did not go through. Try again.' });
  }
}
