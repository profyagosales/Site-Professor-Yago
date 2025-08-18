const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  type: { type: String, required: true },
  totalValue: { type: Number, required: true },
  bimester: { type: Number, required: true },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  answerKey: [{ type: String }],
  questionValue: { type: Number, required: true },
  applicationDate: { type: Date, required: true }
});

module.exports = mongoose.model('Evaluation', evaluationSchema);
