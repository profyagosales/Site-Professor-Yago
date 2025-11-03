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
  },
  // Ordem global (#n) opcional; será preenchida pelo controller se ausente
  number: { type: Number, default: null }
}, { _id: false });

const STATUS = ['pending', 'processing', 'ready', 'graded', 'failed'];

const essaySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  type: { type: String, enum: ['ENEM', 'PAS'], required: true },
  themeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EssayTheme', default: null },
  customTheme: { type: String, default: null },
  bimester: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: null,
    required() {
      return this.type === 'PAS';
    },
  },
  originalUrl: { type: String, required: true },
  // MimeType original do arquivo (ajuda a decidir viewer inline)
  originalMimeType: { type: String, default: null },
  correctedUrl: { type: String, default: null },
  correctionPdf: { type: String, default: null },
  correctionPdfPublicId: { type: String, default: null },
  // Sinalização explícita de correção e data da correção (para mover de Pendentes → Corrigidas)
  isCorrected: { type: Boolean, default: false },
  correctedAt: { type: Date, default: null },
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
  annulReasons: {
    type: [String],
    default: []
  },
  annulOtherReason: {
    type: String,
    default: null
  },
  rawScore: { type: Number, default: null },
  scaledScore: { type: Number, default: null },
  bimestreWeight: { type: Number, default: null },
  countInBimestral: { type: Boolean, default: false },
  bimestralPointsValue: { type: Number, default: null },
  bimestralComputedScore: { type: Number, default: null },
  enemCompetencies: {
    c1: Number,
    c2: Number,
    c3: Number,
    c4: Number,
    c5: Number
  },
  enemRubric: {
    type: new mongoose.Schema({
      C1: { level: { type: Number }, reasonIds: [{ type: String }] },
      C2: { level: { type: Number }, reasonIds: [{ type: String }] },
      C3: { level: { type: Number }, reasonIds: [{ type: String }] },
      C4: { level: { type: Number }, reasonIds: [{ type: String }] },
      C5: { level: { type: Number }, reasonIds: [{ type: String }] },
    }, { _id: false }),
    default: undefined
  },
  pasBreakdown: {
    apresentacao: { type: Number, default: null },
    argumentacao: { type: Number, default: null },
    adequacao: { type: Number, default: null },
    coesao: { type: Number, default: null },
    NC: { type: Number, default: null },
    NL: { type: Number, default: null },
    TL: { type: Number, default: null },
    NE: { type: Number, default: null },
    descontoPorErro: { type: Number, default: null },
    NR: { type: Number, default: null },
    erros: {
      grafia: { type: Number, default: null },
      pontuacao: { type: Number, default: null },
      propriedade: { type: Number, default: null },
      observacao: { type: String, default: null },
    },
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
      // Ordem global (#n); definida no backend ao normalizar
      number: { type: Number, default: null },
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
  // Informações de e-mail de correção
  email: {
    lastSentAt: { type: Date, default: null }
  },
  status: {
    type: String,
    enum: STATUS,
    default: 'pending',
    set: (v) => String(v || 'pending').toLowerCase()
  },
  comments: { type: String, default: null }
}, { timestamps: true });

essaySchema.index({ studentId: 1 });
essaySchema.index({ classId: 1 });
essaySchema.index({ status: 1 });
essaySchema.index({ bimester: 1 });
essaySchema.index({ type: 1 });
essaySchema.index({ studentId: 1, submittedAt: -1 });
essaySchema.index({ isCorrected: 1, correctedAt: -1 });

module.exports = mongoose.model('Essay', essaySchema, 'essays');
