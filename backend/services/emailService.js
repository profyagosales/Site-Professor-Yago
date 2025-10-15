const nodemailer = require('nodemailer');
require('dotenv').config();

const DEFAULT_PORT = 465;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_GREETING_TIMEOUT = 20000;

function parseBoolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function resolveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolvePort() {
  return resolveNumber(process.env.SMTP_PORT, DEFAULT_PORT);
}

function resolveSecure(port) {
  if (process.env.SMTP_SECURE !== undefined) {
    return parseBoolean(process.env.SMTP_SECURE, port === 465);
  }
  return port === 465;
}

function buildTransportOptions() {
  const host = process.env.SMTP_HOST ? String(process.env.SMTP_HOST).trim() : '';
  const user = process.env.SMTP_USER ? String(process.env.SMTP_USER).trim() : '';
  const pass = process.env.SMTP_PASS ? String(process.env.SMTP_PASS).trim() : '';

  if (!host || !user || !pass) {
    console.warn('[email] SMTP credentials missing – using JSON transport for outgoing mail.');
    return { jsonTransport: true }; // Stub transport keeps feature working in dev/test environments.
  }

  const port = resolvePort();
  const secure = resolveSecure(port);

  const transportOptions = {
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: resolveNumber(process.env.SMTP_CONNECTION_TIMEOUT, DEFAULT_TIMEOUT),
    greetingTimeout: resolveNumber(process.env.SMTP_GREETING_TIMEOUT, DEFAULT_GREETING_TIMEOUT),
    socketTimeout: resolveNumber(process.env.SMTP_SOCKET_TIMEOUT, DEFAULT_TIMEOUT),
  };

  const tlsOptions = {};
  const minVersion = process.env.SMTP_TLS_MIN_VERSION || 'TLSv1.2';
  if (minVersion) {
    tlsOptions.minVersion = minVersion;
  }
  if (parseBoolean(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, true) === false) {
    tlsOptions.rejectUnauthorized = false;
  }
  if (process.env.SMTP_TLS_CIPHERS) {
    tlsOptions.ciphers = process.env.SMTP_TLS_CIPHERS;
  }
  if (Object.keys(tlsOptions).length > 0) {
    transportOptions.tls = tlsOptions;
  }

  if (parseBoolean(process.env.SMTP_IGNORE_TLS, false)) {
    transportOptions.ignoreTLS = true;
  }
  if (parseBoolean(process.env.SMTP_REQUIRE_TLS, false)) {
    transportOptions.requireTLS = true;
  }
  if (process.env.SMTP_NAME) {
    transportOptions.name = process.env.SMTP_NAME;
  }

  return transportOptions;
}

const transportOptions = buildTransportOptions();
const transporter = nodemailer.createTransport(transportOptions);
const isStubTransport = Boolean(transportOptions.jsonTransport);

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

  const info = await transporter.sendMail(mailOptions);

  if (isStubTransport) {
    console.log('[email] Captured email via JSON transport:', {
      subject: mailOptions.subject,
      to: mailOptions.to,
      bcc: mailOptions.bcc,
      replyTo: mailOptions.replyTo,
    });
  }

  return info;
}

module.exports = { transporter, sendEmail };

