const nodemailer = require('nodemailer');

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveTransportOptions() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    console.warn('[mailer] Missing SMTP credentials. Falling back to JSON transport.');
    return { jsonTransport: true };
  }

  const port = parseNumber(process.env.SMTP_PORT, 587);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? parseBoolean(process.env.SMTP_SECURE, false)
      : port === 465;

  const options = {
    host,
    port,
    secure,
    auth: { user, pass },
  };

  if (parseBoolean(process.env.SMTP_REQUIRE_TLS, false)) {
    options.requireTLS = true;
  }

  return options;
}

const transportOptions = resolveTransportOptions();
const transporter = nodemailer.createTransport(transportOptions);
const isJsonTransport = Boolean(transportOptions.jsonTransport);

async function verifyTransport() {
  try {
    await transporter.verify();
    console.log('[smtp] verify ok');
  } catch (err) {
    console.error('[smtp] verify failed', err);
  }
}

verifyTransport();

function normalizeRecipients(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  return [String(input).trim()].filter(Boolean);
}

async function sendMail({ to, bcc, subject, text, html } = {}) {
  const toList = normalizeRecipients(to);
  const bccList = normalizeRecipients(bcc);

  if (!toList.length && !bccList.length) {
    throw new Error('Nenhum destinatário informado');
  }

  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim();

  if (!from) {
    throw new Error('Remetente SMTP não configurado (SMTP_FROM)');
  }

  const mailOptions = {
    from,
    to: toList.length ? toList : undefined,
    bcc: bccList.length ? bccList : undefined,
    subject,
    text,
    html,
  };

  if (!mailOptions.to) {
    mailOptions.to = from;
  }

  const info = await transporter.sendMail(mailOptions);

  if (isJsonTransport) {
    console.log('[mailer] Captured email with JSON transport', {
      subject,
      to: mailOptions.to,
      bcc: mailOptions.bcc,
    });
  }

  return info;
}

module.exports = {
  transporter,
  sendMail,
};
