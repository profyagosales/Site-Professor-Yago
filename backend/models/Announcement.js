const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    extraEmails: [{ type: String }],
    scheduledFor: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

announcementSchema.index({ teacher: 1, scheduledFor: -1 });
announcementSchema.index({ classIds: 1, scheduledFor: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
