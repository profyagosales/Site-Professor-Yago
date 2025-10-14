const mongoose = require('mongoose');

const activitySubSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    dateISO: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const milestoneSubSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, required: true },
    dateISO: { type: String, trim: true },
  },
  { _id: true }
);

const noticeSubSchema = new mongoose.Schema(
  {
    message: { type: String, trim: true, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const { Types } = mongoose;

function toObjectId(value) {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  if (value && typeof value === 'object') {
    const candidate = value._id || value.id;
    if (typeof candidate === 'string' && Types.ObjectId.isValid(candidate)) {
      return new Types.ObjectId(candidate);
    }
    if (candidate instanceof Types.ObjectId) {
      return candidate;
    }
  }
  return undefined;
}

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
  teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
  responsibleTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  activities: { type: [activitySubSchema], default: [] },
  milestones: { type: [milestoneSubSchema], default: [] },
  notices: { type: [noticeSubSchema], default: [] },
});

classSchema.path('teachers').default(() => []);
classSchema.path('teacherIds').default(() => []);
classSchema.path('students').default(() => []);
classSchema.path('activities').default(() => []);
classSchema.path('milestones').default(() => []);
classSchema.path('notices').default(() => []);

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

  try {
    const collected = new Map();
    const push = (candidate) => {
      const objectId = toObjectId(candidate);
      if (!objectId) return;
      collected.set(String(objectId), objectId);
    };

    if (Array.isArray(this.teacherIds)) {
      this.teacherIds.forEach(push);
    }
    if (Array.isArray(this.teachers)) {
      this.teachers.forEach(push);
    }
    if (this.responsibleTeacherId) {
      push(this.responsibleTeacherId);
      const normalizedResponsible = toObjectId(this.responsibleTeacherId);
      this.responsibleTeacherId = normalizedResponsible || null;
    }

    const normalizedList = Array.from(collected.values());
    this.teacherIds = normalizedList;
    this.teachers = normalizedList;
  } catch (err) {
    console.warn('Failed to normalize teacherIds for class', this?._id, err);
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
