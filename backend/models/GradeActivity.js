const { Schema, model } = require('mongoose');

const gradeActivitySchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', index: true, required: true },
    year: { type: Number, required: true },
    bimester: { type: Number, enum: [1, 2, 3, 4], required: true },
    label: { type: String, required: true, trim: true },
    value: { type: Number, min: 0, max: 10, required: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Teacher' },
  },
  { timestamps: true }
);

gradeActivitySchema.index({ classId: 1, year: 1, bimester: 1, order: 1 });
gradeActivitySchema.index({ classId: 1, year: 1, bimester: 1, active: 1 });

gradeActivitySchema.pre('save', function touchUpdatedAt(next) {
  if (!this.updatedAt) {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = model('GradeActivity', gradeActivitySchema);
