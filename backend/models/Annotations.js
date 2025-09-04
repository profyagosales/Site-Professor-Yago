const mongoose = require('mongoose');

const annotationsSchema = new mongoose.Schema({
  essayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Essay', unique: true },
  highlights: { type: Array, default: [] },
  comments: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Annotations', annotationsSchema, 'annotations');
