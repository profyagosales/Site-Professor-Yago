const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    photoUrl: { type: String },
    role: { type: String, default: 'teacher', index: true },
    password: { type: String, required: true },
    subjects: { type: [String], default: [] },
  },
  { timestamps: true }
);

teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('Teacher', teacherSchema);
