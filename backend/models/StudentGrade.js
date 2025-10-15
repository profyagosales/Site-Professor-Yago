const { Schema, model } = require('mongoose');

const STATUS_VALUES = ['FREQUENTE', 'INFREQUENTE', 'TRANSFERIDO', 'ABANDONO'];

const gradeActivitySnapshotSchema = new Schema(
  {
    activity: {
      type: Schema.Types.ObjectId,
      ref: 'GradeActivity',
      required: true,
    },
    activityTitle: {
      type: String,
      required: true,
      trim: true,
    },
    activityKind: {
      type: String,
      default: 'ATIVIDADE',
      trim: true,
    },
    activityDate: {
      type: Date,
      required: false,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    maxScore: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const studentGradeSchema = new Schema(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: 3000,
    },
    term: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
      default: 0,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'FREQUENTE',
    },
    activities: {
      type: [gradeActivitySnapshotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

studentGradeSchema.index({ class: 1, student: 1, year: 1, term: 1 }, { unique: true });

studentGradeSchema.methods.recalculateScore = function recalculateScore() {
  if (!Array.isArray(this.activities) || this.activities.length === 0) {
    this.score = Math.max(0, Math.min(10, Number(this.score) || 0));
    return this.score;
  }
  const total = this.activities.reduce((acc, entry) => {
    const score = Number(entry?.score || 0);
    return acc + (Number.isFinite(score) ? score : 0);
  }, 0);
  const clamped = Math.max(0, Math.min(10, Number.isFinite(total) ? total : 0));
  this.score = clamped;
  return clamped;
};

studentGradeSchema.methods.replaceActivityScore = function replaceActivityScore(snapshot) {
  if (!snapshot || !snapshot.activity) {
    return;
  }
  const index = this.activities.findIndex((entry) => String(entry.activity) === String(snapshot.activity));
  if (index >= 0) {
    this.activities[index] = { ...this.activities[index].toObject?.(), ...snapshot };
  } else {
    this.activities.push(snapshot);
  }
  this.recalculateScore();
};

const StudentGrade = model('StudentGrade', studentGradeSchema);

StudentGrade.STATUS_VALUES = STATUS_VALUES;

module.exports = StudentGrade;
