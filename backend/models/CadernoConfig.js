const mongoose = require('mongoose');

const cadernoConfigSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', unique: true, required: true },
  totals: { type: Map, of: Number, default: {} }
});

module.exports = mongoose.model('CadernoConfig', cadernoConfigSchema);
