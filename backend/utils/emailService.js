import { BrevoClient } from '@getbrevo/brevo';
import nodemailer from 'nodemailer';

let brevoClient = null;
let smtpTransporter = null;

function isPlaceholder(val) {
  if (!val) return true;
  return (
    val.includes('YOUR_') ||
    val.includes('your.email') ||
    val.includes('your_16_char') ||
    val.includes('example.com')
  );
}

export function isEmailConfigured() {
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey && !isPlaceholder(brevoKey)) return true;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  return Boolean(user && pass && !isPlaceholder(user) && !isPlaceholder(pass));
}

export function getBrevoClient() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || isPlaceholder(apiKey)) {
    return null;
  }

  if (!brevoClient) {
    brevoClient = new BrevoClient({
      apiKey
    });
  }

  return brevoClient;
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;

  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass || isPlaceholder(user) || isPlaceholder(pass)) {
    return null;
  }

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return smtpTransporter;
}

/**
 * Send an email via Brevo API (preferred) with fallback to SMTP
 */
export async function sendEmail({ to, subject, html, text }) {
  const brevo = getBrevoClient();

  if (brevo) {
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || 'no-reply@etoile-reserve.com';
    const senderName = process.env.BREVO_SENDER_NAME || "L'Étoile Reserve";

    const toRecipients = Array.isArray(to)
      ? to.map(r => (typeof r === 'string' ? { email: r } : r))
      : [{ email: to }];

    const response = await brevo.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent: html,
      textContent: text,
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: toRecipients
    });

    return { success: true, messageId: response.messageId, provider: 'brevo' };
  }

  // Fallback to SMTP if configured
  const mailer = getSmtpTransporter();
  if (mailer) {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const info = await mailer.sendMail({
      from: `"${process.env.BREVO_SENDER_NAME || "L'Étoile Reserve"}" <${from}>`,
      to,
      subject,
      text,
      html
    });
    return { success: true, messageId: info.messageId, provider: 'smtp' };
  }

  return null;
}

/**
 * Send an OTP code to a user's email address
 */
export async function sendOtpEmail(toEmail, otp, expiryMinutes) {
  const subject = "Your L'Étoile login OTP";
  const text = `Your one-time password is ${otp}. It expires in ${expiryMinutes} minutes. Do not share this code with anyone.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #b8860b; margin-bottom: 8px;">L'Étoile Reserve</h2>
      <p style="color: #333;">Use this one-time password to sign in:</p>
      <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #111; margin: 24px 0;">${otp}</p>
      <p style="color: #666; font-size: 14px;">This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
      <p style="color: #999; font-size: 12px;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  // If no email service is configured, simulate delivery via OTP server console
  if (!isEmailConfigured()) {
    console.log(`\n======================================================`);
    console.log(`🔑 [OTP SERVER (Local Mode)]`);
    console.log(`📨 Sent To:    ${toEmail}`);
    console.log(`🔢 OTP Code:   ${otp}`);
    console.log(`⏳ Valid For:  ${expiryMinutes} minutes`);
    console.log(`💡 Tip: Set BREVO_API_KEY and BREVO_SENDER_EMAIL in backend/.env to send via Brevo.`);
    console.log(`======================================================\n`);
    return { simulated: true, otp };
  }

  const result = await sendEmail({ to: toEmail, subject, html, text });
  return { simulated: false, otp, messageId: result?.messageId };
}
