const Evaluation = require('../models/Evaluation');
const Grade = require('../models/Grade');

/**
 * Registra a nota da redação nas notas da classe
 * Idempotente por (studentId, classId, bimester, essayId)
 */
async function recordEssayScore({
  studentId,
  classId,
  bimester,
  scaledScore,
  weight,
  rawScore,
  type,
  themeName,
  essayId,
  correctedUrl
}) {
  const name = `Redação - ${type === 'ENEM' ? 'ENEM' : 'PAS/UnB'} - ${themeName}`;

  let evaluation = await Evaluation.findOne({
    'classes.classId': classId,
    bimester,
    'meta.essayId': essayId
  });

  if (!evaluation) {
    evaluation = new Evaluation({
      name,
      value: weight,
      bimester,
      kind: 'ESSAY',
      classes: [{ classId, date: new Date() }],
      meta: { essayId, type, rawScore },
      link: correctedUrl
    });
    await evaluation.save();
  } else {
    evaluation.name = name;
    evaluation.value = weight;
    evaluation.kind = 'ESSAY';
    evaluation.meta = { essayId, type, rawScore };
    evaluation.link = correctedUrl;
    await evaluation.save();
  }

  let grade = await Grade.findOne({ student: studentId, evaluation: evaluation._id });
  if (!grade) {
    grade = new Grade({
      student: studentId,
      evaluation: evaluation._id,
      score: scaledScore,
      bimester,
      status: 'corrected'
    });
  } else {
    grade.score = scaledScore;
    grade.bimester = bimester;
    grade.status = 'corrected';
  }
  await grade.save();

  if (!evaluation.grades.find((g) => g.toString() === grade._id.toString())) {
    evaluation.grades.push(grade._id);
    await evaluation.save();
  }

  return grade;
}

module.exports = { recordEssayScore };
