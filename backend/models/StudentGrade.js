const { Schema, model } = require('mongoose');

const STATUS_VALUES = ['FREQUENTE', 'INFREQUENTE', 'TRANSFERIDO', 'ABANDONO'];

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
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'FREQUENTE',
    },
  },
  {
    timestamps: true,
  }
);

studentGradeSchema.index({ class: 1, student: 1, year: 1, term: 1 }, { unique: true });

const StudentGrade = model('StudentGrade', studentGradeSchema);

StudentGrade.STATUS_VALUES = STATUS_VALUES;

module.exports = StudentGrade;
