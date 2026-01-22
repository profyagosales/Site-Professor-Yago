const mongoose = require('mongoose');

const gradeSchemeItemSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    label: { type: String, required: true, trim: true },
    points: { type: Number, required: true, min: 0 },
    type: { type: String, default: 'PROVA', trim: true },
    color: { type: String, default: '#EB7A28', trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const gradeSchemeSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    year: { type: Number, required: true },
    bimester: { type: Number, required: true, min: 1, max: 4 },
    items: { type: [gradeSchemeItemSchema], default: [] },
    totalPoints: { type: Number, default: 0 },
    showToStudents: { type: Boolean, default: false },
  },
  { timestamps: true }
);

gradeSchemeSchema.index({ classId: 1, year: 1, bimester: 1 }, { unique: true });

gradeSchemeSchema.pre('validate', function computeTotalPoints(next) {
  if (!Array.isArray(this.items)) {
    this.items = [];
  }

  this.items = this.items
    .map((item, index) => {
      const entry = item || {};
      const rawName = typeof entry.name === 'string' ? entry.name.trim() : '';
      const rawLabel = typeof entry.label === 'string' ? entry.label.trim() : '';
      const name = rawName || rawLabel;
      const label = rawLabel || name;
      const normalized = {
        name,
        label,
        points: Number.isFinite(entry.points) ? entry.points : Number(entry.points) || 0,
        type:
          typeof entry.type === 'string' && entry.type.trim()
            ? entry.type.trim().toUpperCase()
            : 'PROVA',
        color: typeof entry.color === 'string' && entry.color.trim() ? entry.color.trim() : '#EB7A28',
        order:
          typeof entry.order === 'number'
            ? entry.order
            : Number.isFinite(Number(entry.order))
              ? Number(entry.order)
              : index,
      };
      if (normalized.points < 0) {
        normalized.points = 0;
      }
      if (!normalized.label && normalized.name) {
        normalized.label = normalized.name;
      }
      if (!normalized.name && normalized.label) {
        normalized.name = normalized.label;
      }
      return normalized;
    })
    .sort((a, b) => a.order - b.order);

  const total = this.items.reduce((sum, item) => {
    const value = Number(item.points);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  const roundedTotal = Number(total.toFixed(1));
  this.totalPoints = roundedTotal;

  // Permitir salvar parcial (< 10); apenas bloquear quando ultrapassar 10
  if (roundedTotal > 10.001) {
    const error = new Error('Total de pontos não pode ultrapassar 10.');
    error.status = 400;
    return next(error);
  }

  return next();
});

module.exports = mongoose.model('GradeScheme', gradeSchemeSchema);
