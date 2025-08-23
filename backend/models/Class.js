const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  series: { type: Number, required: true },
  letter: { type: String, required: true },
  discipline: { type: String, required: true },
  schedule: [
    {
      day: {
        type: String,
        enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      },
      slot: { type: Number, enum: [1, 2, 3] },
      time: { type: String },
    },
  ],
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

classSchema.virtual('scheduleSummary').get(function () {
  if (!this.schedule || this.schedule.length === 0) {
    return '';
  }
  return this.schedule.map(s => `${s.day}-${s.slot}`).join(', ');
});
module.exports = mongoose.model('Class', classSchema);
