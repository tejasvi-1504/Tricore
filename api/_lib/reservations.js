/**
 * Seat reservation — the concurrency gate that stops a batch being
 * oversubscribed.
 *
 * One document per (batch start date × mode), `_id = "<date>_<mode>"`, holding
 * a seat count. Keying on the mode as well as the date matters: the Meerut and
 * online batches run on the same Saturday and fill independently.
 */
import { collections } from './db.js';

/**
 * Atomically take one seat in a batch. Returns the slot id if the seat is
 * yours, or null if the batch is already full.
 *
 * The filter includes `count < capacity`, so when a full doc exists the upsert
 * falls through to an insert on the same _id — which Mongo rejects with E11000.
 * That duplicate-key error is exactly the "batch just filled up" signal we
 * want, and it is atomic without needing a transaction.
 */
export async function reserveSeat(db, { date, mode, time, plan = 'monthly' }) {
  // Timed bookings are per slot; a weekend batch is one room per Saturday.
  // The plan is part of the key so a trial hour and a monthly slot don't collide.
  const slotId = time
    ? `${date}_${time}_${mode.key}_${plan}`
    : `${date}_${mode.key}_${plan}`;
  try {
    await collections.slots(db).findOneAndUpdate(
      { _id: slotId, count: { $lt: mode.capacity } },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          date,
          time: time || null,
          mode: mode.key,
          plan,
          capacity: mode.capacity,
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    return slotId;
  } catch (err) {
    if (err?.code === 11000) return null; // batch full
    console.error('[reservations] reserve failed:', err.message);
    return null;
  }
}

/** Give a seat back — used whenever an enrolment fails, expires or is cancelled. */
export async function releaseSeat(db, slotId) {
  if (!slotId) return;
  try {
    const result = await collections.slots(db).findOneAndUpdate(
      { _id: slotId, count: { $gt: 0 } },
      { $inc: { count: -1 } },
      { returnDocument: 'after' }
    );
    const after = result?.value ?? result;
    if (after && after.count <= 0) {
      await collections.slots(db).deleteOne({ _id: slotId, count: { $lte: 0 } });
    }
  } catch (err) {
    console.error('[reservations] release failed:', err.message);
  }
}
