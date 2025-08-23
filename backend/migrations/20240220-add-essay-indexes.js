const mongoose = require('mongoose');
const Essay = require('../models/Essay');

async function ensureIndexes() {
  await Essay.collection.createIndexes([
    { key: { studentId: 1 } },
    { key: { classId: 1 } },
    { key: { status: 1 } },
    { key: { bimester: 1 } },
    { key: { type: 1 } },
  ]);
}

async function initDefaults() {
  const defaults = {
    teacherId: null,
    themeId: null,
    customTheme: null,
    correctedUrl: null,
    annulmentReason: null,
    rawScore: null,
    scaledScore: null,
    bimestreWeight: null,
    enemCompetencies: { c1: null, c2: null, c3: null, c4: null, c5: null },
    pasBreakdown: { NC: null, NE: null, NL: null },
    annotations: [],
    status: 'PENDING',
    comments: null,
  };
  for (const [field, value] of Object.entries(defaults)) {
    await Essay.updateMany({ [field]: { $exists: false } }, { $set: { [field]: value } });
  }
}

async function run() {
  await ensureIndexes();
  await initDefaults();
  console.log('Migration completed');
}

module.exports = run;

if (require.main === module) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  mongoose.connect(uri).then(() => run().then(() => mongoose.disconnect()));
}
