const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true, min: 0, max: 10 },
  bimester: { type: Number, required: true },
  classes: [
    {
      classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
      date: { type: Date, required: true }
    }
  ],
  answerKey: [{ type: String }],
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

