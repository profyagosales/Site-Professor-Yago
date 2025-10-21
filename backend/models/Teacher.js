const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

function resolveBcryptRounds() {
  const raw = process.env.BCRYPT_COST || process.env.BCRYPT_ROUNDS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isInteger(parsed) && parsed >= 8 && parsed <= 15) {
    return parsed;
  }
  return 12;
}

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    phone: { type: String },
    photoUrl: { type: String },
    role: { type: String, default: 'teacher', index: true },
    passwordHash: { type: String, required: true, select: false },
    // Mantém campo legacy apenas para leitura de registros antigos já persistidos.
    password: { type: String, select: false },
    subjects: { type: [String], default: [] },
    gradeSplitSettings: {
      defaultTerm: { type: Number, min: 1, max: 4 },
      updatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

async function ensurePasswordHash(doc) {
  const candidate = typeof doc.password === 'string' ? doc.password.trim() : '';
  if (!doc.passwordHash && candidate) {
    if (candidate.startsWith('$2')) {
      doc.passwordHash = candidate;
    } else {
      const saltRounds = resolveBcryptRounds();
      doc.passwordHash = await bcrypt.hash(candidate, saltRounds);
    }
    doc.password = undefined;
  }
  if (!doc.passwordHash) {
    throw new Error('Senha do professor é obrigatória.');
  }
}

teacherSchema.pre('validate', function(next) {
  if (!this.passwordHash && this.password && this.password.startsWith('$2')) {
    this.passwordHash = this.password;
    this.password = undefined;
  }
  next();
});

teacherSchema.pre('save', async function(next) {
  try {
    await ensurePasswordHash(this);
    next();
  } catch (err) {
    next(err);
  }
});

teacherSchema.methods.setPassword = async function setPassword(plainPassword) {
  const candidate = typeof plainPassword === 'string' ? plainPassword.trim() : '';
  if (!candidate) {
    throw new Error('Senha do professor é obrigatória.');
  }
  const saltRounds = resolveBcryptRounds();
  this.passwordHash = await bcrypt.hash(candidate, saltRounds);
  this.password = undefined;
};

teacherSchema.statics.hashPassword = async function hashPassword(plainPassword) {
  const candidate = typeof plainPassword === 'string' ? plainPassword.trim() : '';
  if (!candidate) {
    throw new Error('Senha do professor é obrigatória.');
  }
  const saltRounds = resolveBcryptRounds();
  return bcrypt.hash(candidate, saltRounds);
};

module.exports = mongoose.model('Teacher', teacherSchema);
