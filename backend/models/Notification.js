const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  runAt: { type: Date, required: true },
  targets: [{ type: String, required: true }],
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed'],
    default: 'scheduled'
  },
  nextRun: { type: Date }
});

module.exports = mongoose.model('Notification', notificationSchema);

