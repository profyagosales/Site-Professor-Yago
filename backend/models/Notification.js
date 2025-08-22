const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  // null value means send immediately
  sendAt: { type: Date, default: null },
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  emails: [{ type: String }],
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed'],
    default: 'scheduled'
  },
  nextRun: { type: Date }
});

module.exports = mongoose.model('Notification', notificationSchema);

