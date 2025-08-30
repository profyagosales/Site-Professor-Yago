const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

async function createTransporter() {
  if (transporter) {
    return transporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    NODE_ENV,
    ZOHO_HOST,
    ZOHO_PORT,
    ZOHO_USER,
    ZOHO_PASS
  } = process.env;

  const host = SMTP_HOST || ZOHO_HOST;
  const port = SMTP_PORT || ZOHO_PORT;
  const user = SMTP_USER || ZOHO_USER;
  const pass = SMTP_PASS || ZOHO_PASS;

  if (host && port && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass
      }
    });
  } else if (NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    console.log('Usando conta de teste Ethereal:', testAccount.user);
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } else {
    throw new Error('Configuração SMTP ausente');
  }

  return transporter;
}

async function sendEmail({ to, subject, html, attachments } = {}) {
  const transport = await createTransporter();

  const mailOptions = {
    from:
      process.env.SMTP_FROM ||
      process.env.ZOHO_FROM ||
      (transport.options.auth && transport.options.auth.user),
    to,
    subject,
    html,
    attachments
  };

  const info = await transport.sendMail(mailOptions);

  if (transport.options.host === 'smtp.ethereal.email') {
    console.log('URL de visualização: ' + nodemailer.getTestMessageUrl(info));
  }

  return info;
}

module.exports = { sendEmail };

