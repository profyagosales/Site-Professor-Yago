const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  rollNumber: { type: Number, required: true },
  photo: { type: Buffer }
});

module.exports = mongoose.model('Student', studentSchema);
