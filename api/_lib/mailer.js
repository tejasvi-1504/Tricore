/**
 * Transactional email via SMTP (Gmail by default).
 *
 * Booking notifications go to BOOKING_EMAIL. Email is deliberately best-effort:
 * a mail failure logs and returns false, it never fails a booking that has
 * already been paid for and stored.
 */
import nodemailer from 'nodemailer';
import { scheduleSummary } from './availability.js';

export const BOOKING_EMAIL = process.env.BOOKING_EMAIL || 'itskanishka1202@gmail.com';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: { user, pass },
  });
  return transporter;
}

export function isConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function send({ to, subject, html, replyTo }) {
  const tx = getTransporter();
  if (!tx) {
    console.warn('[mailer] SMTP not configured — skipping email:', subject);
    return false;
  }
  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM || `Kanishka Creates <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    return true;
  } catch (err) {
    console.error('[mailer] send failed:', err.message);
    return false;
  }
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function shell(title, rows, footer = '') {
  return `
  <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f6fb;padding:28px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;
                border:1px solid #e4e8f3">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);padding:22px 26px">
        <div style="color:#fff;font-size:19px;font-weight:700;letter-spacing:.3px">Kanishka Creates</div>
        <div style="color:rgba(255,255,255,.86);font-size:13px;margin-top:3px">${esc(title)}</div>
      </div>
      <div style="padding:24px 26px">
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1f2547">
          ${rows}
        </table>
        ${footer}
      </div>
      <div style="padding:14px 26px;background:#fafbff;border-top:1px solid #eef1f8;
                  color:#7b86a8;font-size:12px">
        Every weekend — ${esc(scheduleSummary())}
      </div>
    </div>
  </div>`;
}

const row = (k, v) => `
  <tr>
    <td style="padding:7px 0;color:#7b86a8;width:150px;vertical-align:top">${esc(k)}</td>
    <td style="padding:7px 0;font-weight:600">${esc(v)}</td>
  </tr>`;

/** Notify Kanishka Creates that a slot was booked. */
export function sendBookingNotification(booking) {
  const rows = [
    row('Reference', booking.bookingId),
    row('Plan', booking.planLabel || booking.programme),
    row('Attending', booking.modeLabel),
    row(booking.kind === 'trial' ? 'Date' : 'Starts', booking.dateLabel),
    booking.needsTime ? row('Time', `${booking.timeLabel} IST`) : '',
    booking.kind === 'trial' ? '' : row('Ends', booking.endDateLabel),
    row('Name', booking.name),
    row('Email', booking.email),
    row('Phone', booking.phone),
    booking.college ? row('College', booking.college) : '',
    booking.year ? row('Year', booking.year) : '',
    row('Amount', `₹${booking.amount}`),
    row('Payment', booking.paymentMode === 'manual'
      ? 'Manual — confirm on WhatsApp'
      : `${booking.status}`),
    booking.topic ? row('Wants help with', booking.topic) : '',
  ].join('');

  return send({
    to: BOOKING_EMAIL,
    replyTo: booking.email,
    subject: `New booking — ${booking.planLabel || 'Programme'}, ${booking.modeLabel}, ${booking.dateLabel}`,
    html: shell(
      booking.paymentMode === 'manual'
        ? 'New booking — awaiting your WhatsApp confirmation'
        : 'New booking',
      rows
    ),
  });
}

/**
 * Confirm to the student that their slot is booked.
 *
 * A trial is a single hour on one date; the monthly programme runs across four
 * weekends. They need different wording, so branch on the plan kind rather than
 * telling a trial student about their "four weekends".
 */
export function sendBookingConfirmation(booking) {
  const trial = booking.kind === 'trial';
  const online = booking.mode === 'online';

  const joining = online
    ? 'We will send the joining link on WhatsApp and email before the session.'
    : 'We will send the Meerut venue details and directions on WhatsApp before the session.';

  const rows = [
    row(trial ? 'Session' : 'Programme', booking.planLabel || booking.programme),
    row('Attending', booking.modeLabel),
    row(trial ? 'Date' : 'Starts', booking.dateLabel),
    trial ? row('Time', `${booking.timeLabel} IST`) : row('Ends', booking.endDateLabel),
    !trial && booking.needsTime ? row('Time', `${booking.timeLabel} IST`) : '',
    row('Amount paid', `₹${booking.payment?.amountPaid ?? booking.amount}`),
    row('Reference', booking.bookingId),
  ].join('');

  const body = trial
    ? `<p style="font-size:13px;line-height:1.7;color:#4a5378;margin:18px 0 0">
         Your trial hour is booked and your payment is confirmed. Bring whatever
         you're stuck on — a CV, a decision, a shortlist — and we'll work on it.
       </p>`
    : `<p style="font-size:13px;line-height:1.7;color:#4a5378;margin:18px 0 0">
         You're enrolled and your payment is confirmed. Every <strong>Saturday</strong>
         is the group learning session and every <strong>Sunday</strong> is your 1:1
         time, for four weekends.
       </p>`;

  const footer = `${body}
    <p style="font-size:13px;line-height:1.7;color:#4a5378;margin:10px 0 0">
      ${joining} Any questions, just reply to this email.
    </p>`;

  return send({
    to: booking.email,
    replyTo: BOOKING_EMAIL,
    subject: trial
      ? `Confirmed — your trial hour on ${booking.dateLabel}`
      : `You're enrolled — Kanishka Creates weekend programme from ${booking.dateLabel}`,
    html: shell(trial ? 'Trial confirmed' : 'Enrolment confirmed', rows, footer),
  });
}

/** Tell the student their booking was cancelled and their seat released. */
export function sendBookingCancelled(booking) {
  const rows = [
    row(booking.kind === 'trial' ? 'Session' : 'Programme', booking.planLabel || booking.programme),
    row('Attending', booking.modeLabel),
    row(booking.kind === 'trial' ? 'Date' : 'Was starting', booking.dateLabel),
    row('Reference', booking.bookingId),
  ].join('');

  const footer = `
    <p style="font-size:13px;line-height:1.7;color:#4a5378;margin:18px 0 0">
      This booking has been cancelled and the seat released. If this wasn't what
      you expected, just reply to this email and we'll sort it out.
    </p>`;

  return send({
    to: booking.email,
    replyTo: BOOKING_EMAIL,
    subject: `Booking cancelled — ${booking.bookingId}`,
    html: shell('Booking cancelled', rows, footer),
  });
}

/** Contact / project enquiry from the main form. */
export function sendContactNotification(contact) {
  const rows = [
    row('Name', contact.name),
    row('Email', contact.email),
    contact.phone ? row('Phone', contact.phone) : '',
    contact.service ? row('Service', contact.service) : '',
    contact.budget ? row('Budget', contact.budget) : '',
  ].join('');

  const footer = `
    <p style="font-size:13px;color:#7b86a8;margin:18px 0 6px">Message</p>
    <div style="background:#f6f8fd;border:1px solid #e8ecf7;border-radius:10px;padding:14px;
                font-size:14px;line-height:1.7;color:#1f2547;white-space:pre-wrap">${esc(
                  contact.message
                )}</div>`;

  return send({
    to: BOOKING_EMAIL,
    replyTo: contact.email,
    subject: `New enquiry — ${contact.name}${contact.service ? ' · ' + contact.service : ''}`,
    html: shell('New website enquiry', rows, footer),
  });
}
