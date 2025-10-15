const express = require('express');
const authRequired = require('../middleware/auth');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Grade = require('../models/Grade');
const Evaluation = require('../models/Evaluation');
const Content = require('../models/Content');
const Announcement = require('../models/Announcement');
const Essay = require('../models/Essay');

const router = express.Router();

router.use(authRequired);

function ensureStudent(req, res) {
  const requester = req.user || {};
  if (!requester || String(requester.role).toLowerCase() !== 'student') {
    res.status(403).json({ success: false, message: 'Somente alunos podem acessar este recurso' });
    return false;
  }
  return true;
}

function ensureSameStudent(req, res) {
  if (!ensureStudent(req, res)) return false;
  const { id } = req.params;
  const requester = req.user || {};
  if (id && String(id) !== String(requester.id)) {
    res.status(403).json({ success: false, message: 'Não autorizado para outros alunos' });
    return false;
  }
  return true;
}

function parseDateParam(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date;
}

function normalizeClassLabel(cls) {
  if (!cls) return null;
  const serie = cls.series ? `${cls.series}º` : '';
  const letter = cls.letter ? `${cls.letter}` : '';
  const discipline = cls.discipline || cls.subject || '';
  const base = [serie, letter].join('').trim();
  const namePart = cls.name || (base ? `Turma ${base}` : null);
  const labelParts = [namePart, discipline].filter(Boolean);
  return labelParts.join(' • ') || discipline || namePart || null;
}

async function fetchStudentAndClass(studentId) {
  if (!studentId) return { student: null, classDoc: null };
  const student = await Student.findById(studentId)
    .select('name email class rollNumber phone photo')
    .populate({ path: 'class', select: 'name year series letter discipline students notices schedule' })
    .lean();
  if (!student) return { student: null, classDoc: null };
  let classDoc = null;
  if (student.class && typeof student.class === 'object') {
    classDoc = { ...student.class };
  } else if (student.class) {
    classDoc = await Class.findById(student.class)
      .select('name year series letter discipline students notices schedule')
      .lean();
  }
  if (!classDoc) {
    classDoc = await Class.findOne({ students: student._id })
      .select('name year series letter discipline students notices schedule')
      .lean();
    if (classDoc) {
      await Student.updateOne({ _id: student._id }, { $set: { class: classDoc._id } }).catch(() => {});
    }
  }
  return { student, classDoc };
}

router.get('/me', async (req, res, next) => {
  try {
    if (!ensureStudent(req, res)) return;
    const requesterId = req.user?.id;
    const { student, classDoc } = await fetchStudentAndClass(requesterId);
    if (!student) return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    const turmaAtual = classDoc
      ? {
          id: String(classDoc._id),
          nome: normalizeClassLabel(classDoc),
          ano: classDoc.year ?? null,
          serie: classDoc.series ?? null,
          letra: classDoc.letter ?? null,
          disciplina: classDoc.discipline ?? classDoc.subject ?? null,
        }
      : null;
    res.json({
      id: String(student._id),
      nome: student.name || null,
      email: student.email || null,
      numero: student.rollNumber ?? null,
      telefone: student.phone ?? null,
      foto: student.photo ?? null,
      turmaAtual,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/notas', async (req, res, next) => {
  try {
    if (!ensureSameStudent(req, res)) return;
    const studentId = req.params.id;
    const yearParam = parseInt(req.query.ano, 10);
    const termParam = parseInt(req.query.bim || req.query.bimestre, 10);
    const { student, classDoc } = await fetchStudentAndClass(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    const year = Number.isFinite(yearParam) ? yearParam : classDoc?.year ?? new Date().getFullYear();

    const rawGrades = await Grade.find({ student: studentId }).lean();
    if (!rawGrades.length) return res.status(204).send();

    const evaluationIds = rawGrades
      .map((g) => g.evaluation)
      .filter((id) => id)
      .map((id) => String(id));
    const uniqueEvalIds = Array.from(new Set(evaluationIds));
    const evaluations = uniqueEvalIds.length
      ? await Evaluation.find({ _id: { $in: uniqueEvalIds } })
          .select('name value bimester classes')
          .lean()
      : [];
    const evaluationMap = new Map(evaluations.map((ev) => [String(ev._id), ev]));

    const classId = classDoc?._id ? String(classDoc._id) : null;
    const entries = rawGrades
      .map((grade) => {
        const score = Number(grade.score ?? 0);
        const evaluation = grade.evaluation ? evaluationMap.get(String(grade.evaluation)) : null;
        const classEntry = evaluation?.classes?.find((cls) => String(cls.classId) === classId) || null;
        const date = classEntry?.date ? new Date(classEntry.date) : null;
        const evaluationYear = date ? date.getFullYear() : classDoc?.year ?? null;
        if (year && evaluationYear && evaluationYear !== year) return null;
        const bimester = grade.bimester ?? evaluation?.bimester ?? null;
        return {
          atividade: evaluation?.name || 'Atividade',
          nota: Number.isFinite(score) ? score : null,
          valor: Number.isFinite(evaluation?.value) ? evaluation.value : null,
          data: date ? date.toISOString() : null,
          bimester,
        };
      })
      .filter((item) => item !== null);

    if (!entries.length) return res.status(204).send();

    const selectedEntries = Number.isFinite(termParam)
      ? entries.filter((entry) => entry.bimester === termParam)
      : entries;

    if (!selectedEntries.length) return res.status(204).send();

    const pontuacaoAcumulada = selectedEntries.reduce((sum, entry) => sum + (entry.nota ?? 0), 0);
    const totalAtividades = selectedEntries.filter((entry) => entry.nota !== null).length;
    const mediaAtividades = totalAtividades ? pontuacaoAcumulada / totalAtividades : null;

    const porBimestre = entries.reduce((acc, entry) => {
      if (!entry.bimester) return acc;
      const key = Number(entry.bimester);
      const bucket = acc.get(key) || { bimester: key, pontuacao: 0, total: 0 };
      if (typeof entry.nota === 'number') {
        bucket.pontuacao += entry.nota;
        bucket.total += 1;
      }
      acc.set(key, bucket);
      return acc;
    }, new Map());

    const resumoPorBimestre = Array.from(porBimestre.values())
      .sort((a, b) => a.bimester - b.bimester)
      .map((item) => ({
        bimester: item.bimester,
        pontuacao: item.pontuacao,
        media: item.total ? item.pontuacao / item.total : null,
      }));

    res.json({
      atividades: selectedEntries.map(({ atividade, nota, valor, data }) => ({ atividade, nota, valor, data })),
      agregados: {
        mediaAtividades: mediaAtividades ?? null,
        pontuacaoAcumulada,
        totalAtividades,
        resumoPorBimestre,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/agenda', async (req, res, next) => {
  try {
    if (!ensureSameStudent(req, res)) return;
    const studentId = req.params.id;
    const from = parseDateParam(req.query.from, new Date());
    const defaultEnd = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    const to = parseDateParam(req.query.to, defaultEnd);
    if (to <= from) {
      return res.status(400).json({ success: false, message: 'Intervalo inválido' });
    }
    const { classDoc } = await fetchStudentAndClass(studentId);
    if (!classDoc?._id) return res.status(204).send();

    const classId = String(classDoc._id);

    const [contents, evaluations] = await Promise.all([
      Content.find({ classId, date: { $gte: from, $lte: to } })
        .select('title date description classId')
        .sort({ date: 1 })
        .lean(),
      Evaluation.find({ 'classes.classId': classId })
        .select('name value classes')
        .lean(),
    ]);

    const conteudos = contents.map((content) => ({
      id: String(content._id),
      titulo: content.title,
      data: content.date ? new Date(content.date).toISOString() : null,
      descricao: content.description ?? null,
    }));

    const avaliacoes = [];
    evaluations.forEach((evaluation) => {
      const classEntry = Array.isArray(evaluation.classes)
        ? evaluation.classes.find((cls) => String(cls.classId) === classId)
        : null;
      if (!classEntry?.date) return;
      const examDate = new Date(classEntry.date);
      if (examDate < from || examDate > to) return;
      avaliacoes.push({
        id: String(evaluation._id),
        titulo: evaluation.name,
        data: examDate.toISOString(),
        valor: Number.isFinite(evaluation.value) ? evaluation.value : null,
      });
    });

    if (!conteudos.length && !avaliacoes.length) return res.status(204).send();

    res.json({ conteudos, avaliacoes });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/avisos', async (req, res, next) => {
  try {
    if (!ensureSameStudent(req, res)) return;
    const studentId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const { classDoc } = await fetchStudentAndClass(studentId);
    if (!classDoc?._id) return res.status(204).send();

    const classNotices = Array.isArray(classDoc.notices)
      ? classDoc.notices.map((notice) => ({
          id: String(notice._id || `${classDoc._id}-${notice.label || notice.message}`),
          mensagem: notice.message || notice.label || null,
          data: notice.dateISO || notice.createdAt || null,
          origem: 'class',
        }))
      : [];

    const announcements = await Announcement.find({ classIds: classDoc._id })
      .select('message scheduledFor createdAt')
      .sort({ scheduledFor: -1 })
      .limit(limit)
      .lean();

    const formattedAnnouncements = announcements.map((item) => ({
      id: String(item._id),
      mensagem: item.message,
      data: item.scheduledFor ? new Date(item.scheduledFor).toISOString() : item.createdAt ? new Date(item.createdAt).toISOString() : null,
      origem: 'announcement',
    }));

    const merged = [...formattedAnnouncements, ...classNotices]
      .filter((item) => item.mensagem)
      .sort((a, b) => {
        const da = a.data ? new Date(a.data).getTime() : 0;
        const db = b.data ? new Date(b.data).getTime() : 0;
        return db - da;
      })
      .slice(0, limit);

    if (!merged.length) return res.status(204).send();

    res.json({ avisos: merged });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/redacoes', async (req, res, next) => {
  try {
    if (!ensureSameStudent(req, res)) return;
    const studentId = req.params.id;
    const essays = await Essay.find({ studentId })
      .select('type bimester submittedAt createdAt rawScore status originalUrl correctedUrl themeName theme customTheme')
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean();

    if (!essays.length) return res.status(204).send();

    const payload = essays.map((essay) => ({
      id: String(essay._id),
      tipo: essay.type || null,
      bimester: essay.bimester ?? null,
      enviadoEm: essay.submittedAt ? new Date(essay.submittedAt).toISOString() : essay.createdAt ? new Date(essay.createdAt).toISOString() : null,
      nota: typeof essay.rawScore === 'number' ? essay.rawScore : null,
      status: essay.status || null,
      arquivoOriginal: essay.originalUrl || null,
      arquivoCorrigido: essay.correctedUrl || null,
      tema: essay.themeName || essay.customTheme || (essay.theme && essay.theme.name) || null,
    }));

    res.json({ redacoes: payload });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
