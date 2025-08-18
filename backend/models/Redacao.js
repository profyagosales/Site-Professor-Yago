const mongoose = require('mongoose');

const redacaoSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  bimester: { type: Number, required: true },
  file: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  // Status da redação: "pendente" enquanto aguarda correção e "corrigida" após corrigida
  status: {
    type: String,
    enum: ['pendente', 'corrigida'],
    default: 'pendente'
  },
  correction: {
    NC: { type: Number },
    NE: { type: Number },
    NL: { type: Number },
    tipo: { type: String },
    finalScore: { type: Number },
    competencias: [{ type: Number }],
    anulacao: { type: String }
  },
  correctionPdf: { type: String }
});

module.exports = mongoose.model('Redacao', redacaoSchema);
