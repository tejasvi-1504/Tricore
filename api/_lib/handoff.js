/**
 * Manual booking handoff.
 *
 * While PAYMENT_MODE is 'manual' there is no gateway in the loop: the booking
 * is stored as `awaiting_confirmation`, and the student is handed a WhatsApp
 * link pre-filled with everything Kanishka Creates needs to confirm and collect payment
 * by hand. Flip PAYMENT_MODE to 'cashfree' once the volume justifies it and
 * the same booking goes down the gateway path instead.
 */
import { whatsappNumber } from './availability.js';

/** Build the message the student sends to book. Plain text — WhatsApp has no markup. */
export function bookingMessage(b) {
  const lines = [
    `Hi Kanishka Creates, I'd like to book a session.`,
    ``,
    `Plan: ${b.planLabel} — ₹${b.amount}`,
    `Attending: ${b.modeLabel}`,
  ];

  if (b.kind === 'trial') {
    lines.push(`Date: ${b.dateLabel}`, `Time: ${b.timeLabel} IST (1 hour)`);
  } else {
    lines.push(`Starts: ${b.dateLabel}`);
    if (b.scheduling === 'daily' || b.needsTime) {
      lines.push(`Weekly time: ${b.timeLabel} IST`);
    }
    lines.push(`Ends: ${b.endDateLabel}`);
  }

  lines.push(
    ``,
    `Name: ${b.name}`,
    `Email: ${b.email}`,
    `Phone: ${b.phone}`
  );
  if (b.college) lines.push(`College: ${b.college}`);
  if (b.year) lines.push(`Year: ${b.year}`);
  if (b.topic) lines.push(``, `What I want help with:`, b.topic);

  lines.push(``, `Reference: ${b.bookingId}`);
  return lines.join('\n');
}

/** wa.me link carrying that message. */
export function bookingWhatsappUrl(booking) {
  return `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(bookingMessage(booking))}`;
}
