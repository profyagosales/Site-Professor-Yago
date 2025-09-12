const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['teacher', 'student'],
    required: true
  },
  photoUrl: {
    type: String,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  },
// Campos específicos para alunos
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: function() { return this.role === 'student'; }
  },
  // Campos específicos para professores
  // (adicionar campos se necessário no futuro)
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate para turmas
UserSchema.virtual('class', {
  ref: 'Class',
  localField: 'classId',
  foreignField: '_id',
  justOne: true
});

// Método para verificar senha
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Método para não retornar passwordHash nas queries
UserSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);
