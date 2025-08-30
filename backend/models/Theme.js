const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Case-insensitive unique index on name
if (!themeSchema.indexes().some(([fields]) => fields.name)) {
  themeSchema.index({ name: 1 }, { unique: true, collation: { locale: 'pt', strength: 2 } });
}

module.exports = mongoose.model('Theme', themeSchema, 'themes');
