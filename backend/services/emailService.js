const { transporter, sendMail } = require('./mailer');

async function sendEmail(options) {
  return sendMail(options);
}

module.exports = {
  transporter,
  sendEmail,
  sendMail,
};
