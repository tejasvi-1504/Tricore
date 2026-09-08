/**
 * MongoDB access for Vercel serverless functions.
 *
 * Connections are cached on globalThis so warm invocations reuse the same pool
 * instead of opening a new one per request (which exhausts Atlas connection
 * limits very quickly).
 */
import { MongoClient } from 'mongodb';

// The physical database name, deliberately left as 'krevol' through the rename
// to Kanishka Creates: it is invisible to users, and changing it would point a
// deployment at a new, empty database rather than the one holding the bookings.
// Renaming it is a data migration, not a find-and-replace.
const DB_NAME = process.env.MONGODB_DB || 'krevol';

const cache = (globalThis.__kcMongo ??= { client: null, promise: null, indexed: false });

export class ConfigError extends Error {}

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new ConfigError('MONGODB_URI is not set. Add it in your Vercel project settings.');
  }

  if (!cache.promise) {
    cache.promise = MongoClient.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    }).then((client) => {
      cache.client = client;
      return client;
    }).catch((err) => {
      cache.promise = null; // let the next request retry
      throw err;
    });
  }

  const client = await cache.promise;
  const db = client.db(DB_NAME);
  await ensureIndexes(db);
  return db;
}

async function ensureIndexes(db) {
  if (cache.indexed) return;
  cache.indexed = true;
  try {
    await Promise.all([
      db.collection('bookings').createIndex({ bookingId: 1 }, { unique: true }),
      db.collection('bookings').createIndex({ date: 1, time: 1 }),
      db.collection('bookings').createIndex({ createdAt: -1 }),
      db.collection('bookings').createIndex({ 'payment.orderId': 1 }, { sparse: true }),
      db.collection('contacts').createIndex({ createdAt: -1 }),
    ]);
  } catch (err) {
    cache.indexed = false;
    console.error('[db] index creation failed:', err.message);
  }
}

export const collections = {
  bookings: (db) => db.collection('bookings'),
  /** One doc per reserved slot — the atomic gate that stops double-booking. */
  slots: (db) => db.collection('slots'),
  contacts: (db) => db.collection('contacts'),
};
