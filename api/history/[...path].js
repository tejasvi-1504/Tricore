/**
 * Every /api/history/* route, behind one Serverless Function.
 * See api/admin/[...path].js — same reason, same shape.
 */
import { json } from '../_lib/http.js';
import me from '../_lib/history/me.js';
import session from '../_lib/history/session.js';

const ROUTES = { me, session };

export default async function handler(req, res) {
  const raw = req.query?.path;
  const name = Array.isArray(raw) ? raw[0] : String(raw ?? '');

  const route = Object.prototype.hasOwnProperty.call(ROUTES, name) ? ROUTES[name] : null;
  if (!route) return json(res, 404, { error: 'No such history route.' });

  return route(req, res);
}
