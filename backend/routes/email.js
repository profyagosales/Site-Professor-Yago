const express = require('express');
const mongoose = require('mongoose');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

function isEmail(value) {
  return typeof value === 'string' && /\S+@\S+\.\S+/.test(value);
}

router.post('/send', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    if (!Array.isArray(to)) {
      return res.status(400).json({ message: '"to" must be an array' });
    }
    const valid = to.every(item => isEmail(item) || mongoose.Types.ObjectId.isValid(item));
    if (!valid) {
      return res.status(400).json({ message: 'Each recipient must be an email or class identifier' });
    }
    await sendEmail({ to, subject, html });
    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error sending email' });
  }
});

module.exports = router;
