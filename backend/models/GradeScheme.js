const mongoose = require('mongoose');

const gradeSchemeItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    points: { type: Number, required: true, min: 0 },
    color: { type: String, default: null, trim: true },
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
      const normalized = {
        label: typeof entry.label === 'string' ? entry.label.trim() : '',
        points: Number.isFinite(entry.points) ? entry.points : Number(entry.points) || 0,
        color: typeof entry.color === 'string' && entry.color.trim() ? entry.color.trim() : null,
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
      return normalized;
    })
    .sort((a, b) => a.order - b.order);

  const total = this.items.reduce((sum, item) => {
    const value = Number(item.points);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  const roundedTotal = Number(total.toFixed(2));
  this.totalPoints = roundedTotal;

  if (roundedTotal > 10 + Number.EPSILON) {
    const error = new Error('Total de pontos deve ser no máximo 10.');
    error.status = 400;
    return next(error);
  }

  return next();
});

module.exports = mongoose.model('GradeScheme', gradeSchemeSchema);
