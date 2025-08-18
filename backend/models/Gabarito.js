const mongoose = require('mongoose');

const gabaritoSchema = new mongoose.Schema({
  evaluation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evaluation',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  // Path to the generated PDF for this gabarito
  pdfPath: { type: String, required: true },
  // Total value of the evaluation this gabarito belongs to
  totalValue: { type: Number, required: true },
  header: {
    schoolName: { type: String },
    discipline: { type: String },
    teacher: { type: String },
    logos: [{ type: String }]
  },
  instructions: { type: String },
  questionCount: { type: Number, required: true },
  answerKey: [{ type: String }]
});

module.exports = mongoose.model('Gabarito', gabaritoSchema);
