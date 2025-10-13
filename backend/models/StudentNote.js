const { Schema, model } = require('mongoose');

const studentNoteSchema = new Schema(
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
    body: {
      type: String,
      required: true,
      trim: true,
    },
    visibleToStudent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

studentNoteSchema.index({ class: 1, student: 1, createdAt: -1 });

module.exports = model('StudentNote', studentNoteSchema);
