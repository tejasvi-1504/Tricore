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
      from: process.env.SMTP_FROM || `Krevol <${process.env.SMTP_USER}>`,
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
        <div style="color:#fff;font-size:19px;font-weight:700;letter-spacing:.3px">Krevol</div>
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

/** Notify Krevol that a slot was booked. */
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

/** Confirm to the student that their slot is held. */
export function sendBookingConfirmation(booking) {
  const rows = [
    row('Programme', booking.programme),
    row('Attending', booking.modeLabel),
    row('Starts', booking.dateLabel),
    row('Ends', booking.endDateLabel),
    row('Reference', booking.bookingId),
  ].join('');

  const online = booking.mode === 'online';
  const footer = `
    <p style="font-size:13px;line-height:1.7;color:#4a5378;margin:18px 0 0">
      You're enrolled. Every <strong>Saturday</strong> is the group learning session
      and every <strong>Sunday</strong> is your 1:1 time, for four weekends.
    </p>
    <p style="font-size:13px;line-height:1.7;color:#4a5378;margin:10px 0 0">
      ${online
        ? 'We will send the joining link on WhatsApp and email before the first session.'
        : 'We will send the Meerut venue details and directions on WhatsApp before the first session.'}
      Any questions, just reply to this email.
    </p>`;

  return send({
    to: booking.email,
    replyTo: BOOKING_EMAIL,
    subject: `You're enrolled — Krevol weekend programme from ${booking.dateLabel}`,
    html: shell('Enrolment confirmed', rows, footer),
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
