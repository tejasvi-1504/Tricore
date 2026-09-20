/**
 * Clear test data out of the database.
 *
 *   node scripts/reset-test-data.mjs            # dry run — says what it would do
 *   node scripts/reset-test-data.mjs --yes      # actually delete
 *   node scripts/reset-test-data.mjs --yes --all  # ...including settings
 *
 * Dry by default, because the only thing worse than test data in a live
 * database is a script that empties one by accident.
 *
 * `settings` is kept unless --all is passed. It is not test data: it holds
 * the meeting link, the site theme, the mentor-photo toggle and the prices
 * set from the admin panel, none of which are recoverable once gone.
 *
 * Reads .env.local the same way dev-server.mjs does, including the DNS
 * workaround for a machine whose Node resolver points at a loopback address
 * with nothing listening on it.
 */
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import { fileURLToPath } from 'node:url';

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

// Everything a round of testing leaves behind.
const CLEAR = ['bookings', 'slots', 'referrals', 'contacts', 'otps'];
// Things somebody configured on purpose.
const KEEP = ['settings', 'companies', 'coupons', 'dsa'];

if (INCLUDE_SETTINGS) {
  CLEAR.push('settings');
  KEEP.splice(KEEP.indexOf('settings'), 1);
}

/* ── go ─────────────────────────────────────────────────────────────────── */
const { getDb } = await import(path.join(ROOT, 'api/_lib/db.js').replace(/\\/g, '/').replace(/^/, 'file:///'));
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

if (!INCLUDE_SETTINGS && present.has('settings')) {
  const s = await db.collection('settings').findOne({ _id: 'site' });
  const kept = Object.keys(s || {}).filter((k) => k !== '_id');
  if (kept.length) console.log(`\n  settings still holds: ${kept.join(', ')}`);
}

console.log(`\n${total} document${total === 1 ? '' : 's'} ${CONFIRMED ? 'deleted' : 'would be deleted'}.`);
process.exit(0);
