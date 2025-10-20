const mongoose = require('mongoose');

const agendaItemSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    date: { type: Date, required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    type: { type: String, enum: ['ATIVIDADE', 'CONTEUDO', 'DATA'], required: true },
  },
  { timestamps: true }
);

agendaItemSchema.index({ teacherId: 1, date: 1 });

module.exports = mongoose.model('AgendaItem', agendaItemSchema);
