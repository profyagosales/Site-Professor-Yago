const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  color: {
    type: String,
    enum: ['green', 'yellow', 'pink', 'blue', 'orange'],
    required: true
  },
  label: { type: String, required: true },
  comment: { type: String, required: true },
  selection: {
    start: Number,
    end: Number
  },
  bbox: {
    page: Number,
    x: Number,
    y: Number,
    w: Number,
    h: Number
  }
}, { _id: false });

const essaySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  type: { type: String, enum: ['ENEM', 'PAS'], required: true },
  themeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EssayTheme', default: null },
  customTheme: { type: String, default: null },
  bimester: { type: Number, enum: [1, 2, 3, 4], required: true },
  originalUrl: { type: String, required: true },
  correctedUrl: { type: String, default: null },
  // Data de submissão para consultas específicas; por padrão, usamos timestamps.createdAt,
  // mas expomos submittedAt para novos fluxos e índices compostos.
  submittedAt: { type: Date, default: Date.now },
  annulmentReason: {
    type: String,
    enum: [
      'IDENTIFICACAO',
      'DESENHOS',
      'SINAIS',
      'PARTE_DESCONECTADA',
      'COPIA_MOTIVADORES',
      'MENOS_7_LINHAS'
    ],
    default: null
  },
  rawScore: { type: Number, default: null },
  scaledScore: { type: Number, default: null },
  bimestreWeight: { type: Number, default: null },
  enemCompetencies: {
    c1: Number,
    c2: Number,
    c3: Number,
    c4: Number,
    c5: Number
  },
  pasBreakdown: {
    NC: Number,
    NE: Number,
    NL: Number
  },
  annotations: { type: [annotationSchema], default: [] },
  // Anotações ricas (novo annotator): normalizadas por página com coordenadas 0..1
  richAnnotations: {
    type: [new mongoose.Schema({
      id: { type: String },
      page: { type: Number }, // 1-based
      type: { type: String, enum: ['highlight', 'pen', 'box', 'strike', 'comment'] },
      createdAt: { type: String },
      updatedAt: { type: String },
      // highlight
      rects: [{ x: Number, y: Number, w: Number, h: Number }],
      opacity: { type: Number },
      color: { type: String },
      // pen
      points: [{ x: Number, y: Number }],
      width: { type: Number },
      // box
      rect: { x: Number, y: Number, w: Number, h: Number },
      strokeWidth: { type: Number },
      // strike
      from: { x: Number, y: Number },
      to: { x: Number, y: Number },
      // comment
      at: { x: Number, y: Number },
      text: { type: String }
    }, { _id: false })],
    default: []
  },
  status: { type: String, enum: ['PENDING', 'GRADED'], default: 'PENDING' },
  comments: { type: String, default: null }
}, { timestamps: true });

essaySchema.index({ studentId: 1 });
essaySchema.index({ classId: 1 });
essaySchema.index({ status: 1 });
essaySchema.index({ bimester: 1 });
essaySchema.index({ type: 1 });
essaySchema.index({ studentId: 1, submittedAt: -1 });

module.exports = mongoose.model('Essay', essaySchema, 'essays');
