const mongoose = require('mongoose');

const AnnotationSchema = new mongoose.Schema({
  page: { type: Number, required: true },
  rects: [{
    x: Number,
    y: Number,
    w: Number,
    h: Number,
  }],
  color: { type: String, required: true },
  category: { type: String, required: true },
  comment: { type: String, default: '' },
  id: { type: String, required: true },
}, { _id: false });

const EssaySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['ENEM', 'PAS'], // Simplificado para ENEM | PAS no MVP
    required: true
  },
  bimester: {
    type: Number,
    min: 1,
    max: 4,
  },
  countInBimester: {
    type: Boolean,
    default: false
  },
  computedBimesterScore: { // Nota normalizada para o bimestre (derivada) armazenada para query rápida
    type: Number,
    min: 0
  },
  themeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theme'
  },
  themeText: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'GRADING', 'GRADED', 'SENT'],
    default: 'PENDING'
  },
  file: {
    originalUrl: { type: String, required: true },
    mime: { type: String, default: 'application/pdf' },
    size: { type: Number },
    pages: { type: Number }
  },
  enem: {
    c1: { type: Number, min: 0, max: 200 },
    c2: { type: Number, min: 0, max: 200 },
    c3: { type: Number, min: 0, max: 200 },
    c4: { type: Number, min: 0, max: 200 },
    c5: { type: Number, min: 0, max: 200 },
    rawScore: { type: Number, min: 0, max: 1000 }
  },
  pas: {
    NC: { type: Number, min: 0 },
    NE: { type: Number, min: 0 },
    NL: { type: Number, min: 0, default: 1 },
    rawScore: { type: Number, min: 0 }
  },
  annulment: {
    active: { type: Boolean, default: false },
    reasons: [String]
  },
  generalComments: {
    type: String,
    trim: true
  },
  annotations: [AnnotationSchema],
  correctedPdfUrl: {
    type: String
  },
  email: {
    lastSentAt: { type: Date }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validar que pelo menos themeId ou themeText esteja presente
EssaySchema.pre('validate', function(next) {
  if (!this.themeId && !this.themeText) {
    this.invalidate('themeId', 'É necessário fornecer um tema cadastrado ou um texto de tema não cadastrado');
  }
  next();
});

// Atualizar o timestamp de updatedAt
EssaySchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Se anulação ativa, força rawScore 0 (mantendo dados originais para auditoria futura se quisermos)
  if (this.annulment && this.annulment.active) {
    if (this.enem) {
      this.enem.rawScore = 0;
    }
    if (this.pas) {
      this.pas.rawScore = 0;
    }
  }

  // Calcular computedBimesterScore se countInBimester true
  if (this.countInBimester) {
    // Regras: ENEM rawScore 0-1000 -> proporcional a bimesterValue (TODO: armazenar valor do bimestre por configuração global)
    // PAS rawScore 0-10 -> proporcional
    // Como não temos ainda o valor alvo (ex: 2.0) guardado no schema, deixamos para pipeline posterior.
    // Placeholder: não calcular sem contexto de valor do bimestre. (Poderíamos ter um hook externo.)
  } else {
    this.computedBimesterScore = undefined;
  }
  next();
});

// Índices auxiliares para filtros comuns
EssaySchema.index({ status: 1, type: 1, bimester: 1 });
EssaySchema.index({ studentId: 1, status: 1 });
EssaySchema.index({ teacherId: 1, status: 1 });
EssaySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Essay', EssaySchema);
