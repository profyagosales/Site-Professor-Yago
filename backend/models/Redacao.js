const mongoose = require('mongoose');

const competenciaSchema = new mongoose.Schema(
  {
    pontuacao: { type: Number },
    comentario: { type: String }
  },
  { _id: false }
);

const redacaoSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  bimester: { type: Number, required: true },
  type: { type: String, enum: ['PAS/UnB', 'ENEM'], required: true },
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
    competencias: {
      type: [competenciaSchema],
      validate: {
        validator: function (v) {
          return !v || v.length === 5;
        },
        message: 'competencias deve conter 5 itens'
      }
    },
    anulacao: { type: String },
    finalScore: { type: Number },
    generalComment: { type: String }
  },
  correctionPdf: { type: String }
});

module.exports = mongoose.model('Redacao', redacaoSchema);
