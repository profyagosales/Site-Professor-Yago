const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

async function createTransporter() {
  if (transporter) {
    return transporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NODE_ENV } = process.env;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
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
    from: process.env.SMTP_FROM || (transport.options.auth && transport.options.auth.user),
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

