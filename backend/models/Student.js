const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    rollNumber: { type: Number },
    phone: { type: String },
    passwordHash: { type: String, select: false },
    photo: { type: String },
  }
);

module.exports = mongoose.model('Student', studentSchema);
