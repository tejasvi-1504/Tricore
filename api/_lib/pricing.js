/**
 * What a booking actually costs.
 *
 * Three things can reduce a price, and they stack in a fixed order:
 *
 *   1. early bird   a lower headline price for the monthly programme
 *   2. coupon       a flat or percentage discount, admin-created
 *   3. referral     a flat amount off for using a friend's code
 *
 * Everything is computed here and nowhere else. The booking route recomputes
 * from scratch at submit time and ignores whatever the browser claims the
 * price was — otherwise anyone could edit the form and pay ₹1.
 */
import { collections } from './db.js';
import { priceForPlan, listPriceForPlan, PLANS as PLAN_DEFS } from './availability.js';

const DOC_ID = 'site';

export const DEFAULT_OFFERS = {
  // Off by default. It was overriding PRICE_MONTHLY=2000 down to 1499, so the
  // site advertised a price the configuration did not hold — and 1499 over
  // four weekends came to 375 a session against a 200 trial. Switch it on
  // from the admin panel for a real promotion.
  earlyBird: { active: false, monthly: null, trial: null },
  referral:  { active: true, discount: 200, reward: 200 },
};

/** Offer configuration, with the built-in defaults when nothing is stored. */
export async function getOffers(db) {
  let doc = null;
  try {
    doc = await collections.settings(db).findOne({ _id: DOC_ID });
  } catch (err) {
    console.error('[pricing] offers read failed:', err.message);
  }
  const o = doc?.offers || {};
  return {
    earlyBird: { ...DEFAULT_OFFERS.earlyBird, ...(o.earlyBird || {}) },
    referral: { ...DEFAULT_OFFERS.referral, ...(o.referral || {}) },
  };
}

export async function setOffers(db, patch) {
  const current = await getOffers(db);
  const next = {
    earlyBird: { ...current.earlyBird, ...(patch.earlyBird || {}) },
    referral: { ...current.referral, ...(patch.referral || {}) },
  };

  const price = Number(next.earlyBird.monthly);
  if (next.earlyBird.active && (!Number.isFinite(price) || price < 0)) {
    return { ok: false, error: 'The early-bird price must be a number.' };
  }
  next.earlyBird.monthly = Number.isFinite(price) ? Math.round(price) : null;

  for (const k of ['discount', 'reward']) {
    const v = Number(next.referral[k]);
    if (!Number.isFinite(v) || v < 0) return { ok: false, error: `Referral ${k} must be a number.` };
    next.referral[k] = Math.round(v);
  }

  await collections.settings(db).updateOne(
    { _id: DOC_ID }, { $set: { offers: next, updatedAt: new Date() } }, { upsert: true }
  );
  return { ok: true, offers: next };
}

/* ── prices ───────────────────────────────────────────────────────────────── */

/**
 * The three numbers the business actually sets.
 *
 * null means "not set here" and the env value stands, so a deployment that
 * has never opened the panel behaves exactly as it did before. The session
 * rate is the one that defaults to a calculation rather than a constant:
 * left alone it is the monthly price divided by its weekends, which is what
 * stops a single call drifting cheaper than the programme it introduces.
 */
export const DEFAULT_PRICES = { firstCall: null, monthly: null, session: null };

export async function getPrices(db) {
  let doc = null;
  try {
    doc = await collections.settings(db).findOne({ _id: DOC_ID });
  } catch (err) {
    console.error('[pricing] prices read failed:', err.message);
  }
  const p = doc?.prices || {};
  const clean = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : null);
  return {
    firstCall: p.firstCall == null ? null : clean(p.firstCall),
    monthly: p.monthly == null ? null : clean(p.monthly),
    session: p.session == null ? null : clean(p.session),
  };
}

/**
 * What each plan costs once the stored prices, the env and the derived
 * session rate have all had their say. One place, so the booking route, the
 * availability route and the admin panel cannot disagree.
 */
export async function effectivePrices(db) {
  const stored = await getPrices(db);
  const weekends = PLAN_DEFS.monthly.weeks || 4;

  const monthly = stored.monthly ?? priceForPlan('monthly');
  const firstCall = stored.firstCall ?? priceForPlan('trial');
  const session = stored.session ?? Math.round(monthly / weekends);

  return { monthly, firstCall, session, weekends, stored };
}

export async function setPrices(db, patch = {}) {
  const current = await getPrices(db);
  const next = { ...current };

  for (const key of ['firstCall', 'monthly', 'session']) {
    if (!(key in patch)) continue;
    const raw = patch[key];
    // An empty field means "stop overriding", not "free".
    if (raw === null || raw === '' || raw === undefined) { next[key] = null; continue; }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: `${key} must be a number, or blank to use the default.` };
    }
    if (n > 500000) return { ok: false, error: `${key} looks wrong — that is over \u20b95,00,000.` };
    next[key] = Math.round(n);
  }

  await collections.settings(db).updateOne(
    { _id: DOC_ID }, { $set: { prices: next, updatedAt: new Date() } }, { upsert: true }
  );
  return { ok: true, prices: next };
}

/* ── coupons ──────────────────────────────────────────────────────────────── */

export const normaliseCode = (v) =>
  String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);

/**
 * Look a coupon up and say whether it may be used for this plan right now.
 * Returns a reason rather than just null, so the form can explain itself.
 */
export async function checkCoupon(db, rawCode, planKey, amount) {
  const code = normaliseCode(rawCode);
  if (!code) return { ok: false, reason: 'Enter a code.' };

  const c = await collections.coupons(db).findOne({ code });
  if (!c) return { ok: false, reason: 'That code is not valid.' };
  if (!c.active) return { ok: false, reason: 'That code is no longer active.' };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
    return { ok: false, reason: 'That code has expired.' };
  }
  if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) {
    return { ok: false, reason: 'That code has been fully used.' };
  }
  if (Array.isArray(c.plans) && c.plans.length && !c.plans.includes(planKey)) {
    return { ok: false, reason: 'That code does not apply to this plan.' };
  }
  if (c.minAmount && amount < c.minAmount) {
    return { ok: false, reason: `That code needs a minimum of ₹${c.minAmount}.` };
  }

  // Half a rupee rounds up on the discount, so the customer pays the lower
  // side. Deliberate: nobody should lose a rupee to our arithmetic.
  const off = c.type === 'percent'
    ? Math.round((amount * c.value) / 100)
    : Math.round(c.value);

  return {
    ok: true,
    coupon: { code: c.code, type: c.type, value: c.value, label: c.label || '' },
    // Never let a discount exceed the price, or a cap the admin set.
    discount: Math.max(0, Math.min(off, c.maxDiscount || off, amount)),
  };
}

/* ── referral codes ───────────────────────────────────────────────────────── */

/** Readable, unambiguous — no O/0 or I/1 confusion when someone reads it aloud. */
function makeReferralCode(name) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const stem = String(name || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'FRND';
  let tail = '';
  for (let i = 0; i < 4; i++) tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${stem}${tail}`;
}

/** The code belonging to this email, created on first use. */
export async function getOrCreateReferral(db, email, name = '') {
  const col = collections.referrals(db);

  const existing = await col.findOne({ email });
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeReferralCode(name);
    try {
      const doc = { code, email, name, uses: 0, earned: 0, createdAt: new Date() };
      await col.insertOne(doc);
      return doc;
    } catch (err) {
      if (err?.code !== 11000) throw err;   // anything but a collision is real
    }
  }
  return null;
}

/** Validate someone else's referral code. Self-referral is rejected. */
export async function checkReferral(db, rawCode, email, offers) {
  const code = normaliseCode(rawCode);
  if (!code) return { ok: false, reason: 'Enter a code.' };
  if (!offers.referral.active) return { ok: false, reason: 'Referrals are not running right now.' };

  const r = await collections.referrals(db).findOne({ code });
  if (!r) return { ok: false, reason: 'That referral code is not valid.' };
  if (email && r.email === String(email).toLowerCase()) {
    return { ok: false, reason: 'You cannot use your own referral code.' };
  }
  return { ok: true, referral: { code: r.code, owner: r.email }, discount: offers.referral.discount };
}

/* ── credits ──────────────────────────────────────────────────────────────
   What someone has earned by referring people, minus what they have already
   spent. Their own money, so it is applied automatically rather than hidden
   behind a checkbox they have to find.                                      */

export async function getCredit(db, email) {
  if (!email) return 0;
  const r = await collections.referrals(db).findOne({ email: String(email).toLowerCase() });
  if (!r) return 0;
  return Math.max(0, Math.round((r.earned || 0) - (r.spent || 0)));
}

/* ── the quote ────────────────────────────────────────────────────────────── */

/**
 * The full breakdown for one booking. `notices` carries anything the form
 * should say out loud — a rejected code must never fail silently and leave
 * someone believing they got a discount.
 */
/**
 * Has this address been on a call before?
 *
 * Only settled bookings count — a pending one that was never paid must not
 * cost someone their introductory price.
 */
export async function hasBookedBefore(db, email) {
  if (!email) return false;
  try {
    const found = await collections.bookings(db).findOne(
      { email: String(email).toLowerCase(), status: 'confirmed' },
      { projection: { _id: 1 } }
    );
    return Boolean(found);
  } catch (err) {
    console.error('[pricing] history read failed:', err.message);
    return false;   // never charge the higher rate on a failed lookup
  }
}

export async function quote(db, { plan, coupon, referral, email, useCredit = true } = {}) {
  const offers = await getOffers(db);
  const rates = await effectivePrices(db);

  let base;
  let listPrice;
  let earlyBird = false;

  // The introductory price is for the first call only. After that a single
  // session costs the weekly rate the monthly programme works out at, so
  // booking one at a time is never cheaper than committing to the month.
  let firstCall = true;
  if (plan === 'monthly') {
    base = rates.monthly;
    // Never strike through a number below what is being charged, which is
    // what a stale PRICE_REGULAR would otherwise do after a rise.
    listPrice = Math.max(listPriceForPlan('monthly'), base);
  } else {
    firstCall = !(await hasBookedBefore(db, email));
    base = firstCall ? rates.firstCall : rates.session;
    listPrice = base;
  }

  const ebPrice = firstCall ? offers.earlyBird[plan === 'monthly' ? 'monthly' : 'trial'] : null;
  if (offers.earlyBird.active && Number.isFinite(ebPrice) && ebPrice !== null && ebPrice < base) {
    base = ebPrice;
    earlyBird = true;
  } else if (base < listPrice) {
    earlyBird = true;   // env-configured early bird, still worth showing
  }

  const lines = [];
  const notices = [];
  let total = base;

  if (coupon) {
    const c = await checkCoupon(db, coupon, plan, total);
    if (c.ok && c.discount > 0) {
      lines.push({ kind: 'coupon', code: c.coupon.code, label: c.coupon.label, amount: c.discount });
      total -= c.discount;
    } else {
      notices.push({ kind: 'coupon', message: c.reason || 'That code could not be applied.' });
    }
  }

  if (referral) {
    const r = await checkReferral(db, referral, email, offers);
    if (r.ok && r.discount > 0) {
      const amount = Math.min(r.discount, total);
      lines.push({ kind: 'referral', code: r.referral.code, amount });
      total -= amount;
    } else {
      notices.push({ kind: 'referral', message: r.reason || 'That referral code could not be applied.' });
    }
  }

  // Credit last, so it is spent against the smallest possible bill and stretches
  // across more bookings.
  let creditAvailable = 0;
  if (email) {
    try {
      creditAvailable = await getCredit(db, email);
    } catch (err) {
      console.error('[pricing] credit read failed:', err.message);
    }
  }
  if (useCredit && creditAvailable > 0 && total > 0) {
    const used = Math.min(creditAvailable, total);
    lines.push({ kind: 'credit', amount: used });
    total -= used;
  }

  total = Math.max(0, Math.round(total));

  return {
    plan,
    firstCall,
    sessionRate: rates.session,
    creditAvailable,
    creditUsed: lines.find((l) => l.kind === 'credit')?.amount || 0,
    listPrice,
    basePrice: base,
    earlyBird,
    discounts: lines,
    totalDiscount: lines.reduce((n, l) => n + l.amount, 0),
    amount: total,
    notices,
    offers,
  };
}

/** Record the usage once a booking is actually stored. */
export async function recordUse(db, q, bookingEmail) {
  for (const line of q.discounts) {
    try {
      if (line.kind === 'coupon') {
        await collections.coupons(db).updateOne({ code: line.code }, { $inc: { usedCount: 1 } });
      }
      if (line.kind === 'credit') {
        await collections.referrals(db).updateOne(
          { email: String(bookingEmail).toLowerCase() },
          { $inc: { spent: line.amount } }
        );
      }
      if (line.kind === 'referral') {
        const offers = q.offers || (await getOffers(db));
        await collections.referrals(db).updateOne(
          { code: line.code },
          { $inc: { uses: 1, earned: offers.referral.reward || 0 },
            $push: { referred: { email: bookingEmail, at: new Date() } } }
        );
      }
    } catch (err) {
      // A booking must never fail because a counter could not be bumped.
      console.error('[pricing] usage record failed:', err.message);
    }
  }
}
