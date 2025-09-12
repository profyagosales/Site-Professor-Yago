const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'O nome da turma é obrigatório.'],
    trim: true,
    unique: true,
  },
  year: {
    type: Number,
    required: [true, 'O ano da turma é obrigatório.'],
    default: () => new Date().getFullYear(),
  },
  school: {
    type: String,
    trim: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Class', ClassSchema);
