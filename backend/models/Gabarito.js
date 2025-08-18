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
  header: {
    schoolName: { type: String },
    discipline: { type: String },
    teacher: { type: String },
    logos: [{ type: String }]
  },
  instructions: { type: String },
  questionCount: { type: Number, required: true },
  totalValue: { type: Number, required: true },
  answerKey: [{ type: String }],
  pdfPath: { type: String, required: true }
});

module.exports = mongoose.model('Gabarito', gabaritoSchema);
