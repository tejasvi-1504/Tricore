/**
 * POST /api/contact — project enquiries from the main contact form.
 * Stored in MongoDB and emailed to BOOKING_EMAIL.
 */
import { getDb, collections, ConfigError } from './_lib/db.js';
import {
  json,
  methodGuard,
  readBody,
  str,
  isEmail,
  normalisePhone,
  rateLimited,
} from './_lib/http.js';
import { sendContactNotification } from './_lib/mailer.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return;

  if (rateLimited(req, { key: 'contact', max: 6, windowMs: 60000 })) {
    return json(res, 429, { error: 'Too many messages. Please try again in a minute.' });
  }

  const body = readBody(req);

  // Honeypot: real users never fill a hidden field.
  if (str(body.website, 100)) return json(res, 200, { ok: true });

  const name = str(body.name, 120);
  const email = str(body.email, 160).toLowerCase();
  const phone = body.phone ? normalisePhone(body.phone) : '';
  const service = str(body.service, 80);
  const budget = str(body.budget, 80);
  const message = str(body.message, 4000);

  if (name.length < 2) return json(res, 400, { error: 'Please enter your name.' });
  if (!isEmail(email)) return json(res, 400, { error: 'Please enter a valid email address.' });
  if (message.length < 10) {
    return json(res, 400, { error: 'Please tell us a little more about your project.' });
  }
  if (body.phone && !phone) {
    return json(res, 400, { error: 'Please enter a valid 10-digit mobile number.' });
  }

  const contact = {
    name,
    email,
    phone: phone || '',
    service,
    budget,
    message,
    status: 'new',
    source: 'website',
    createdAt: new Date(),
  };

  try {
    const db = await getDb();
    await collections.contacts(db).insertOne({ ...contact });
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error('[contact]', err.message);
    } else {
      console.error('[contact] insert failed:', err.message);
    }
    // Storage failed — still try to email so the lead is not lost.
    const mailed = await sendContactNotification(contact);
    return mailed
      ? json(res, 200, { ok: true, stored: false })
      : json(res, 503, { error: 'We could not send your message. Please reach us on WhatsApp.' });
  }

  sendContactNotification(contact).catch(() => {});
  return json(res, 201, { ok: true, stored: true });
}
