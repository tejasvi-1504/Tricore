/** Every /api/history/* route, behind one Serverless Function. */
import { makeDispatcher } from '../_lib/dispatch.js';
import me from '../_lib/history/me.js';
import session from '../_lib/history/session.js';

export default makeDispatcher('history', { me, session }, 'history');
