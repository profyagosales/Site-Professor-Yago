const mongoose = require('mongoose');
const { Schema } = mongoose;

const AICorrectionSuggestionSchema = new Schema({
  essayId: { type: Schema.Types.ObjectId, ref: 'Essay', required: true, index: true },
  teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, default: 'mock' },
  type: { type: String },
  hash: { type: String, index: true },
  generationMs: { type: Number },
  rawTextChars: { type: Number },
  sections: { type: Object },
  disclaimer: { type: String },
  appliedFeedback: { type: Boolean, default: false },
  appliedScores: { type: Boolean, default: false },
  appliedAt: { type: Date },
  appliedScoresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AICorrectionSuggestion', AICorrectionSuggestionSchema);
