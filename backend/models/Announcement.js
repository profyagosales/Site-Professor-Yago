const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    extraEmails: [{ type: String }],
    scheduledFor: { type: Date, default: () => new Date() },
    scheduleAt: { type: Date, default: null },
    includeTeachers: { type: Boolean, default: false },
    targetType: {
      type: String,
      enum: ['class', 'email'],
      default: 'class',
    },
    targetValues: [{ type: String }],
    emailStatus: {
      type: String,
      enum: ['pending', 'scheduled', 'sent', 'failed'],
      default: 'pending',
    },
    emailSentAt: { type: Date, default: null },
    emailError: { type: String, default: null },
  },
  { timestamps: true }
);

announcementSchema.index({ teacher: 1, scheduledFor: -1 });
announcementSchema.index({ classIds: 1, scheduledFor: -1 });
announcementSchema.index({ scheduleAt: 1 });
announcementSchema.index({ emailStatus: 1 });

announcementSchema.pre('save', function syncSchedule(next) {
  if (this.scheduleAt && !this.scheduledFor) {
    this.scheduledFor = this.scheduleAt;
  } else if (this.scheduledFor && !this.scheduleAt) {
    this.scheduleAt = this.scheduledFor;
  }

  if (!this.scheduleAt) {
    this.scheduleAt = null;
  }
  if (!this.scheduledFor) {
    this.scheduledFor = this.scheduleAt || new Date();
  }

  if (!Array.isArray(this.classIds)) {
    this.classIds = [];
  }
  if (!Array.isArray(this.targetValues)) {
    this.targetValues = [];
  }
  if (!Array.isArray(this.extraEmails)) {
    this.extraEmails = [];
  }

  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);
