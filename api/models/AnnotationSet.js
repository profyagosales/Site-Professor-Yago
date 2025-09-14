const mongoose = require('mongoose');

// Mantemos compatibilidade com valores antigos (ortografia, argumentacao, coesao, geral)
// mas normalizamos internamente para categorias canônicas usadas pelo frontend: 
// formal, grammar, argument, general, cohesion
const HighlightSchema = new mongoose.Schema({
  page: { type: Number, required: true },
  rects: [
    {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      w: { type: Number, required: true },
      h: { type: Number, required: true }
    }
  ],
  // cor livre (frontend envia rgba). Não usamos enum para permitir ajuste dinâmico de paleta.
  color: { type: String, required: true },
  // categoria armazenada já normalizada se possível
  category: { type: String, required: true },
  comment: { type: String, required: true },
  text: { type: String }, // trecho opcional futuro
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const AnnotationSetSchema = new mongoose.Schema({
  essayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Essay', required: true, unique: true },
  highlights: [HighlightSchema],
  // comentários gerais livres (se necessário no futuro)
  comments: [
    {
      text: { type: String, required: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  updatedAt: { type: Date, default: Date.now }
});

// Atualizar o timestamp de updatedAt
AnnotationSetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AnnotationSet', AnnotationSetSchema);
