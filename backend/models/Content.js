const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    bimester: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    done: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Content', contentSchema);
