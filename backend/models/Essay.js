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
  status: { type: String, enum: ['PENDING', 'GRADED'], default: 'PENDING' },
  comments: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Essay', essaySchema, 'essays');
