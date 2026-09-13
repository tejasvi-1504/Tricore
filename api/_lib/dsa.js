/**
 * The DSA plan and question bank.
 *
 * Unlike the rest of the curriculum this lives in the database, because these
 * are the mentor's own questions and get added between sessions rather than
 * through a deploy.
 */
import { collections } from './db.js';

export const LEVELS = ['easy', 'medium', 'hard'];

const str = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export async function listDsa(db) {
  const rows = await collections.dsa(db).find({}).sort({ topic: 1, order: 1, createdAt: 1 }).toArray();

  // Grouped by topic so the panel can render sections without regrouping.
  const byTopic = new Map();
  for (const r of rows) {
    const key = r.topic || 'Uncategorised';
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key).push({
      id: String(r._id),
      topic: key,
      title: r.title,
      level: r.level || 'medium',
      link: r.link || '',
      notes: r.notes || '',
      createdAt: r.createdAt,
    });
  }
  return {
    topics: [...byTopic.entries()].map(([topic, items]) => ({ topic, items })),
    total: rows.length,
  };
}

export async function addDsa(db, body) {
  const topic = str(body.topic, 60);
  const title = str(body.title, 200);
  if (!topic) return { ok: false, error: 'Which topic does this belong to?' };
  if (!title) return { ok: false, error: 'Give the question a title.' };

  const level = LEVELS.includes(body.level) ? body.level : 'medium';

  let link = str(body.link, 400);
  if (link) {
    try {
      const u = new URL(link);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, error: 'Links must be http or https.' };
      link = u.toString();
    } catch {
      return { ok: false, error: 'That link is not a valid URL.' };
    }
  }

  const last = await collections.dsa(db).find({ topic }).sort({ order: -1 }).limit(1).toArray();

  await collections.dsa(db).insertOne({
    topic, title, level, link,
    notes: String(body.notes ?? '').trim().slice(0, 4000),
    order: (last[0]?.order ?? -1) + 1,
    createdAt: new Date(),
  });
  return { ok: true };
}

export async function removeDsa(db, id) {
  const { ObjectId } = await import('mongodb');
  let _id;
  try {
    _id = new ObjectId(String(id));
  } catch {
    return { ok: false, error: 'Which question?' };
  }
  const res = await collections.dsa(db).deleteOne({ _id });
  return res.deletedCount ? { ok: true } : { ok: false, error: 'That question is already gone.' };
}
