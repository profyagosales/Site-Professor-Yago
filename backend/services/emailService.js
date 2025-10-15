const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  requireTLS: true,
  tls: { minVersion: 'TLSv1.2' },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  family: process.env.SMTP_FAMILY ? Number(process.env.SMTP_FAMILY) : undefined,
});

async function sendEmail({ to, bcc, subject, html, text, attachments, replyTo } = {}) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  const bccRecipients = Array.isArray(bcc) ? bcc.filter(Boolean) : bcc ? [bcc] : [];

  if (!recipients.length && !bccRecipients.length) {
    throw new Error('Nenhum destinatário informado');
  }

  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER;

  const mailOptions = {
    from: fromAddress,
    to: recipients.length ? recipients : undefined,
    bcc: bccRecipients.length ? bccRecipients : undefined,
    subject,
    html,
    text,
    attachments,
    replyTo: replyTo || process.env.EMAIL_REPLY_TO || process.env.SMTP_USER,
  };

  if (!mailOptions.to) {
    mailOptions.to = fromAddress;
  }

  return transporter.sendMail(mailOptions);
}

module.exports = { transporter, sendEmail };

