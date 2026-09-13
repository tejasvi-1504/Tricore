/** Every /api/admin/* route, behind one Serverless Function. */
import { makeDispatcher } from '../_lib/dispatch.js';
import action from '../_lib/admin/action.js';
import bookings from '../_lib/admin/bookings.js';
import companies from '../_lib/admin/companies.js';
import contacts from '../_lib/admin/contacts.js';
import login from '../_lib/admin/login.js';

export default makeDispatcher('admin', { action, bookings, companies, contacts, login }, 'admin');
