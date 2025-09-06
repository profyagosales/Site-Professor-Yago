const nodemailer = require('nodemailer');
const config = require('../config');

// Criar transporter para envio de emails
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465, // true para porta 465, false para outras portas
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass
  }
});

// Enviar email com anexo PDF
exports.sendEmailWithPdf = async (options) => {
  const { to, subject, text, html, pdfUrl, pdfBuffer, filename } = options;

  const mailOptions = {
    from: config.smtp.from,
    to,
    subject,
    text,
    html
  };

  // Anexar PDF se fornecido
  if (pdfUrl) {
    mailOptions.attachments = [
      {
        filename: filename || 'redacao-corrigida.pdf',
        path: pdfUrl
      }
    ];
  } else if (pdfBuffer) {
    mailOptions.attachments = [
      {
        filename: filename || 'redacao-corrigida.pdf',
        content: pdfBuffer
      }
    ];
  }

  return await transporter.sendMail(mailOptions);
};
