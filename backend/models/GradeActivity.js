const { Schema, model } = require('mongoose');

const gradeActivitySchema = new Schema(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: 3000,
      index: true,
    },
    term: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    maxScore: {
      type: Number,
      min: 0,
      max: 10,
      default() {
        return this.weight;
      },
    },
    kind: {
      type: String,
      default: 'ATIVIDADE',
      trim: true,
    },
    dueDate: {
      type: Date,
      required: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: false,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: false,
    },
    archivedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

gradeActivitySchema.index({ class: 1, year: 1, term: 1, order: 1 });

module.exports = model('GradeActivity', gradeActivitySchema);
