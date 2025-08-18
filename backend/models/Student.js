const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const studentSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  rollNumber: { type: Number, required: true },
  photo: { type: String },
  phone: { type: String },
  password: { type: String, required: true }
});

studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('Student', studentSchema);
