const mongoose = require('mongoose');

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
    enum: ['ENEM', 'PAS'],
    required: true
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
    enum: ['PENDING', 'GRADING', 'GRADED'],
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
  next();
});

module.exports = mongoose.model('Essay', EssaySchema);
