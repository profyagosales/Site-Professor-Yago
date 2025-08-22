const mongoose = require('mongoose');

const cadernoCheckSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: Date, required: true },
  title: { type: String },
  term: { type: Number, required: true },
  presentStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

module.exports = mongoose.model('CadernoCheck', cadernoCheckSchema);
