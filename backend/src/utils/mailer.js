const nodemailer = require('nodemailer');
const pool = require('../config/db');

// Transport is built lazily from env vars - never hard-code credentials.
// If SMTP env vars are missing (e.g. local dev without a mail account),
// emails are logged to the console instead of throwing, so the rest of the
// app keeps working.
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
  return transporter;
}

async function logNotification({ userId, type, recipient, subject, status, errorMessage }) {
  await pool.query(
    `INSERT INTO email_notifications (user_id, type, recipient, subject, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, recipient, subject, status, errorMessage || null]
  );
}

async function sendEmail({ userId, type, to, subject, html, attachments }) {
  const t = getTransporter();
  try {
    if (!t) {
      // Dev fallback: no SMTP configured, just log so the flow is still visible.
      console.log(`[mailer] (SMTP not configured, not sent) To: ${to} | Subject: ${subject}`);
      await logNotification({ userId, type, recipient: to, subject, status: 'failed', errorMessage: 'SMTP not configured' });
      return { sent: false };
    }

    await t.sendMail({
      from: process.env.EMAIL_FROM || 'TicketHub <no-reply@tickethub.com>',
      to,
      subject,
      html,
      attachments
    });
    await logNotification({ userId, type, recipient: to, subject, status: 'sent' });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] send failed:', err.message);
    await logNotification({ userId, type, recipient: to, subject, status: 'failed', errorMessage: err.message });
    return { sent: false, error: err.message };
  }
}

function bookingConfirmationHtml({ customerName, eventTitle, venueName, eventDate, eventTime, seatCodes, bookingReference, totalAmount }) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <div style="background:#1c1917; color:#fbbf24; padding: 20px; text-align:center;">
      <h1 style="margin:0; font-size: 22px;">TicketHub</h1>
      <p style="margin:4px 0 0; color:#fff;">Booking Confirmed 🎟️</p>
    </div>
    <div style="padding: 20px; color:#1f2937;">
      <p>Hi ${customerName},</p>
      <p>Your booking is confirmed. Here are your ticket details:</p>
      <table style="width:100%; border-collapse: collapse; font-size:14px;">
        <tr><td style="padding:6px 0; color:#6b7280;">Event</td><td style="text-align:right; font-weight:bold;">${eventTitle}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Venue</td><td style="text-align:right;">${venueName}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Date</td><td style="text-align:right;">${eventDate}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Time</td><td style="text-align:right;">${eventTime}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Seats</td><td style="text-align:right;">${seatCodes.join(', ')}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Total Paid</td><td style="text-align:right; font-weight:bold;">₹${totalAmount}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Booking Reference</td><td style="text-align:right; font-weight:bold;">${bookingReference}</td></tr>
      </table>
      <p style="text-align:center; margin-top: 20px;">Your QR ticket is attached below - present it at the venue.</p>
      <div style="text-align:center;">
        <img src="cid:qrcode" alt="QR ticket" style="width:180px; height:180px;" />
      </div>
    </div>
  </div>`;
}

function waitlistOfferHtml({ customerName, eventTitle, seatCategory, minutesRemaining, offerLink }) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <div style="background:#1c1917; color:#fbbf24; padding: 20px; text-align:center;">
      <h1 style="margin:0; font-size: 22px;">TicketHub</h1>
      <p style="margin:4px 0 0; color:#fff;">A seat just opened up!</p>
    </div>
    <div style="padding: 20px; color:#1f2937;">
      <p>Hi ${customerName},</p>
      <p>A <strong>${seatCategory}</strong> seat for <strong>${eventTitle}</strong> is now available for you, since you were on the waitlist.</p>
      <p>You have <strong>${minutesRemaining} minutes</strong> to complete your booking before the offer moves to the next person in line.</p>
      <p style="text-align:center; margin-top: 20px;">
        <a href="${offerLink}" style="background:#fbbf24; color:#1c1917; padding: 12px 24px; border-radius: 8px; text-decoration:none; font-weight:bold;">Complete Booking</a>
      </p>
    </div>
  </div>`;
}

module.exports = { sendEmail, bookingConfirmationHtml, waitlistOfferHtml };
