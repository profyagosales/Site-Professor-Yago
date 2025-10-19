const mongoose = require('mongoose');

const { Schema, Types } = mongoose;

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  if (number > 10) return Number(number.toFixed(2));
  return Number(number.toFixed(2));
}

const scoreSchema = new Schema(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    term: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
      index: true,
    },
    activityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      default: () => new Types.ObjectId(),
    },
    score: {
      type: Number,
      required: true,
      default: 0,
      set: clampScore,
    },
  },
  {
    timestamps: true,
  }
);

scoreSchema.index(
  { classId: 1, studentId: 1, year: 1, term: 1, activityId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Score', scoreSchema);
