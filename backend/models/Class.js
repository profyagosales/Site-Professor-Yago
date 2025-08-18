const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  series: { type: Number, required: true },
  letter: { type: String, required: true },
  discipline: { type: String, required: true },
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

module.exports = mongoose.model('Class', classSchema);
