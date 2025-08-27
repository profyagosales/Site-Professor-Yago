const { Readable } = require('stream');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Essay = require('../models/Essay');
const EssayTheme = require('../models/EssayTheme');
const Student = require('../models/Student');
const Class = require('../models/Class');
const { sendEmail } = require('../services/emailService');
const { recordEssayScore } = require('../services/gradesIntegration');
const { renderEssayCorrectionPdf } = require('../services/pdfService');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

async function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    bufferToStream(buffer).pipe(stream);
  });
}

const storage = multer.memoryStorage();
function fileFilter(req, file, cb) {
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type'));
}
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 }, fileFilter });

// Theme endpoints
async function getThemes(req, res) {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const themes = await EssayTheme.find(filter);
  res.json(themes);
}

async function createTheme(req, res) {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ message: 'Dados inválidos' });
  const theme = await EssayTheme.create({ name, type });
  res.status(201).json(theme);
}

async function updateTheme(req, res) {
  const { id } = req.params;
  const { name, type, active } = req.body;
  const theme = await EssayTheme.findByIdAndUpdate(
    id,
    { $set: { ...(name && { name }), ...(type && { type }), ...(active !== undefined && { active }) } },
    { new: true }
  );
  if (!theme) return res.status(404).json({ message: 'Tema não encontrado' });
  res.json(theme);
}

// Create essay
async function createEssay(req, res) {
  try {
    const { type, bimester, themeId, customTheme } = req.body;
    if (!req.file || !type || !bimester || (!themeId && !customTheme)) {
      return res.status(400).json({ message: 'Dados inválidos' });
    }

      let studentId;
      let classId;
      if (req.profile === 'student') {
        studentId = req.user._id || req.user.id;
        classId = req.user.class;
        if (!classId && studentId) {
          const st = await Student.findById(studentId).select('class');
          classId = st ? st.class : undefined;
        }
      } else {
        studentId = req.body.studentId;
        classId = req.body.classId;
      }
      if (!studentId || !classId) {
        return res.status(400).json({ message: 'Aluno e turma obrigatórios' });
      }

    const originalUrl = await uploadBuffer(req.file.buffer, 'essays/original');

    const essay = await Essay.create({
      studentId,
      classId,
      type,
      bimester,
      themeId: themeId || null,
      customTheme: customTheme || null,
      originalUrl,
      originalMimeType: (req.file && req.file.mimetype) ? req.file.mimetype : 'application/pdf',
      status: 'PENDING'
    });

    res.status(201).json(essay);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao enviar redação' });
  }
}

// List essays
async function listEssays(req, res) {
  const filter = {};
  const { status, classId, studentId, bimester, type, q } = req.query;
  if (status) filter.status = status;
  if (bimester) filter.bimester = Number(bimester);
  if (type) filter.type = type;
  if (req.profile === 'student') {
    filter.studentId = req.user._id;
  } else {
    if (studentId) filter.studentId = studentId;
    if (classId) filter.classId = classId;
  }

  // Build pagination
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
  const skip = (page - 1) * limit;

  // Optional search by student name (q)
  let studentIdsFilter = null;
  if (q && typeof q === 'string') {
    const students = await Student.find({ name: { $regex: q, $options: 'i' } }).select('_id');
    studentIdsFilter = students.map((s) => s._id);
    if (studentIdsFilter.length === 0) {
      return res.json({ items: [], total: 0, page, limit });
    }
    filter.studentId = filter.studentId ? filter.studentId : { $in: studentIdsFilter };
    if (filter.studentId && filter.studentId.$in) {
      // no-op, already set via $in
    }
  }

  const [items, total] = await Promise.all([
    Essay.find(filter)
      .populate('studentId', 'name rollNumber photo')
      .populate('classId', 'series letter discipline')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit),
    Essay.countDocuments(filter)
  ]);

  res.json({ items, total, page, limit });
}

function roundToOneDecimal(num) {
  return Math.round(num * 10) / 10;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function roundToTwoDecimals(num) {
  return Math.round(num * 100) / 100;
}

// Grade essay
async function gradeEssay(req, res) {
  try {
    const { id } = req.params;
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    const {
      annulmentReason,
      bimestreWeight,
      enemCompetencies = {},
      pasBreakdown = {},
      comments,
      sendEmail = true
    } = req.body;

    if (bimestreWeight === undefined) {
      return res.status(400).json({ message: 'bimestreWeight é obrigatório' });
    }
    const weight = Number(bimestreWeight);
    if (isNaN(weight) || weight < 0 || weight > 10) {
      return res.status(400).json({ message: 'bimestreWeight inválido' });
    }

    let correctedUrl = essay.correctedUrl;
    if (req.file) {
      correctedUrl = await uploadBuffer(req.file.buffer, 'essays/corrected');
    }

    let rawScore = null;
    let scaledScore = null;

    if (annulmentReason) {
      rawScore = 0;
      scaledScore = 0;
    } else if (essay.type === 'ENEM') {
      const scores = [enemCompetencies.c1, enemCompetencies.c2, enemCompetencies.c3, enemCompetencies.c4, enemCompetencies.c5];
      const valid = [0, 40, 80, 120, 160, 200];
      if (scores.some((s) => !valid.includes(Number(s)))) {
        return res.status(400).json({ message: 'Competências inválidas' });
      }
      rawScore = scores.reduce((sum, s) => sum + Number(s || 0), 0);
      rawScore = Math.round(rawScore);
      const normalized = rawScore / 1000;
      scaledScore = roundToOneDecimal(weight * normalized);
      if (scaledScore > weight) scaledScore = weight;
    } else {
      const NC = Number(pasBreakdown.NC);
      const NL = Number(pasBreakdown.NL);
      const NE = essay.annotations.filter((a) => a.color === 'green').length;
      if (
        isNaN(NC) || NC < 0 || NC > 10 ||
        isNaN(NL) || NL < 1
      ) {
        return res.status(400).json({ message: 'Dados inválidos para PAS' });
      }
      rawScore = roundToTwoDecimals(clamp(NC - (2 * NE) / Math.max(NL, 1), 0, 10));
      const normalized = rawScore / 10;
      scaledScore = roundToOneDecimal(weight * normalized);
      if (scaledScore > weight) scaledScore = weight;
      essay.pasBreakdown = { NC, NE, NL };
    }

    essay.annulmentReason = annulmentReason || null;
    essay.bimestreWeight = weight;
    essay.rawScore = rawScore;
    essay.scaledScore = scaledScore;
    essay.enemCompetencies = essay.type === 'ENEM' ? enemCompetencies : undefined;
    essay.correctedUrl = correctedUrl;
    essay.teacherId = req.user._id;
    essay.status = 'GRADED';
    essay.comments = comments || null;

    await essay.save();

    // integração com notas da classe
    const themeName = essay.themeId
      ? (await EssayTheme.findById(essay.themeId))?.name
      : essay.customTheme;
    await recordEssayScore({
      studentId: essay.studentId,
      classId: essay.classId,
      bimester: essay.bimester,
      points: scaledScore,
      maxPoints: weight,
      rawScore,
      type: essay.type,
      themeName,
      essayId: essay._id,
      correctedUrl
    });

    if (typeof sendEmail === 'function') {
      const student = await Student.findById(essay.studentId);
      const classInfo = await Class.findById(essay.classId);
      const html = `<!DOCTYPE html><p>Olá ${student.name},</p>
<p>Sua redação foi corrigida.</p>
<p>Turma: ${classInfo.series}${classInfo.letter} - ${classInfo.discipline}</p>
<p>Bimestre: ${essay.bimester}</p>
<p>Tipo: ${essay.type}</p>
<p>Tema: ${themeName}</p>
<p>Nota: ${rawScore}</p>
<p>Nota bimestral: ${scaledScore}</p>
<p><a href="${correctedUrl}">Baixar correção</a></p>`;
      await sendEmail({ to: student.email, subject: 'Sua redação foi corrigida', html });
    }

    res.json(essay);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao corrigir redação' });
  }
}

// Update annotations
async function updateAnnotations(req, res) {
  try {
    const { id } = req.params;
    const { annotations, richAnnotations } = req.body;
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    essay.annotations = Array.isArray(annotations) ? annotations : [];
    if (Array.isArray(richAnnotations)) {
      const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
      const norm = richAnnotations
        .slice(0, 500)
        .map((a) => {
          if (!a || typeof a.page !== 'number') return null;
          const t = a.type;
          const base = {
            id: String(a.id || ''),
            page: Math.max(1, Math.floor(a.page)),
            type: t,
            createdAt: a.createdAt || new Date().toISOString(),
            updatedAt: a.updatedAt || undefined,
            color: a.color || undefined
          };
          if (t === 'highlight' && Array.isArray(a.rects)) {
            return { ...base, rects: a.rects.slice(0, 8).map((r) => ({ x: clamp01(r.x), y: clamp01(r.y), w: clamp01(r.w), h: clamp01(r.h) })), opacity: Number(a.opacity) || 0.3 };
          }
          if (t === 'box' && a.rect) {
            const r = a.rect; return { ...base, rect: { x: clamp01(r.x), y: clamp01(r.y), w: clamp01(r.w), h: clamp01(r.h) }, strokeWidth: Math.max(1, Math.min(10, Number(a.strokeWidth) || 2)) };
          }
          if (t === 'strike' && a.from && a.to) {
            return { ...base, from: { x: clamp01(a.from.x), y: clamp01(a.from.y) }, to: { x: clamp01(a.to.x), y: clamp01(a.to.y) }, strokeWidth: Math.max(1, Math.min(10, Number(a.strokeWidth) || 2)) };
          }
          if (t === 'pen' && Array.isArray(a.points)) {
            return { ...base, points: a.points.slice(0, 200).map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) })), width: Math.max(1, Math.min(12, Number(a.width) || 2)) };
          }
          if (t === 'comment' && a.at) {
            const text = (a.text || '').toString();
            return { ...base, at: { x: clamp01(a.at.x), y: clamp01(a.at.y) }, text: text.length > 500 ? text.slice(0, 500) : text };
          }
          return null;
        })
        .filter(Boolean);
      essay.richAnnotations = norm;
    }
    if (essay.type === 'PAS') {
      const NE = essay.annotations.filter((a) => a.color === 'green').length;
      essay.pasBreakdown = essay.pasBreakdown || {};
      essay.pasBreakdown.NE = NE;
      const { NC = 0, NL = 1 } = essay.pasBreakdown;
      essay.rawScore = roundToTwoDecimals(clamp(NC - (2 * NE) / Math.max(NL, 1), 0, 10));
      if (essay.bimestreWeight != null) {
        const normalized = essay.rawScore / 10;
        essay.scaledScore = roundToOneDecimal(essay.bimestreWeight * normalized);
        if (essay.scaledScore > essay.bimestreWeight) essay.scaledScore = essay.bimestreWeight;
      }
    }

  await essay.save();
  res.json(essay);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar anotações' });
  }
}

// Render corrected PDF
async function renderCorrection(req, res) {
  try {
    const { id } = req.params;
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    const student = await Student.findById(essay.studentId);
    const classInfo = await Class.findById(essay.classId);
    const themeName = essay.themeId
      ? (await EssayTheme.findById(essay.themeId))?.name
      : essay.customTheme;

  // thumbnailsCount opcional, padrão 2, limitado a 1..2 para caber na primeira folha
  const thumbnailsCount = Math.max(1, Math.min(2, Number(req.body.thumbnailsCount || 2)));
  const pdfBuffer = await renderEssayCorrectionPdf({ essay, student, classInfo, themeName, thumbnailsCount });
    const correctedUrl = await uploadBuffer(pdfBuffer, 'essays/corrected');

    essay.correctedUrl = correctedUrl;
    await essay.save();

    if (req.body.sendEmail !== false) {
      const html = `<!DOCTYPE html><p>Olá ${student.name},</p>` +
        `<p>Sua redação foi corrigida.</p>` +
        `<p>Turma: ${classInfo.series}${classInfo.letter} - ${classInfo.discipline}</p>` +
        `<p>Bimestre: ${essay.bimester}</p>` +
        `<p>Tipo: ${essay.type}</p>` +
        `<p>Tema: ${themeName}</p>` +
        `<p>Nota: ${essay.rawScore}</p>` +
        `<p>Nota bimestral: ${essay.scaledScore}</p>` +
        `<p><a href="${correctedUrl}">Baixar correção</a></p>`;
      await sendEmail({ to: student.email, subject: 'Sua redação foi corrigida', html });
    }

    res.json({ correctedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao gerar correção' });
  }
}

module.exports = {
  upload,
  getThemes,
  createTheme,
  updateTheme,
  createEssay,
  listEssays,
  gradeEssay,
  updateAnnotations,
  renderCorrection
};
