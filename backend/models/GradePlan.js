const mongoose = require('mongoose');

const { Schema, Types } = mongoose;

function coercePoints(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  if (number > 10) return Number(number.toFixed(2));
  return Number(number.toFixed(2));
}

const termActivitySchema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new Types.ObjectId(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    points: {
      type: Number,
      required: true,
      default: 0,
      set: coercePoints,
    },
  },
  {
    _id: true,
    id: false,
  }
);

const termsSchema = new Schema(
  {
    '1': {
      type: [termActivitySchema],
      default: undefined,
    },
    '2': {
      type: [termActivitySchema],
      default: undefined,
    },
    '3': {
      type: [termActivitySchema],
      default: undefined,
    },
    '4': {
      type: [termActivitySchema],
      default: undefined,
    },
  },
  {
    _id: false,
    minimize: false,
  }
);

const gradePlanSchema = new Schema(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    terms: {
      type: termsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

gradePlanSchema.index(
  { classId: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model('GradePlan', gradePlanSchema);
