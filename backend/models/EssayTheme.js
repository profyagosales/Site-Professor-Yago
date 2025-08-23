const mongoose = require('mongoose');

const essayThemeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['ENEM', 'PAS'], required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('EssayTheme', essayThemeSchema, 'essay_themes');
