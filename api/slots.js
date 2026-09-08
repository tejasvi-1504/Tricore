/**
 * GET /api/slots?mode=online[&date=YYYY-MM-DD]
 *
 * Two shapes, because the two modes schedule differently:
 *
 *   mode=meerut          -> { batches: [...] }   upcoming Saturdays, seats left
 *   mode=online          -> { batches: [...] }   the same list of start dates
 *   mode=online&date=..  -> { slots:   [...] }   daily time slots for that date
 *
 * Kept at this path so the frontend contract stays stable.
 */
import { getDb, collections, ConfigError } from './_lib/db.js';
import { json, methodGuard, str } from './_lib/http.js';
import {
  MODES,
  PLANS,
  PROGRAMME,
  needsTime,
  upcomingStarts,
  generateDailySlots,
  isValidDateStr,
  isWithinBookingWindow,
  addDays,
  formatDate,
  todayIST,
  priceForPlan,
  listPriceForPlan,
  isEarlyBird,
  paymentMode,
  BOOKING_WINDOW_DAYS,
} from './_lib/availability.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET'])) return;

  const modeKey = str(req.query?.mode, 40) || 'online';
  const planKey = str(req.query?.plan, 40) || 'monthly';
  const date = str(req.query?.date, 10);
  const mode = MODES[modeKey];
  const plan = PLANS[planKey];
  if (!mode) return json(res, 400, { error: 'Unknown attendance mode.' });
  if (!plan) return json(res, 400, { error: 'Unknown plan.' });

  // A trial is always a specific hour; the monthly plan only when online.
  const timed = needsTime(planKey, modeKey);

  const base = {
    mode: modeKey,
    modeLabel: mode.label,
    plan: planKey,
    planLabel: plan.label,
    scheduling: timed ? 'daily' : 'weekend',
    needsTime: timed,
    paymentMode: paymentMode(),
    price: priceForPlan(planKey),
    listPrice: listPriceForPlan(planKey),
    earlyBird: isEarlyBird(planKey),
    programme: {
      name: PROGRAMME.name,
      duration: PROGRAMME.durationLabel,
      weeks: PROGRAMME.weeks,
      schedule: PROGRAMME.schedule,
    },
  };

  let db = null;
  try {
    db = await getDb();
  } catch (err) {
    if (err instanceof ConfigError) console.warn('[slots]', err.message);
    else console.error('[slots] db error:', err.message);
  }

  /* ── online + a specific date: the day's time slots ──────────────────── */
  if (timed && date) {
    if (!isValidDateStr(date)) return json(res, 400, { error: 'Invalid date.' });

    const open = isWithinBookingWindow(date);
    const slots = open ? generateDailySlots(date) : [];
    if (!slots.length) {
      return json(res, 200, { ...base, date, open: false, slots: [] });
    }

    let taken = new Map();
    if (db) {
      try {
        const docs = await collections
          .slots(db)
          .find({ date, mode: modeKey, plan: planKey },
                { projection: { time: 1, count: 1, capacity: 1 } })
          .toArray();
        taken = new Map(docs.map((d) => [d.time, d]));
      } catch (err) {
        console.error('[slots] slot lookup failed:', err.message);
      }
    }

    return json(res, 200, {
      ...base,
      date,
      open: true,
      slots: slots.map((s) => {
        const held = taken.get(s.time);
        const used = held ? held.count : 0;
        const capacity = held?.capacity ?? mode.capacity;
        const seatsLeft = Math.max(0, capacity - used);
        const available = !s.past && seatsLeft > 0;
        return {
          time: s.time,
          label: s.label,
          available,
          reason: s.past ? 'past' : seatsLeft <= 0 ? 'full' : null,
          seatsLeft,
        };
      }),
    });
  }

  /* ── otherwise: the list of start dates ─────────────────────────────── */
  const starts = timed ? upcomingDays() : upcomingStarts();

  let taken = new Map();
  if (db) {
    try {
      const docs = await collections
        .slots(db)
        .find(
          { date: { $in: starts.map((s) => s.date) }, mode: modeKey, plan: planKey },
          { projection: { date: 1, count: 1, capacity: 1 } }
        )
        .toArray();
      // Several time slots can exist per day online — sum them for the day view.
      for (const d of docs) {
        const prev = taken.get(d.date) || { count: 0, capacity: mode.capacity };
        taken.set(d.date, { count: prev.count + d.count, capacity: d.capacity ?? mode.capacity });
      }
    } catch (err) {
      console.error('[slots] batch lookup failed:', err.message);
    }
  }

  return json(res, 200, {
    ...base,
    batches: starts.map((s) => {
      const held = taken.get(s.date);
      const capacity = held?.capacity ?? mode.capacity;
      // For daily mode the day is only "full" if every slot is, which the
      // per-date request resolves properly; here we just flag heavy demand.
      const seatsLeft = timed ? capacity : Math.max(0, capacity - (held?.count ?? 0));
      return {
        date: s.date,
        label: s.label,
        endDate: s.endDate,
        available: timed ? true : seatsLeft > 0,
        seatsLeft,
        capacity,
      };
    }),
  });
}

/** Online students may start on any day inside the booking window. */
function upcomingDays(limit = 60) {
  const today = todayIST();
  const out = [];
  for (let i = 0; i <= BOOKING_WINDOW_DAYS && out.length < limit; i++) {
    const d = addDays(today, i);
    if (generateDailySlots(d).some((s) => !s.past)) {
      out.push({
        date: d,
        label: formatDate(d),
        endDate: addDays(d, PROGRAMME.weeks * 7 - 1),
      });
    }
  }
  return out;
}
