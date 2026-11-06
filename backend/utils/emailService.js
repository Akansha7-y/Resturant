import nodemailer from 'nodemailer';

let transporter = null;

function isPlaceholder(val) {
  if (!val) return true;
  return val.includes('your.email') || val.includes('your_16_char') || val.includes('example.com');
}

export function isEmailConfigured() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  return Boolean(user && pass && !isPlaceholder(user) && !isPlaceholder(pass));
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!isEmailConfigured()) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return transporter;
}

export async function sendOtpEmail(toEmail, otp, expiryMinutes) {
  const mailer = getTransporter();

  // If real email is not configured, simulate delivery via OTP server console
  if (!mailer) {
    console.log(`\n======================================================`);
    console.log(`🔑 [OTP SERVER (Local Mode)]`);
    console.log(`📨 Sent To:    ${toEmail}`);
    console.log(`🔢 OTP Code:   ${otp}`);
    console.log(`⏳ Valid For:  ${expiryMinutes} minutes`);
    console.log(`💡 Tip: Configure real SMTP in backend/.env to send real emails.`);
    console.log(`======================================================\n`);
    return { simulated: true, otp };
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await mailer.sendMail({
    from: `"L'Étoile Reserve" <${from}>`,
    to: toEmail,
    subject: "Your L'Étoile login OTP",
    text: `Your one-time password is ${otp}. It expires in ${expiryMinutes} minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #b8860b; margin-bottom: 8px;">L'Étoile Reserve</h2>
        <p style="color: #333;">Use this one-time password to sign in:</p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #111; margin: 24px 0;">${otp}</p>
        <p style="color: #666; font-size: 14px;">This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">If you did not request this, you can ignore this email.</p>
      </div>
    `
  });

  return { simulated: false, otp };
}
