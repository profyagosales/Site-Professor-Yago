const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  subject: { type: String, trim: true },
  year: { type: Number },
  series: { type: Number, required: true },
  letter: { type: String, required: true },
  discipline: { type: String, required: true },
  schedule: [
    {
      day: {
        type: String,
        enum: ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'],
      },
      slot: { type: Number, enum: [1, 2, 3] },
      time: { type: String },
    },
  ],
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

classSchema.path('teachers').default(() => []);
classSchema.path('students').default(() => []);

classSchema.add({
  studentsCount: { type: Number, default: 0 }
});

classSchema.path('studentsCount').default(0);

function deriveSeriesLetter(name) {
  if (!name || typeof name !== 'string') return {};
  const trimmed = name.trim();
  if (!trimmed) return {};
  const numberMatch = trimmed.match(/^\d{1,2}/);
  if (numberMatch) {
    const seriesValue = Number(numberMatch[0]);
    const suffix = trimmed.slice(numberMatch[0].length).trim();
    const letterValue = suffix ? suffix[0].toUpperCase() : undefined;
    return {
      series: Number.isNaN(seriesValue) ? undefined : seriesValue,
      letter: letterValue,
    };
  }
  return {};
}

classSchema.pre('validate', function syncVirtuals(next) {
  if (!this.subject && this.discipline) {
    this.subject = this.discipline;
  }
  if (!this.discipline && this.subject) {
    this.discipline = this.subject;
  }

  if (this.name && (!this.series || !this.letter)) {
    const derived = deriveSeriesLetter(this.name);
    if (derived.series && !this.series) this.series = derived.series;
    if (derived.letter && !this.letter) this.letter = derived.letter;
  }

  if (!this.name && this.series && this.letter) {
    this.name = `${this.series}${this.letter}`;
  }

  next();
});

classSchema.virtual('scheduleSummary').get(function () {
  if (!this.schedule || this.schedule.length === 0) {
    return '';
  }
  return this.schedule.map(s => `${s.day}-${s.slot}`).join(', ');
});
module.exports = mongoose.model('Class', classSchema);
