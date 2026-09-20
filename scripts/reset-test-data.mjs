/**
 * Clear test data out of the database.
 *
 *   node scripts/reset-test-data.mjs                        # dry run
 *   node scripts/reset-test-data.mjs --yes                  # delete, leave settings alone
 *   node scripts/reset-test-data.mjs --yes --keep-meet-link # ...and strip settings back
 *                                                           #    to the meeting link
 *   node scripts/reset-test-data.mjs --yes --all            # ...including the link
 *
 * Dry by default, because the only thing worse than test data in a live
 * database is a script that empties one by accident.
 *
 * `settings` is not test data — it holds the meeting link, the site theme,
 * the mentor-photo toggle, the prices and the offers set from the admin
 * panel — so by default it is left alone. --keep-meet-link empties it of
 * everything except the link, which is the one setting that cannot be worked
 * out again: prices fall back to the environment and the theme to its
 * default, but nobody can guess a Meet URL.
 *
 * Reads .env.local the same way dev-server.mjs does, including the DNS
 * workaround for a machine whose Node resolver points at a loopback address
 * with nothing listening on it.
 */
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── env ────────────────────────────────────────────────────────────────── */
const envFile = path.join(ROOT, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

const resolvers = dns.getServers();
if (resolvers.length && resolvers.every((a) => /^127\./.test(a) || a === '::1')) {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
}

/* ── what goes, what stays ──────────────────────────────────────────────── */
const args = new Set(process.argv.slice(2));
const CONFIRMED = args.has('--yes') || args.has('-y');
const INCLUDE_SETTINGS = args.has('--all');
const STRIP_SETTINGS = args.has('--keep-meet-link');

// Everything a round of testing leaves behind.
const CLEAR = ['bookings', 'slots', 'referrals', 'contacts', 'otps'];
// Things somebody configured on purpose.
const KEEP = ['settings', 'companies', 'coupons', 'dsa'];

const unkeep = (name) => {
  const i = KEEP.indexOf(name);
  if (i >= 0) KEEP.splice(i, 1);
  CLEAR.push(name);
};

if (INCLUDE_SETTINGS) unkeep('settings');
// Either flag means a clean slate, and a coupon is test data as often as not.
if (INCLUDE_SETTINGS || STRIP_SETTINGS) unkeep('coupons');

/* ── go ─────────────────────────────────────────────────────────────────── */
const { getDb } = await import(pathToFileURL(path.join(ROOT, 'api/_lib/db.js')).href);
const db = await getDb();

console.log(`database: ${db.databaseName}`);
console.log(CONFIRMED ? 'mode:     DELETING\n' : 'mode:     dry run — pass --yes to actually delete\n');

const present = new Set((await db.listCollections().toArray()).map((c) => c.name));
let total = 0;

for (const name of CLEAR) {
  if (!present.has(name)) continue;
  const n = await db.collection(name).countDocuments();
  if (!CONFIRMED) {
    console.log(`  would clear  ${name.padEnd(12)} ${String(n).padStart(4)} document${n === 1 ? '' : 's'}`);
    total += n;
    continue;
  }
  const res = await db.collection(name).deleteMany({});
  const after = await db.collection(name).countDocuments();
  total += res.deletedCount;
  console.log(`  cleared      ${name.padEnd(12)} ${String(n).padStart(4)} -> ${after}`);
}

console.log('');
for (const name of KEEP) {
  if (!present.has(name)) continue;
  const n = await db.collection(name).countDocuments();
  console.log(`  keeping      ${name.padEnd(12)} ${String(n).padStart(4)} document${n === 1 ? '' : 's'}`);
}

/* ── settings, stripped back to the one thing worth keeping ─────────────── */
if (STRIP_SETTINGS && !INCLUDE_SETTINGS && present.has('settings')) {
  const doc = await db.collection('settings').findOne({ _id: 'site' });
  const drop = Object.keys(doc || {})
    .filter((k) => k !== '_id' && k !== 'meetLink' && k !== 'updatedAt');
  const link = doc?.meetLink || '(not set)';

  if (!drop.length) {
    console.log('\n  settings already holds nothing but the meeting link.');
  } else if (!CONFIRMED) {
    console.log(`\n  would strip  settings     removing ${drop.join(', ')}`);
    console.log(`               keeping meetLink: ${link}`);
    total += drop.length;
  } else {
    await db.collection('settings').updateOne(
      { _id: 'site' },
      { $unset: Object.fromEntries(drop.map((k) => [k, ''])), $set: { updatedAt: new Date() } }
    );
    const after = await db.collection('settings').findOne({ _id: 'site' });
    total += drop.length;
    console.log(`\n  stripped     settings     removed ${drop.join(', ')}`);
    console.log(`               meetLink: ${after?.meetLink || '(not set)'}`);
  }
} else if (!INCLUDE_SETTINGS && present.has('settings')) {
  const s = await db.collection('settings').findOne({ _id: 'site' });
  const kept = Object.keys(s || {}).filter((k) => k !== '_id');
  if (kept.length) console.log(`\n  settings still holds: ${kept.join(', ')}`);
}

console.log(`\n${total} item${total === 1 ? '' : 's'} ${CONFIRMED ? 'removed' : 'would be removed'}.`);
process.exit(0);
