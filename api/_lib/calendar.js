/**
 * Calendar entries for a confirmed booking.
 *
 * Two forms, because no single one works everywhere:
 *   - a Google Calendar "add event" URL, for the button in the email
 *   - an .ics attachment, which Apple Calendar and Outlook open natively
 *
 * Times are stored as an IST date and clock time; calendars want UTC, so
 * everything converts through IST_OFFSET_MINUTES rather than the server's own
 * timezone, which on Vercel is UTC and would silently shift every event.
 */
import { IST_OFFSET_MINUTES, SESSION_MINS, PROGRAMME } from './availability.js';

/** 'YYYY-MM-DD' + 'HH:MM' in IST -> a UTC Date. */
function istToUtc(dateStr, timeStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm] = String(timeStr || '10:00').split(':').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0) - IST_OFFSET_MINUTES * 60000);
}

/** UTC Date -> '20261003T043000Z', the only format both formats accept. */
function stamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Start and end of the session a booking should put in a calendar. */
export function eventWindow(booking) {
  const start = istToUtc(booking.date, booking.time || PROGRAMME.startTime);
  if (!start || isNaN(start)) return null;
  return { start, end: new Date(start.getTime() + SESSION_MINS * 60000) };
}

function title(booking) {
  return booking.kind === 'trial'
    ? 'Career consulting — trial session'
    : `${booking.planLabel || PROGRAMME.name} — Kanishka Creates`;
}

function description(booking, meetLink) {
  const lines = [
    booking.kind === 'trial'
      ? 'Your one-hour trial session with Kanishka Creates.'
      : 'Saturday is the group learning session, Sunday is your 1:1 time.',
    '',
    `Reference: ${booking.bookingId}`,
  ];
  if (meetLink) lines.push('', `Join: ${meetLink}`);
  return lines.join('\n');
}

const where = (booking, meetLink) =>
  booking.mode === 'online' ? (meetLink || 'Online') : 'Meerut (venue shared before the session)';

/**
 * Google Calendar link. The monthly programme repeats weekly, so it carries a
 * recurrence rule rather than dropping a single orphan event in the diary.
 */
export function googleCalendarUrl(booking, meetLink) {
  const win = eventWindow(booking);
  if (!win) return '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title(booking),
    dates: `${stamp(win.start)}/${stamp(win.end)}`,
    details: description(booking, meetLink),
    location: where(booking, meetLink),
    ctz: 'Asia/Kolkata',
  });

  if (booking.kind !== 'trial' && booking.weeks > 1) {
    params.set('recur', `RRULE:FREQ=WEEKLY;COUNT=${booking.weeks}`);
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Escape the characters that carry meaning in an ICS value. */
const ics = (v) =>
  String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** A VEVENT the booking can be saved from, for calendars that are not Google. */
export function icsFile(booking, meetLink) {
  const win = eventWindow(booking);
  if (!win) return null;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kanishka Creates//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ics(booking.bookingId)}@kanishkacreates.vercel.app`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(win.start)}`,
    `DTEND:${stamp(win.end)}`,
    `SUMMARY:${ics(title(booking))}`,
    `DESCRIPTION:${ics(description(booking, meetLink))}`,
    `LOCATION:${ics(where(booking, meetLink))}`,
    'STATUS:CONFIRMED',
  ];
  if (booking.kind !== 'trial' && booking.weeks > 1) {
    lines.push(`RRULE:FREQ=WEEKLY;COUNT=${booking.weeks}`);
  }
  lines.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY',
             'DESCRIPTION:Session in 30 minutes', 'END:VALARM',
             'END:VEVENT', 'END:VCALENDAR');

  return {
    filename: `${booking.bookingId}.ics`,
    // CRLF is required by RFC 5545; Outlook in particular rejects bare \n.
    content: lines.join('\r\n'),
    contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
  };
}
