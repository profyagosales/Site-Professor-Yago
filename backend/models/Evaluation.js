const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  type: { type: String, required: true },
  totalValue: { type: Number, required: true },
  bimester: { type: Number, required: true },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  numQuestions: { type: Number, required: true },
  questionValue: { type: Number, required: true },
  answerKey: [{ type: String }],
  applicationDate: { type: Date, required: true },
  gabaritos: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Gabarito' }],
    default: []
  },
  grades: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grade' }],
    default: []
  }
});

module.exports = mongoose.model('Evaluation', evaluationSchema);

