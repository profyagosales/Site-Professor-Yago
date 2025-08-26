const express = require('express');
const authRequired = require('../middleware/auth');
const {
  upload,
  getThemes,
  createTheme,
  updateTheme,
  createEssay,
  listEssays,
  gradeEssay,
  updateAnnotations,
} = require('../controllers/essaysController');
const { getEssayById, assignEssay, sendCorrectionEmail } = require('../controllers/redactionsCompatController');

const router = express.Router();
const Essay = require('../models/Essay');

router.use(authRequired);

// Temas (compat): usa EssayTheme sob chaves da especificação
router.get('/temas', async (req, res, next) => {
  try {
    let data;
    await getThemes(req, { json: (d) => { data = d; } });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});
router.post('/temas', async (req, res, next) => {
  try {
    // mapear title->name e optional type
    if (req.body && req.body.title && !req.body.name) req.body.name = req.body.title;
    let statusCode = 200;
    let data;
    await createTheme(req, {
      status: (c) => ({ json: (d) => { statusCode = c; data = d; } }),
      json: (d) => { data = d; }
    });
    res.status(statusCode).json({ success: true, data });
  } catch (e) { next(e); }
});
router.delete('/temas/:id', async (req, res, next) => {
  try {
    // soft delete: marcar active=false
    req.body = { active: false };
    let data;
    await updateTheme(req, { json: (d) => { data = d; } });
    res.json({ success: true, message: 'Tema desativado', data });
  } catch (e) { next(e); }
});

// Upload (compat)
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    // mapear payloads: type, classId, studentId, temaId->themeId, temaLivre->customTheme, bimestre->bimester
    const b = req.body || {};
    if (b.temaId && !b.themeId) b.themeId = b.temaId;
    if (b.temaLivre && !b.customTheme) b.customTheme = b.temaLivre;
    if (b.bimestre && !b.bimester) b.bimester = b.bimestre;
    // permitir peso opcional no upload
    if (b.pesoBimestral && !b.bimestreWeight) b.bimestreWeight = b.pesoBimestral;
    let statusCode = 200;
    let data;
    await createEssay(req, {
      status: (c) => ({ json: (d) => { statusCode = c; data = d; } }),
      json: (d) => { data = d; }
    });
    res.status(statusCode).json({ success: true, data });
  } catch (e) { next(e); }
});

// Atribuição aluno/turma
router.post('/:id/atribuir', assignEssay);

// Listagens
router.get('/pendentes', async (req, res, next) => {
  try {
    // Mapear filtros compat
    const { bimestre, turma, aluno } = req.query || {};
    const filter = { status: 'PENDING' };
    if (bimestre) filter.bimester = Number(bimestre);
    if (turma) filter.classId = turma;
    if (aluno) filter.studentId = aluno;
    const data = await Essay.find(filter)
      .populate('studentId', 'name rollNumber photo')
      .populate('classId', 'series letter discipline')
      .sort({ submittedAt: -1 });
    // Adapta chaves para UI legada: student/class
    const mapped = data.map((e) => ({
      _id: e._id,
      student: e.studentId,
      class: e.classId,
      submittedAt: e.submittedAt || e.createdAt,
      status: e.status,
      type: e.type,
      themeId: e.themeId,
      customTheme: e.customTheme,
      originalUrl: e.originalUrl
    }));
    res.json({ success: true, data: mapped });
  } catch (e) { next(e); }
});
router.get('/corrigidas', async (req, res, next) => {
  try {
    const { bimestre, turma, aluno } = req.query || {};
    const filter = { status: 'GRADED' };
    if (bimestre) filter.bimester = Number(bimestre);
    if (turma) filter.classId = turma;
    if (aluno) filter.studentId = aluno;
    const data = await Essay.find(filter)
      .populate('studentId', 'name rollNumber photo')
      .populate('classId', 'series letter discipline')
      .sort({ submittedAt: -1 });
    const mapped = data.map((e) => ({
      _id: e._id,
      student: e.studentId,
      class: e.classId,
      submittedAt: e.submittedAt || e.createdAt,
      status: e.status,
      type: e.type,
      themeId: e.themeId,
      customTheme: e.customTheme,
      originalUrl: e.originalUrl,
      correctedUrl: e.correctedUrl,
      rawScore: e.rawScore,
      scaledScore: e.scaledScore
    }));
    res.json({ success: true, data: mapped });
  } catch (e) { next(e); }
});

// Correção
router.post('/:id/corrigir', async (req, res, next) => {
  try {
    // Mapear payload da especificação para o gradeEssay
    const body = req.body || {};
    const mapped = { };
    // peso
    if (body.pesoBimestral != null) mapped.bimestreWeight = body.pesoBimestral;
    // anulação
    if (body.anulacao?.enabled) mapped.annulmentReason = 'IDENTIFICACAO'; // marcador genérico; razões detalhadas podem ser salvas em comments
    // ENEM
    if (body.enem) {
      const arr = Array.isArray(body.enem.competencias) ? body.enem.competencias : [];
      mapped.enemCompetencies = { c1: arr[0], c2: arr[1], c3: arr[2], c4: arr[3], c5: arr[4] };
    }
    // PAS
    if (body.pas) {
      mapped.pasBreakdown = { NC: body.pas.nc, NE: body.pas.ne, NL: body.pas.nl };
    }
    if (body.overallComment) mapped.comments = body.overallComment;
    req.body = mapped;
  let data;
  await gradeEssay(req, { json: (d) => { data = d; } });
  res.json({ success: true, message: 'Redação corrigida', data });
  } catch (e) { next(e); }
});

// Anotações
router.put('/:id/annotations', async (req, res, next) => {
  try {
    // Mapear estrutura: { annotations:[], comments:[] }
  let data;
  await updateAnnotations(req, { json: (d) => { data = d; } });
  res.json({ success: true, message: 'Anotações atualizadas', data });
  } catch (e) { next(e); }
});

// Carregar
router.get('/:id', getEssayById);

// Enviar PDF por e-mail (reenvio)
router.post('/:id/enviar-pdf', sendCorrectionEmail);

module.exports = router;
