const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    evaluation: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation', required: false },
    bimester: { type: Number, required: true },
    score: { type: Number, required: true },
    correctedPdf: { type: String },
    status: {
      type: String,
      enum: ['pending', 'corrected'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Grade', gradeSchema);
