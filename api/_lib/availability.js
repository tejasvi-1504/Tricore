/**
 * Enrolment rules for the Krevol weekend programme.
 *
 * The product is a ONE-MONTH programme, not a one-off call:
 *   · Saturday — group learning session
 *   · Sunday   — 1:1 interaction
 *
 * Two ways to attend, and they schedule differently:
 *   · Meerut (in person) — a weekend batch, so it starts on a Saturday and the
 *     calendar offers Saturdays only.
 *   · Online — the student picks any start day plus the daily time slot they
 *     will hold each week, from DAILY_WINDOWS below.
 *
 * NOTE: script.js mirrors MODES / PROGRAMME so the calendar renders without a
 * round-trip. Change both together. The server is authoritative — every
 * enrolment is re-validated here before anything is stored.
 *
 * All dates are plain 'YYYY-MM-DD' strings in IST, so no timezone maths leaks
 * into storage.
 */

export const IST_OFFSET_MINUTES = 330; // UTC+05:30

/** How far ahead a student may book a start date. */
export const BOOKING_WINDOW_DAYS = 60;

/** A batch must be booked at least this far ahead of its first session. */
export const MIN_LEAD_HOURS = 12;

/** Batches begin on a Saturday. 0=Sun … 6=Sat */
export const START_DOW = 6;

export const PROGRAMME = {
  name: 'Weekend Programme',
  durationLabel: '1 month · 4 weekends',
  weeks: 4,
  /** Canonical clock time for the Saturday session — also part of the slot key. */
  startTime: '10:00',
  schedule: [
    {
      day: 'Saturday',
      title: 'Learning session',
      detail: 'Group teaching — DSA, development and the concepts behind them.',
    },
    {
      day: 'Sunday',
      title: '1:1 interaction',
      detail: 'Your own time — doubts, mock interviews, resume and profile review.',
    },
  ],
};

/**
 * What the student is buying.
 *
 *   trial   — a single 1-hour session, any day, so someone can try it once.
 *   monthly — the full four-weekend programme.
 */
export const PLANS = {
  trial: {
    key: 'trial',
    label: '1-Day Trial',
    short: 'Trial',
    kind: 'trial',
    durationLabel: '1 hour · one session',
    blurb: 'A single hour to see whether this is worth your time.',
    weeks: 0,
    sessions: 1,
    priceEnv: 'PRICE_TRIAL',
    priceDefault: 200,
    // Always a specific date + time, whichever mode you pick.
    needsTime: true,
  },
  monthly: {
    key: 'monthly',
    label: 'Monthly Programme',
    short: 'Monthly',
    kind: 'programme',
    durationLabel: '1 month · 4 weekends',
    blurb: 'Saturday learning plus Sunday 1:1, every weekend for a month.',
    weeks: 4,
    sessions: 8,
    priceEnv: 'PRICE_MONTHLY',
    priceDefault: 2000,
    // Online holds a weekly time; Meerut runs as a Saturday batch.
    needsTime: false,
  },
};

/**
 * How a student attends. Capacity is per batch, per mode — an in-person room
 * is smaller than an online one, and both can run on the same Saturday.
 */
export const MODES = {
  meerut: {
    key: 'meerut',
    label: 'In-person · Meerut',
    short: 'Meerut',
    capacity: 15,
    priceEnv: 'PRICE_MEERUT',
    // Weekend batch: everyone in the room starts together on a Saturday.
    scheduling: 'weekend',
  },
  online: {
    key: 'online',
    label: 'Online',
    short: 'Online',
    capacity: 40,
    priceEnv: 'PRICE_ONLINE',
    // Online students pick a start day and a recurring time slot, any day.
    scheduling: 'daily',
  },
};

/**
 * Daily availability for online students — the time they hold each week.
 *   Mon–Fri  evenings, 8:00–10:00 PM, on the half hour
 *   Sat/Sun  all day, 10:00 AM–10:00 PM, hourly
 */
export const DAILY_WINDOWS = [
  { days: [1, 2, 3, 4, 5], start: '20:00', end: '22:00', stepMins: 30 },
  { days: [0, 6],          start: '10:00', end: '22:00', stepMins: 60 },
];

/** Minutes a single online session runs for. */
export const SESSION_MINS = 60;

/* ── date helpers ─────────────────────────────────────────────────────────── */

export function isValidDateStr(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

/** Day of week for a plain date string, free of local-timezone drift. 0=Sun. */
export function dayOfWeek(dateStr) {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}

/** A Date whose *local* getters read as the current IST wall clock. */
export function nowIST() {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + IST_OFFSET_MINUTES * 60000);
}

/** Today in IST as 'YYYY-MM-DD'. */
export function todayIST() {
  const d = nowIST();
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** 'YYYY-MM-DD' -> 'Sat, 12 September 2026' */
export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/* ── programme rules ──────────────────────────────────────────────────────── */

export function isWithinBookingWindow(dateStr) {
  const today = todayIST();
  return dateStr >= today && dateStr <= addDays(today, BOOKING_WINDOW_DAYS);
}

/** Too close to the first session to enrol? */
export function isTooLate(dateStr) {
  const today = todayIST();
  if (dateStr < today) return true;
  if (dateStr > today) return false;
  // Same-day: only if we're still MIN_LEAD_HOURS before the session starts.
  const now = nowIST();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = Number(PROGRAMME.startTime.slice(0, 2)) * 60;
  return startMins - nowMins < MIN_LEAD_HOURS * 60;
}

/** Is this date a valid batch start (a Saturday, in range, not too late)? */
export function isStartDate(dateStr) {
  return (
    isValidDateStr(dateStr) &&
    dayOfWeek(dateStr) === START_DOW &&
    isWithinBookingWindow(dateStr) &&
    !isTooLate(dateStr)
  );
}

/** The next batch start dates a student can pick, soonest first. */
export function upcomingStarts(limit = 8) {
  const today = todayIST();
  const out = [];
  for (let i = 0; i <= BOOKING_WINDOW_DAYS && out.length < limit; i++) {
    const d = addDays(today, i);
    if (dayOfWeek(d) === START_DOW && !isTooLate(d)) {
      out.push({ date: d, label: formatDate(d), endDate: addDays(d, PROGRAMME.weeks * 7 - 1) });
    }
  }
  return out;
}

/**
 * Does this plan+mode combination need a specific time slot?
 *   · a trial is always a single hour, so always yes
 *   · the monthly plan online holds a weekly time, so yes
 *   · the monthly plan at Meerut is a Saturday batch, so no
 */
export function needsTime(planKey, modeKey) {
  const plan = PLANS[planKey];
  const mode = MODES[modeKey];
  if (!plan || !mode) return false;
  return plan.needsTime || mode.scheduling === 'daily';
}

/** Full validation, run before anything is written to the database. */
export function validateEnrolment(dateStr, modeKey, time, planKey = 'monthly') {
  const plan = PLANS[planKey];
  const mode = MODES[modeKey];
  if (!plan) return 'Please choose a plan.';
  if (!mode) return 'Please choose how you want to attend.';
  if (!isValidDateStr(dateStr)) return 'Invalid date.';
  if (!isWithinBookingWindow(dateStr)) {
    return `Please pick a date within the next ${BOOKING_WINDOW_DAYS} days.`;
  }

  // Saturday batch — only the monthly plan at Meerut.
  if (!needsTime(planKey, modeKey)) {
    if (dayOfWeek(dateStr) !== START_DOW) {
      return 'In-person batches start on a Saturday. Please pick a Saturday.';
    }
    if (isTooLate(dateStr)) {
      return 'Enrolment for that batch has closed. Please pick the next Saturday.';
    }
    return null;
  }

  // Everything else needs a valid, still-open slot on that date.
  if (!time) return 'Please pick a time slot.';
  const slot = generateDailySlots(dateStr).find((s) => s.time === time);
  if (!slot) return 'That time is outside our session hours.';
  if (slot.past) return 'That slot has passed. Please pick a later time.';
  return null;
}

/* ── pricing ──────────────────────────────────────────────────────────────── */

function readPrice(name, fallback) {
  const raw = process.env[name];
  const n = raw == null || raw === '' ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback;
}

/** What the student actually pays, in rupees. */
export function priceForPlan(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return 0;
  return readPrice(plan.priceEnv, plan.priceDefault);
}

/**
 * The regular price shown struck through. Only the monthly plan carries an
 * early-bird discount; the trial is priced as-is.
 */
export function listPriceForPlan(planKey) {
  if (planKey !== 'monthly') return priceForPlan(planKey);
  return readPrice('PRICE_REGULAR', 3000);
}

/** True when the student is getting a discount worth showing. */
export function isEarlyBird(planKey) {
  return priceForPlan(planKey) < listPriceForPlan(planKey);
}

/**
 * Payment handling. 'manual' means the student is sent to WhatsApp with their
 * booking details and Krevol confirms by hand — set PAYMENT_MODE=cashfree once
 * the volume justifies automating it.
 */
export function paymentMode() {
  return process.env.PAYMENT_MODE === 'cashfree' ? 'cashfree' : 'manual';
}

/** The WhatsApp number bookings are sent to. */
export function whatsappNumber() {
  return (process.env.WHATSAPP_NUMBER || '919410891738').replace(/\D/g, '');
}

/* ── daily slots (online mode) ─────────────────────────────────────────────── */

export function toMinutes(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}
export function toHHMM(mins) {
  return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
}
/** '20:30' -> '8:30 PM' */
export function toLabel(hhmm) {
  const mins = toMinutes(hhmm);
  if (Number.isNaN(mins)) return hhmm;
  const h24 = Math.floor(mins / 60), m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

export function dailyWindowFor(dateStr) {
  const dow = dayOfWeek(dateStr);
  return DAILY_WINDOWS.find((w) => w.days.includes(dow)) || null;
}

/** Has this specific slot already passed (or come too close) today? */
export function isSlotPast(dateStr, time) {
  const today = todayIST();
  if (dateStr < today) return true;
  if (dateStr > today) return false;
  const now = nowIST();
  return toMinutes(time) < now.getHours() * 60 + now.getMinutes() + 60;
}

/** Every online slot start on a date. A slot is only offered if it fits the window. */
export function generateDailySlots(dateStr) {
  const win = dailyWindowFor(dateStr);
  if (!win) return [];
  const out = [];
  for (let t = toMinutes(win.start); t + SESSION_MINS <= toMinutes(win.end); t += win.stepMins) {
    const time = toHHMM(t);
    out.push({ time, label: toLabel(time), past: isSlotPast(dateStr, time) });
  }
  return out;
}

/** Online students may start any day in the window, not just Saturdays. */
export function isOnlineStart(dateStr) {
  return isValidDateStr(dateStr) && isWithinBookingWindow(dateStr) && generateDailySlots(dateStr).length > 0;
}

/** Human-readable schedule summary — reused in emails. */
export function scheduleSummary() {
  return PROGRAMME.schedule.map((s) => `${s.day}: ${s.title}`).join(' · ');
}
