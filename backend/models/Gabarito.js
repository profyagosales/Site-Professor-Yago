const mongoose = require('mongoose');

const gabaritoSchema = new mongoose.Schema({
  evaluation: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation', required: true },
  header: {
    schoolName: { type: String },
    discipline: { type: String },
    teacher: { type: String },
    logos: [{ type: String }]
  },
  instructions: { type: String },
  questionCount: { type: Number, required: true },
  correctAnswers: [{ type: String, required: true }]
});

module.exports = mongoose.model('Gabarito', gabaritoSchema);
