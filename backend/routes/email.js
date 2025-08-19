const express = require('express');
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Student = require('../models/Student');
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

    const recipients = new Set();
    for (const item of to) {
      if (mongoose.Types.ObjectId.isValid(item)) {
        const cls = await Class.findById(item).lean();
        if (!cls) {
          return res.status(400).json({ message: `Class not found: ${item}` });
        }
        const students = await Student.find({ class: item }).select('email').lean();
        students.forEach(student => {
          if (student.email) {
            recipients.add(student.email);
          }
        });
      } else if (isEmail(item)) {
        recipients.add(item);
      } else {
        return res.status(400).json({ message: `Invalid recipient: ${item}` });
      }
    }

    await sendEmail({ to: Array.from(recipients), subject, html });
    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error sending email' });
  }
});

module.exports = router;
