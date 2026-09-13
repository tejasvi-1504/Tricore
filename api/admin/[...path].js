/**
 * Every /api/admin/* route, behind one Serverless Function.
 *
 * The Hobby plan allows 12 functions per deployment and one file per route
 * would spend five of them here. The handlers still live in their own modules
 * under _lib/admin (an underscore folder is shared code, not a route) — this
 * only dispatches on the first path segment.
 */
import { json } from '../_lib/http.js';
import action from '../_lib/admin/action.js';
import bookings from '../_lib/admin/bookings.js';
import companies from '../_lib/admin/companies.js';
import contacts from '../_lib/admin/contacts.js';
import login from '../_lib/admin/login.js';

const ROUTES = { action, bookings, companies, contacts, login };

export default async function handler(req, res) {
  const raw = req.query?.path;
  const name = Array.isArray(raw) ? raw[0] : String(raw ?? '');

  // Own-property check only, so "constructor" and friends cannot reach through.
  const route = Object.prototype.hasOwnProperty.call(ROUTES, name) ? ROUTES[name] : null;
  if (!route) return json(res, 404, { error: 'No such admin route.' });

  return route(req, res);
}
