const { Schema, model } = require('mongoose');

const studentActivityGradeSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', index: true, required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', index: true, required: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'GradeActivity', index: true, required: true },
    points: { type: Number, min: 0, max: 10, required: true },
    gradedAt: { type: Date, default: Date.now },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'Teacher' },
  },
  { timestamps: true }
);

studentActivityGradeSchema.index(
  { classId: 1, studentId: 1, activityId: 1 },
  { unique: true }
);

module.exports = model('StudentActivityGrade', studentActivityGradeSchema);
