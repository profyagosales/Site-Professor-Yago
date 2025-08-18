const mongoose = require('mongoose');

const cadernoCheckSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: Date, required: true },
  description: { type: String },
  bimester: { type: Number, required: true },
  totalValue: { type: Number, required: true },
  students: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    done: { type: Boolean, default: false }
  }]
});

module.exports = mongoose.model('CadernoCheck', cadernoCheckSchema);
