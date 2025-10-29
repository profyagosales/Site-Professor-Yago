const { Readable } = require('stream');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Essay = require('../models/Essay');
const EssayTheme = require('../models/EssayTheme');
const Student = require('../models/Student');
const Class = require('../models/Class');
const EssayAnnotation = require('../models/EssayAnnotation');
const { isValidObjectId } = require('mongoose');
const { sendEmail } = require('../services/emailService');
const { recordEssayScore } = require('../services/gradesIntegration');
const { renderEssayCorrectionPdf } = require('../services/pdfService');
const { generateCorrectedEssayPdf } = require('../services/pdf');
const { ENEM_RUBRIC } = require('../constants/enemRubric');
const https = require('https');
const http = require('http');
const { assertUserCanAccessEssay } = require('../utils/assertUserCanAccessEssay');

const ENEM_RUBRIC_BY_KEY = ENEM_RUBRIC.reduce((acc, competency) => {
  acc[competency.key] = competency;
  return acc;
}, {});

function getEnemLevelData(key, level) {
  const competency = ENEM_RUBRIC_BY_KEY[key];
  if (!competency) return null;
  return competency.levels.find((lvl) => lvl.level === level) || competency.levels[0] || null;
}

function collectRubricReasonIds(node) {
  if (!node) return [];
  const stack = Array.isArray(node) ? [...node] : [node];
  const set = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (typeof current.id === 'string') {
      set.add(current.id);
    }
    if (Array.isArray(current.items)) {
      current.items.forEach((child) => stack.push(child));
    }
  }
  return Array.from(set);
}

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

async function uploadBuffer(buffer, folder, mimetype, options = {}) {
  // Define resource_type baseado no mimetype: PDFs -> 'raw'; imagens -> 'image'
  const isImage = typeof mimetype === 'string' && mimetype.startsWith('image/');
  const resource_type = isImage ? 'image' : 'raw';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (err, result) => {
        if (err) return reject(err);
        if (options && options.returnResult) {
          resolve(result);
        } else {
          resolve(result.secure_url);
        }
      }
    );
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

function logEssayAuth(status, req, extra = {}) {
  if (status !== 401 && status !== 403) return;
  console.warn('[essays] access denied', {
    status,
    path: req.originalUrl,
    method: req.method,
    role: req.auth?.role ?? req.user?.role ?? null,
    user: req.auth?.sub ?? req.auth?.userId ?? req.user?._id ?? req.user?.id ?? null,
    ...extra,
  });
}

function resolveClassName(cls) {
  if (!cls) return null;
  const series = cls.series || cls.serie || cls.grade;
  const letter = cls.letter || cls.turma;
  const discipline = cls.discipline || cls.subject;
  const parts = [];
  if (series) parts.push(`${series}º${letter ? ` ${letter}` : ''}`.trim());
  if (discipline) parts.push(discipline);
  if (cls.name && !parts.length) parts.push(cls.name);
  return parts.filter(Boolean).join(' • ') || cls.name || null;
}

function normalizeStudent(student, cls) {
  if (!student) return null;
  const id = String(student._id || student.id || '');
  return {
    id,
    name: student.name || student.nome || 'Aluno',
    className: resolveClassName(cls) || null,
    photo: student.photo || student.photoUrl || null,
  };
}

function normalizeEssayFile(essay) {
  const mime = essay.originalMimeType || '';
  let kind = 'pdf';
  if (mime.startsWith('image/')) kind = 'image';
  return {
    kind,
    mimeType: mime || null,
    hasCorrected: Boolean(essay.correctedUrl || essay.correctionPdf),
  };
}

function normalizeEssayGrade(essay) {
  const nc = essay?.pasBreakdown?.NC ?? null;
  const nl = essay?.pasBreakdown?.NL ?? null;
  const ne = essay?.pasBreakdown?.NE ?? null;
  return {
    nc: nc != null ? Number(nc) : null,
    nl: nl != null ? Number(nl) : null,
    ne: ne != null ? Number(ne) : null,
    nb: essay?.rawScore != null ? Number(essay.rawScore) : null,
    considerInTerm: Boolean(essay?.countInBimestral),
    bimestralPointsValue: essay?.bimestralPointsValue != null ? Number(essay.bimestralPointsValue) : null,
    scaledScore: essay?.scaledScore != null ? Number(essay.scaledScore) : null,
    bimestreWeight: essay?.bimestreWeight != null ? Number(essay.bimestreWeight) : null,
  };
}

function normalizeEssayDetail(essay) {
  const student = normalizeStudent(essay.studentId, essay.classId);
  const themeName =
    essay.customTheme ||
    essay.themeId?.name ||
    'Tema não informado';
  const statusValue = normalizeStatusValue(essay.status);

  return {
    id: String(essay._id),
    status: statusValue,
    type: essay.type || null,
    theme: themeName,
    topic: themeName,
    term: essay.bimester ?? null,
    submittedAt: essay.submittedAt || essay.createdAt || null,
    updatedAt: essay.updatedAt || null,
    student,
    studentName: student?.name || essay.studentName || null,
    classId: essay.classId?._id ? String(essay.classId._id) : essay.classId || null,
    className: student?.className || null,
    file: normalizeEssayFile(essay),
    fileUrl: essay.originalUrl || null,
    correctedUrl: essay.correctedUrl || null,
    correctionPdf: essay.correctionPdf || essay.correctedUrl || null,
    isCorrected: Boolean(essay.isCorrected || essay.correctionPdf || essay.correctedUrl || statusValue === 'ready'),
    correctedAt: essay.correctedAt || null,
    grade: normalizeEssayGrade(essay),
    comments: essay.comments || null,
    annotations: Array.isArray(essay.annotations) ? essay.annotations : [],
    richAnnotations: Array.isArray(essay.richAnnotations) ? essay.richAnnotations : [],
    enemCompetencies: essay.enemCompetencies || null,
    enemRubric: essay.enemRubric || null,
    pasBreakdown: essay.pasBreakdown || null,
    annulmentReason: essay.annulmentReason || null,
    studentId: essay.studentId || null,
    class: essay.classId || null,
    themeId: essay.themeId || null,
    teacherId: essay.teacherId || null,
    originalUrl: essay.originalUrl || null,
    originalMimeType: essay.originalMimeType || null,
    bimestreWeight: essay.bimestreWeight ?? null,
    bimestralPointsValue: essay.bimestralPointsValue ?? null,
    countInBimestral: essay.countInBimestral ?? false,
    sentAt: essay.submittedAt || essay.createdAt || null,
  };
}

function clamp01(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return number;
}

// Ensures annotation numbers are unique, sequential (1,2,3...) and sorted by createdAt then id
function ensureAnnotationNumbers(annotations = []) {
  if (!Array.isArray(annotations)) return [];
  const arr = [...annotations];
  // sort by createdAt asc, then id asc
  arr.sort((a, b) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    const ia = (a?.id || a?._id || '').toString();
    const ib = (b?.id || b?._id || '').toString();
    return ia.localeCompare(ib);
  });
  // preserve valid unique numbers, fill gaps/dups
  const used = new Set();
  for (const a of arr) {
    const n = Number(a?.number);
    if (Number.isFinite(n) && n > 0 && !used.has(n)) used.add(n);
  }
  let next = 1;
  const takeNext = () => {
    while (used.has(next)) next += 1;
    used.add(next);
    return next++;
  };
  const seen = new Set();
  for (const a of arr) {
    let n = Number(a?.number);
    if (!Number.isFinite(n) || n <= 0 || seen.has(n)) {
      n = takeNext();
    }
    a.number = n;
    seen.add(n);
  }
  return arr;
}

const LEVEL_POINTS = [0, 40, 80, 120, 160, 200];
const LEGACY_ANNUL_REASONS = new Set([
  'IDENTIFICACAO',
  'DESENHOS',
  'SINAIS',
  'PARTE_DESCONECTADA',
  'COPIA_MOTIVADORES',
  'MENOS_7_LINHAS',
]);

const VALID_STATUS = new Set(['pending', 'processing', 'ready', 'failed']);

function normalizeStatusValue(status, { defaultValue = 'pending' } = {}) {
  const raw = (status ?? '').toString().trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === 'corrigida' || raw === 'corrected') return 'ready';
  if (raw === 'ready') return 'ready';
  if (raw === 'pendente' || raw === 'pending') return 'pending';
  if (raw === 'processando' || raw === 'processing') return 'processing';
  if (raw === 'arquivada' || raw === 'erro' || raw === 'errored' || raw === 'failed') return 'failed';
  if (VALID_STATUS.has(raw)) return raw;
  return defaultValue;
}

function normalizeEssaySummary(essay) {
  const student = normalizeStudent(essay.studentId, essay.classId);
  const statusValue = normalizeStatusValue(essay.status);
  return {
    id: String(essay._id),
    status: statusValue,
    type: essay.type || null,
    theme: essay.customTheme || essay.themeId?.name || 'Tema não informado',
    term: essay.bimester ?? null,
    submittedAt: essay.submittedAt || essay.createdAt || null,
    updatedAt: essay.updatedAt || null,
    student,
    studentName: student?.name || essay.studentName || null,
    classId: essay.classId?._id ? String(essay.classId._id) : essay.classId || null,
    className: student?.className || null,
    corrected: Boolean(essay.correctedUrl || essay.correctionPdf || essay.isCorrected || statusValue === 'ready'),
    isCorrected: Boolean(essay.isCorrected || essay.correctionPdf || essay.correctedUrl || statusValue === 'ready'),
    correctedAt: essay.correctedAt || null,
    fileUrl: essay.originalUrl || null,
    correctedUrl: essay.correctedUrl || null,
    correctionPdf: essay.correctionPdf || essay.correctedUrl || null,
    rawScore: essay.rawScore != null ? Number(essay.rawScore) : null,
    scaledScore: essay.scaledScore != null ? Number(essay.scaledScore) : null,
    bimestralPointsValue: essay.bimestralPointsValue != null ? Number(essay.bimestralPointsValue) : null,
    studentId: essay.studentId || null,
    class: essay.classId || null,
    sentAt: essay.submittedAt || essay.createdAt || null,
  };
}

function normalizeTheme(doc) {
  if (!doc) return null;
  const raw = doc.toObject?.() ?? doc;
  return {
    id: String(raw._id || raw.id || ''),
    type: raw.type,
    title: raw.name,
    description: raw.description || null,
    active: raw.active !== false,
    promptFileUrl: raw.promptFileUrl || null,
    promptFilePublicId: raw.promptFilePublicId || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

function mapAnnotationResponse(doc) {
  if (!doc) return null;
  const raw = doc.toObject?.() ?? doc;
  const rects = Array.isArray(raw.rects) ? raw.rects : [];
  return {
    id: String(raw._id || raw.id || ''),
    essayId: raw.essayId ? String(raw.essayId) : undefined,
    page: Number(raw.page) || 1,
    rects: rects
      .map((rect) => ({
        x: clamp01(rect?.x),
        y: clamp01(rect?.y),
        w: clamp01(rect?.w ?? rect?.width),
        h: clamp01(rect?.h ?? rect?.height),
      }))
      .filter((r) => r.w > 0 && r.h > 0),
    color: typeof raw.color === 'string' ? raw.color : '#FDE68A',
    category: typeof raw.category === 'string' ? raw.category : 'argumentacao',
    comment: typeof raw.comment === 'string' ? raw.comment : '',
    number: Number(raw.number) || 1,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

function normalizeAnnotationInput(payload, index, essayId, createdBy) {
  if (!payload) return null;
  const rectsRaw = Array.isArray(payload.rects) ? payload.rects : [];
  const rects = rectsRaw
    .map((rect) => ({
      x: clamp01(rect?.x),
      y: clamp01(rect?.y),
      w: clamp01(rect?.w ?? rect?.width),
      h: clamp01(rect?.h ?? rect?.height),
    }))
    .filter((rect) => rect.w > 0 && rect.h > 0);
  if (!rects.length) return null;
  const page = Math.max(1, Math.floor(Number(payload.page) || 1));
  const color = typeof payload.color === 'string' ? payload.color : '#FDE68A';
  const category = typeof payload.category === 'string' ? payload.category : 'argumentacao';
  const comment = typeof payload.comment === 'string' ? payload.comment : '';
  const number = Number(payload.number);
  return {
    essayId,
    page,
    rects,
    color,
    category,
    comment,
    number: Number.isFinite(number) && number > 0 ? Math.floor(number) : index + 1,
    createdBy: createdBy || null,
  };
}

async function getEssay(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'ID inválido' });
  }
  try {
    const essay = await Essay.findById(id)
      .populate('studentId', 'name email photo rollNumber class')
      .populate('classId', 'series letter discipline name')
      .populate('teacherId', 'name email')
      .populate('themeId', 'name type active')
      .lean();

    if (!essay) {
      return res.status(404).json({ success: false, message: 'Redação não encontrada' });
    }

    await assertUserCanAccessEssay(req.user, essay);
    if (Array.isArray(essay.annotations)) {
      essay.annotations = ensureAnnotationNumbers(essay.annotations);
    }
    if (Array.isArray(essay.richAnnotations)) {
      essay.richAnnotations = ensureAnnotationNumbers(essay.richAnnotations);
    }
    const normalized = normalizeEssayDetail(essay);

    return res.json({ success: true, data: normalized });
  } catch (err) {
    const status = err?.status || 500;
    logEssayAuth(status, req, { essayId: id, reason: err?.reason || err?.message });
    if (status >= 500) {
      console.error('getEssay error', err);
    }
    return res.status(status).json({ success: false, message: err?.message || 'Erro ao buscar redação' });
  }
}

// Theme endpoints
async function getThemes(req, res) {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = String(req.query.type).trim().toUpperCase();
    }
    if (req.query.active === 'false') {
      filter.active = false;
    } else if (req.query.active === 'all') {
      // no active filter
    } else {
      filter.active = true;
    }

    const themes = await EssayTheme.find(filter).sort({ updatedAt: -1 });
    const data = themes.map((theme) => normalizeTheme(theme));
    res.json({ success: true, data });
  } catch (err) {
    console.error('[themes] list error', err);
    res.status(500).json({ success: false, message: 'Erro ao listar temas' });
  }
}

async function createTheme(req, res) {
  try {
    const typeRaw = typeof req.body.type === 'string' ? req.body.type.trim().toUpperCase() : '';
    const titleRaw = typeof req.body.title === 'string' ? req.body.title : req.body.name;
    const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
    if (!title) {
      return res.status(400).json({ success: false, message: 'Título do tema obrigatório' });
    }
    if (!['ENEM', 'PAS'].includes(typeRaw)) {
      return res.status(400).json({ success: false, message: 'Tipo de tema inválido' });
    }

    let uploadResult = null;
    if (req.file) {
      uploadResult = await uploadBuffer(req.file.buffer, 'essays/themes', req.file.mimetype || 'application/octet-stream', { returnResult: true });
    }

    const theme = await EssayTheme.create({
      name: title,
      type: typeRaw,
      description: typeof req.body.description === 'string' && req.body.description.trim() ? req.body.description.trim() : null,
      promptFileUrl: uploadResult?.secure_url || null,
      promptFilePublicId: uploadResult?.public_id || null,
      active: true,
    });

    res.status(201).json({ success: true, data: normalizeTheme(theme) });
  } catch (err) {
    console.error('[themes] create error', err);
    res.status(500).json({ success: false, message: 'Erro ao criar tema' });
  }
}

async function updateTheme(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const theme = await EssayTheme.findById(id);
    if (!theme) {
      return res.status(404).json({ success: false, message: 'Tema não encontrado' });
    }

    if (req.body.title !== undefined || req.body.name !== undefined) {
      const titleRaw = typeof req.body.title === 'string' ? req.body.title : req.body.name;
      const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
      if (!title) {
        return res.status(400).json({ success: false, message: 'Título do tema obrigatório' });
      }
      theme.name = title;
    }

    if (req.body.type !== undefined) {
      const typeRaw = String(req.body.type).trim().toUpperCase();
      if (!['ENEM', 'PAS'].includes(typeRaw)) {
        return res.status(400).json({ success: false, message: 'Tipo de tema inválido' });
      }
      theme.type = typeRaw;
    }

    if (req.body.description !== undefined) {
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
      theme.description = description || null;
    }

    if (req.body.active !== undefined) {
      if (typeof req.body.active === 'string') {
        theme.active = req.body.active.trim().toLowerCase() === 'true';
      } else {
        theme.active = Boolean(req.body.active);
      }
    }

    if (req.file) {
      if (theme.promptFilePublicId) {
        try {
          await cloudinary.uploader.destroy(theme.promptFilePublicId);
        } catch (err) {
          console.warn('[themes] falha ao remover arquivo anterior', err?.message || err);
        }
      }
      const uploadResult = await uploadBuffer(req.file.buffer, 'essays/themes', req.file.mimetype || 'application/octet-stream', { returnResult: true });
      theme.promptFileUrl = uploadResult?.secure_url || null;
      theme.promptFilePublicId = uploadResult?.public_id || null;
    }

    await theme.save();

    res.json({ success: true, data: normalizeTheme(theme) });
  } catch (err) {
    console.error('[themes] update error', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar tema' });
  }
}

async function deleteTheme(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const theme = await EssayTheme.findById(id);
    if (!theme) {
      return res.status(404).json({ success: false, message: 'Tema não encontrado' });
    }

    if (theme.promptFilePublicId) {
      try {
        await cloudinary.uploader.destroy(theme.promptFilePublicId);
      } catch (err) {
        console.warn('[themes] falha ao remover arquivo tema', err?.message || err);
      }
    }

    await theme.deleteOne();
    res.json({ success: true, data: null });
  } catch (err) {
    console.error('[themes] delete error', err);
    res.status(500).json({ success: false, message: 'Erro ao remover tema' });
  }
}

async function deleteTheme(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const theme = await EssayTheme.findById(id);
    if (!theme) {
      return res.status(404).json({ success: false, message: 'Tema não encontrado' });
    }

    if (theme.promptFilePublicId) {
      try {
        await cloudinary.uploader.destroy(theme.promptFilePublicId);
      } catch (err) {
        console.warn('[themes] falha ao remover arquivo associado', err?.message || err);
      }
    }

    await theme.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error('[themes] delete error', err);
    res.status(500).json({ success: false, message: 'Erro ao remover tema' });
  }
}

// Create essay
async function createEssay(req, res) {
  try {
    if (req.body && req.body.status) {
      req.body.status = String(req.body.status).toLowerCase();
    }
    const { type, bimester, themeId, customTheme } = req.body;
    const typeNormalized = typeof type === 'string' ? type.trim().toUpperCase() : '';
    const requiresBimester = typeNormalized !== 'ENEM';
    if (!req.file || !['ENEM', 'PAS'].includes(typeNormalized) || (requiresBimester && !bimester) || (!themeId && !customTheme)) {
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

    const originalUrl = await uploadBuffer(req.file.buffer, 'essays/original', req.file.mimetype);

    let essay = await Essay.create({
      studentId,
      classId,
      type: typeNormalized,
      bimester: bimester ? Number(bimester) : null,
      themeId: themeId || null,
      customTheme: customTheme || null,
      originalUrl,
      originalMimeType: (req.file && req.file.mimetype) ? req.file.mimetype : 'application/pdf'
    });

    essay = await essay.populate([
      { path: 'studentId', select: 'name email photo rollNumber class' },
      { path: 'classId', select: 'series letter discipline name' },
      { path: 'themeId', select: 'name type active' },
    ]);
    const payload = normalizeEssayDetail(essay.toObject());
    res.status(201).json({ success: true, data: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao enviar redação' });
  }
}

async function updateEssay(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const { themeId, customTheme, bimester, type, studentId } = req.body || {};
    const update = {};

    if (themeId !== undefined) {
      update.themeId = themeId || null;
      if (themeId) update.customTheme = null;
    }
    if (customTheme !== undefined) {
      update.customTheme = customTheme || null;
      if (customTheme) update.themeId = null;
    }
    if (bimester !== undefined) {
      update.bimester = bimester === '' || bimester === null ? null : Number(bimester);
    }
    if (type !== undefined) {
      update.type = typeof type === 'string' ? type.trim().toUpperCase() : type;
    }
    if (studentId !== undefined) update.studentId = studentId || null;

    if (req.file) {
  const originalUrl = await uploadBuffer(req.file.buffer, 'essays/original', req.file.mimetype);
      update.originalUrl = originalUrl;
      update.originalMimeType = req.file.mimetype || 'application/pdf';
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Nenhum dado para atualizar' });
    }

    const essay = await Essay.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('studentId', 'name email photo rollNumber class')
      .populate('classId', 'series letter discipline name')
      .populate('themeId', 'name type active');
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    const payload = normalizeEssayDetail(essay.toObject());
    res.json({ success: true, data: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar redação' });
  }
}

// List essays
async function listEssays(req, res) {
  const filter = {};
  const { status, classId, studentId, bimester, type, q } = req.query;

  if (typeof status === 'string' && status.trim()) {
    const normalizedStatus = normalizeStatusValue(status, { defaultValue: null });
    if (normalizedStatus) {
      filter.status = normalizedStatus;
    }
  }

  if (bimester) filter.bimester = Number(bimester);
  if (type) filter.type = String(type).trim().toUpperCase();
  if (req.profile === 'student') {
    filter.studentId = req.user._id;
  } else {
    if (studentId) {
      if (!isValidObjectId(studentId)) {
        return res.status(400).json({ message: 'Aluno inválido' });
      }
      filter.studentId = studentId;
    }
    if (classId) {
      if (!isValidObjectId(classId)) {
        return res.status(400).json({ message: 'Turma inválida' });
      }
      filter.classId = classId;
    }
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
      return res.json({ success: true, data: [], items: [], total: 0, page, limit });
    }
    filter.studentId = filter.studentId ? filter.studentId : { $in: studentIdsFilter };
    if (filter.studentId && filter.studentId.$in) {
      // no-op, already set via $in
    }
  }

  const [items, total] = await Promise.all([
    Essay.find(filter)
      .populate('studentId', 'name rollNumber photo class')
      .populate('classId', 'series letter discipline name')
      .populate('themeId', 'name type')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Essay.countDocuments(filter)
  ]);

  const data = items.map((essay) => normalizeEssaySummary(essay));

  res.json({
    success: true,
    data,
    items: data,
    total,
    page,
    limit,
  });
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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    await assertUserCanAccessEssay(req.user, essay);

    const {
      annulmentReason,
      bimestreWeight,
      enemCompetencies = {},
      pasBreakdown = {},
      comments,
      sendEmail = true,
      countInBimestral,
      bimestralPointsValue
    } = req.body;

    if (bimestreWeight === undefined) {
      return res.status(400).json({ message: 'bimestreWeight é obrigatório' });
    }
    const weight = Number(bimestreWeight);
    if (isNaN(weight) || weight < 0 || weight > 10) {
      return res.status(400).json({ message: 'bimestreWeight inválido' });
    }
    const bVal = bimestralPointsValue != null ? Number(bimestralPointsValue) : null;

    let correctedUrl = essay.correctedUrl;
    if (req.file) {
      correctedUrl = await uploadBuffer(req.file.buffer, 'essays/corrected', req.file.mimetype || 'application/pdf');
    }

    let rawScore = null;
    let scaledScore = null;
    let bimestralComputedScore = null;

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
      if (bVal != null && !isNaN(bVal)) {
        bimestralComputedScore = roundToOneDecimal(bVal * normalized);
        if (bimestralComputedScore > bVal) bimestralComputedScore = bVal;
      }
      essay.enemRubric = undefined;
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
      if (bVal != null && !isNaN(bVal)) {
        bimestralComputedScore = roundToOneDecimal(bVal * normalized);
        if (bimestralComputedScore > bVal) bimestralComputedScore = bVal;
      }
    }

    essay.annulmentReason = annulmentReason || null;
    essay.bimestreWeight = weight;
    essay.rawScore = rawScore;
    essay.scaledScore = scaledScore;
    essay.countInBimestral = Boolean(countInBimestral);
    essay.bimestralPointsValue = bVal;
    essay.bimestralComputedScore = bimestralComputedScore;
    essay.enemCompetencies = essay.type === 'ENEM' ? enemCompetencies : undefined;
    essay.correctedUrl = correctedUrl;
    essay.teacherId = req.user._id;
    essay.status = 'ready';
    essay.comments = comments || null;
    essay.isCorrected = true;
    if (!essay.correctedAt) essay.correctedAt = new Date();

    await essay.save();

    // integração com notas da classe
    const themeName = essay.themeId
      ? (await EssayTheme.findById(essay.themeId))?.name
      : essay.customTheme;
    await recordEssayScore({
      studentId: essay.studentId,
      classId: essay.classId,
      bimester: essay.bimester,
      points: bimestralComputedScore != null ? bimestralComputedScore : scaledScore,
      maxPoints: bVal != null ? bVal : weight,
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
    const status = err?.status || 500;
    if (status === 401 || status === 403) {
      logEssayAuth(status, req, { essayId: id, reason: err?.reason || err?.message });
      return res.status(status).json({ success: false, message: err?.message || 'Acesso negado' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao corrigir redação' });
  }
}

// Update annotations
async function updateAnnotations(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
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
    // Ensure annotation numbers are sequential before saving
    if (Array.isArray(essay.annotations)) {
      essay.annotations = ensureAnnotationNumbers(essay.annotations);
    }
    if (Array.isArray(essay.richAnnotations)) {
      essay.richAnnotations = ensureAnnotationNumbers(essay.richAnnotations);
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
    const payload = normalizeEssayDetail(essay.toObject());
    res.json({ success: true, data: payload });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) {
      logEssayAuth(status, req, { essayId: id, reason: err?.reason || err?.message });
      return res.status(status).json({ success: false, message: err?.message || 'Acesso negado' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar anotações' });
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
    const correctedUrl = await uploadBuffer(pdfBuffer, 'essays/corrected', 'application/pdf');

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

    res.json({ success: true, data: { correctedUrl } });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) {
      logEssayAuth(status, req, { essayId: req.params?.id, reason: err?.reason || err?.message });
      return res.status(status).json({ success: false, message: err?.message || 'Acesso negado' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao gerar correção' });
  }
}

// Send correction email separately
async function sendCorrectionEmail(req, res) {
  try {
    const { id } = req.params;
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    const student = await Student.findById(essay.studentId);
    if (!student) return res.status(404).json({ message: 'Aluno não encontrado' });
    const classInfo = await Class.findById(essay.classId);
    const themeName = essay.themeId
      ? (await EssayTheme.findById(essay.themeId))?.name
      : essay.customTheme;

    const html = `<!DOCTYPE html><p>Olá ${student.name},</p>` +
      `<p>Sua redação foi corrigida.</p>` +
      `<p>Turma: ${classInfo.series}${classInfo.letter} - ${classInfo.discipline}</p>` +
      `<p>Bimestre: ${essay.bimester}</p>` +
      `<p>Tipo: ${essay.type}</p>` +
      `<p>Tema: ${themeName}</p>` +
      `<p>Nota: ${essay.rawScore}</p>` +
      `<p>Nota bimestral: ${essay.scaledScore}</p>` +
      `<p><a href="${essay.correctedUrl}">Baixar correção</a></p>`;

    await sendEmail({ to: student.email, subject: 'Sua redação foi corrigida', html });

    essay.email = essay.email || {};
    essay.email.lastSentAt = new Date();
    await essay.save();

    res.json({ success: true, message: 'Email enviado' });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) {
      logEssayAuth(status, req, { essayId: req.params?.id, reason: err?.reason || err?.message });
      return res.status(status).json({ success: false, message: err?.message || 'Acesso negado' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao enviar email' });
  }
}

async function listEssayAnnotations(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const annotations = await EssayAnnotation.find({ essayId: id }).sort({ number: 1, createdAt: 1 }).lean();
    const payload = annotations.map((ann) => mapAnnotationResponse(ann));
    const normalized = ensureAnnotationNumbers(payload).sort((a, b) => a.number - b.number);
    const highlights = normalized.flatMap((ann) =>
      ann.rects.map((rect) => ({
        page: ann.page,
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h,
        color: ann.color,
        category: ann.category,
        number: ann.number,
      }))
    );
    const comments = normalized.map((ann) => ({
      page: ann.page,
      text: ann.comment,
      number: ann.number,
      category: ann.category,
    }));
    return res.json({ data: normalized, annotations: normalized, highlights, comments });
  } catch (err) {
    console.error('[essays] list annotations failed', err);
    return res.status(500).json({ message: 'Erro ao carregar anotações' });
  }
}

async function saveEssayAnnotationsBatch(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const essay = await Essay.findById(id).select('_id');
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    const annotationsInput = Array.isArray(req.body?.annotations) ? req.body.annotations : [];
    const createdBy = req.auth?.userId || req.user?._id || null;
    const normalized = annotationsInput
      .map((ann, idx) => normalizeAnnotationInput(ann, idx, essay._id, createdBy))
      .filter(Boolean);

    await EssayAnnotation.deleteMany({ essayId: essay._id });
    let saved = [];
    if (normalized.length) {
      saved = await EssayAnnotation.insertMany(normalized, { ordered: true });
    }

    essay.updatedAt = new Date();
    await essay.save({ timestamps: false });

    const payload = saved.map((ann) => mapAnnotationResponse(ann));
    const normalizedPayload = ensureAnnotationNumbers(payload).sort((a, b) => a.number - b.number);
    const highlights = normalizedPayload.flatMap((ann) =>
      ann.rects.map((rect) => ({
        page: ann.page,
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h,
        color: ann.color,
        category: ann.category,
        number: ann.number,
      }))
    );
    const comments = normalizedPayload.map((ann) => ({
      page: ann.page,
      text: ann.comment,
      number: ann.number,
      category: ann.category,
    }));
    return res.json({ data: normalizedPayload, annotations: normalizedPayload, highlights, comments });
  } catch (err) {
    console.error('[essays] save annotations failed', err);
    return res.status(500).json({ message: 'Erro ao salvar anotações' });
  }
}

async function deleteEssayAnnotation(req, res) {
  const { id, annotationId } = req.params;
  if (!isValidObjectId(id) || !isValidObjectId(annotationId)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const deleted = await EssayAnnotation.findOneAndDelete({ _id: annotationId, essayId: id });
    if (!deleted) {
      return res.status(404).json({ message: 'Anotação não encontrada' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[essays] delete annotation failed', err);
    return res.status(500).json({ message: 'Erro ao remover anotação' });
  }
}

async function deleteEssay(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const essay = await Essay.findById(id);
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }

    await Promise.all([
      EssayAnnotation.deleteMany({ essayId: id }).catch((err) => {
        console.warn('[essays] failed to cleanup annotations for essay', id, err);
      }),
      Essay.findByIdAndDelete(id),
    ]);

    return res.json({ success: true });
  } catch (err) {
    console.error('[essays] delete failed', err);
    return res.status(500).json({ message: 'Erro ao excluir redação' });
  }
}

function normalizeEssayScoreResponse(essay) {
  const reasons = Array.isArray(essay.annulReasons) ? essay.annulReasons : [];
  const annulled = reasons.length > 0 || Boolean(essay.annulmentReason);
  const pas = essay.pasBreakdown || {};
  const enemPointsFallback = essay.enemCompetencies || {};
  const rubricSelections = essay.enemRubric || {};

  const enemLevels = [];
  const enemPoints = [];
  const competencyPayload = {};

  ENEM_RUBRIC.forEach((competency, index) => {
    const key = competency.key;
    const selection = rubricSelections[key] || {};
    const levelFromSelection = typeof selection.level === 'number' ? selection.level : undefined;
    const pointsFromEssay = enemPointsFallback[`c${index + 1}`];
    const inferredLevel = typeof pointsFromEssay === 'number' ? Math.round(pointsFromEssay / 40) : undefined;
    const levelData =
      getEnemLevelData(key, levelFromSelection ?? inferredLevel ?? competency.levels[0]?.level ?? 0) ||
      competency.levels[0];
    const validReasonIds = levelData?.rationale ? collectRubricReasonIds(levelData.rationale) : [];
    const reasonIds = Array.isArray(selection.reasonIds)
      ? selection.reasonIds.filter((id) => validReasonIds.includes(id))
      : [];

    enemLevels.push(levelData.level);
    const points = typeof pointsFromEssay === 'number' ? pointsFromEssay : levelData?.points ?? 0;
    enemPoints.push(points);
    competencyPayload[key] = { level: levelData.level, reasonIds };
  });

  const enemTotal = enemPoints.reduce((acc, value) => acc + value, 0);

  const pasBreakdown = pas || {};
  const pasErrors = pasBreakdown.erros || {};
  const macroKeys = ['apresentacao', 'argumentacao', 'adequacao', 'coesao'];
  const macroSum = macroKeys.reduce(
    (acc, key) => acc + (Number.isFinite(pasBreakdown[key]) ? Number(pasBreakdown[key]) : 0),
    0
  );
  const inferredNc =
    Number.isFinite(pasBreakdown.NC) && pasBreakdown.NC != null
      ? Number(pasBreakdown.NC)
      : roundToTwoDecimals(macroSum);
  const tlValue =
    Number.isFinite(pasBreakdown.TL) && pasBreakdown.TL != null
      ? Number(pasBreakdown.TL)
      : Number.isFinite(pasBreakdown.NL)
        ? Number(pasBreakdown.NL)
        : null;
  const inferredNe =
    Number.isFinite(pasBreakdown.NE) && pasBreakdown.NE != null
      ? Number(pasBreakdown.NE)
      : (Number.isFinite(pasErrors.grafia) ? pasErrors.grafia : 0) +
        (Number.isFinite(pasErrors.pontuacao) ? pasErrors.pontuacao : 0) +
        (Number.isFinite(pasErrors.propriedade) ? pasErrors.propriedade : 0);
  const pasDiscount =
    Number.isFinite(pasBreakdown.descontoPorErro) && pasBreakdown.descontoPorErro > 0
      ? pasBreakdown.descontoPorErro
      : tlValue && tlValue > 0
        ? Number((2 / tlValue).toFixed(3))
        : null;
  const pasNr =
    pasBreakdown.NR != null
      ? pasBreakdown.NR
      : essay.rawScore != null
        ? essay.rawScore
        : annulled
          ? 0
          : null;

  return {
    type: essay.type || null,
    annulled,
    reasons: reasons.length ? reasons : (essay.annulmentReason ? [essay.annulmentReason] : []),
    otherReason: essay.annulOtherReason || null,
    pas: {
      apresentacao: Number.isFinite(pasBreakdown.apresentacao) ? pasBreakdown.apresentacao : null,
      argumentacao: Number.isFinite(pasBreakdown.argumentacao) ? pasBreakdown.argumentacao : null,
      adequacao: Number.isFinite(pasBreakdown.adequacao) ? pasBreakdown.adequacao : null,
      coesao: Number.isFinite(pasBreakdown.coesao) ? pasBreakdown.coesao : null,
      NC: inferredNc != null ? inferredNc : null,
      TL: tlValue != null ? tlValue : null,
      NL: tlValue != null ? tlValue : null,
      NE: inferredNe != null ? inferredNe : null,
      descontoPorErro: pasDiscount,
      NR: annulled ? 0 : pasNr,
      erros: {
        grafia: Number.isFinite(pasErrors.grafia) ? pasErrors.grafia : 0,
        pontuacao: Number.isFinite(pasErrors.pontuacao) ? pasErrors.pontuacao : 0,
        propriedade: Number.isFinite(pasErrors.propriedade) ? pasErrors.propriedade : 0,
        observacao: pasErrors.observacao || null,
      },
    },
    enem: {
      levels: enemLevels,
      points: enemPoints,
      total: annulled ? 0 : enemTotal,
      competencies: competencyPayload,
    },
  };
}

async function getEssayScoreController(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const essay = await Essay.findById(id)
      .select('type pasBreakdown enemCompetencies enemRubric rawScore annulReasons annulmentReason annulOtherReason');
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });
    return res.json({ data: normalizeEssayScoreResponse(essay) });
  } catch (err) {
    console.error('[essays] get score failed', err);
    return res.status(500).json({ message: 'Erro ao carregar espelho' });
  }
}

async function saveEssayScoreController(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    const body = req.body || {};
    const reasonsRaw = Array.isArray(body.reasons) ? body.reasons : [];
    const normalizedReasons = reasonsRaw
      .map((reason) => (typeof reason === 'string' ? reason : String(reason ?? '')).trim())
      .filter(Boolean);
    const type = typeof body.type === 'string' ? body.type.toUpperCase() : essay.type;
    const annulled = Boolean(body.annulled) || normalizedReasons.length > 0;
    const otherReason = typeof body.otherReason === 'string' ? body.otherReason.trim() : null;

    essay.annulReasons = normalizedReasons;
    essay.annulOtherReason = otherReason || null;
    if (!annulled) {
      essay.annulmentReason = null;
    } else {
      const legacyReason = normalizedReasons.find((reason) => LEGACY_ANNUL_REASONS.has(reason));
      if (legacyReason) {
        essay.annulmentReason = legacyReason;
      } else if (LEGACY_ANNUL_REASONS.has(essay.annulmentReason)) {
        // mantém valor anterior
      } else if (normalizedReasons.includes('MENOS_7_LINHAS')) {
        essay.annulmentReason = 'MENOS_7_LINHAS';
      } else {
        essay.annulmentReason = null;
      }
    }

    if (type === 'PAS') {
      essay.type = 'PAS';
      essay.enemRubric = undefined;
      essay.enemCompetencies = undefined;

      const pasBody = body?.pas || {};
      const existing = essay.pasBreakdown || {};

      const toNumber = (value) => {
        if (value === '' || value === null || value === undefined) return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      };

      const clampRange = (incoming, fallback, min, max) => {
        const parsed = toNumber(incoming);
        const base = parsed != null ? parsed : fallback != null ? Number(fallback) : null;
        if (base == null) return null;
        return clamp(base, min, max);
      };

      const macroDefs = [
        { key: 'apresentacao', max: 0.5 },
        { key: 'argumentacao', max: 4.5 },
        { key: 'adequacao', max: 2 },
        { key: 'coesao', max: 3 },
      ];

      const macros = {};
      macroDefs.forEach(({ key, max }) => {
        macros[key] = clampRange(pasBody[key], existing[key], 0, max);
      });

      const hasMacroInput = macroDefs.some(({ key }) => pasBody[key] != null);
      const macroTotal = macroDefs.reduce(
        (acc, { key }) => acc + (Number.isFinite(macros[key]) ? Number(macros[key]) : 0),
        0
      );
      const providedNC = toNumber(pasBody.NC);
      let nc = hasMacroInput ? roundToTwoDecimals(macroTotal) : null;
      if (nc == null) {
        if (providedNC != null) {
          nc = roundToTwoDecimals(clamp(providedNC, 0, 10));
        } else if (Number.isFinite(existing.NC)) {
          nc = Number(existing.NC);
        } else {
          nc = roundToTwoDecimals(macroTotal);
        }
      }

      const tl = clampRange(pasBody.TL ?? pasBody.NL, existing.TL ?? existing.NL, 8, 30);

      const errosBody = pasBody.erros || {};
      const parseCount = (incoming, fallback) => {
        const parsed = toNumber(incoming);
        const base = parsed != null ? parsed : fallback != null ? Number(fallback) : 0;
        const normalized = Number.isFinite(base) ? Math.max(0, Math.floor(base)) : 0;
        return normalized;
      };

      const grafia = parseCount(errosBody.grafia, existing?.erros?.grafia);
      const pontuacao = parseCount(errosBody.pontuacao, existing?.erros?.pontuacao);
      const propriedade = parseCount(errosBody.propriedade, existing?.erros?.propriedade);
      const observacao =
        typeof errosBody.observacao === 'string'
          ? errosBody.observacao.trim()
          : existing?.erros?.observacao || null;

      const hasErrorInput =
        errosBody.grafia != null ||
        errosBody.pontuacao != null ||
        errosBody.propriedade != null;

      const neFromCategories = grafia + pontuacao + propriedade;
      const providedNE = toNumber(pasBody.NE);
      const ne =
        hasErrorInput
          ? neFromCategories
          : providedNE != null
            ? Math.max(0, Math.floor(providedNE))
            : existing.NE ?? neFromCategories;

      const descontoPorErro =
        Number.isFinite(tl) && tl > 0
          ? Number((2 / tl).toFixed(3))
          : existing.descontoPorErro ?? null;

      let nr = null;
      if (!annulled && nc != null && ne != null && descontoPorErro != null) {
        nr = roundToTwoDecimals(Math.max(0, nc - ne * descontoPorErro));
      }
      if (!annulled && nr == null) {
        const providedNR = toNumber(pasBody.NR);
        nr =
          providedNR != null
            ? roundToTwoDecimals(Math.max(0, providedNR))
            : existing.NR != null
              ? Number(existing.NR)
              : essay.rawScore ?? null;
      }
      if (annulled) nr = 0;

      essay.pasBreakdown = {
        apresentacao: Number.isFinite(macros.apresentacao) ? macros.apresentacao : null,
        argumentacao: Number.isFinite(macros.argumentacao) ? macros.argumentacao : null,
        adequacao: Number.isFinite(macros.adequacao) ? macros.adequacao : null,
        coesao: Number.isFinite(macros.coesao) ? macros.coesao : null,
        NC: nc != null ? roundToTwoDecimals(nc) : null,
        NL: Number.isFinite(tl) ? tl : null,
        TL: Number.isFinite(tl) ? tl : null,
        NE: Number.isFinite(ne) ? ne : null,
        descontoPorErro: descontoPorErro != null ? descontoPorErro : null,
        NR: nr != null ? nr : null,
        erros: {
          grafia,
          pontuacao,
          propriedade,
          observacao,
        },
      };

      essay.rawScore = annulled ? 0 : nr != null ? nr : existing.NR ?? 0;
      essay.enemRubric = undefined;
      essay.enemCompetencies = undefined;
    } else {
      essay.type = 'ENEM';
      const incoming = body?.enem?.competencies;
      if (incoming && typeof incoming === 'object') {
        const points = [];
        const rubricStore = {};
        ENEM_RUBRIC.forEach((competency, index) => {
          const key = competency.key;
          const selection = incoming[key] || {};
          const levelValue = typeof selection.level === 'number' ? selection.level : undefined;
          const levelData = getEnemLevelData(key, levelValue ?? competency.levels[0]?.level ?? 0) || competency.levels[0];
          const validReasonIds = levelData?.rationale ? collectRubricReasonIds(levelData.rationale) : [];
          const reasonIds = Array.isArray(selection.reasonIds)
            ? Array.from(new Set(selection.reasonIds.filter((id) => validReasonIds.includes(id))))
            : [];
          points[index] = levelData?.points ?? 0;
          rubricStore[key] = { level: levelData.level, reasonIds };
        });
        essay.enemCompetencies = {
          c1: points[0] ?? 0,
          c2: points[1] ?? 0,
          c3: points[2] ?? 0,
          c4: points[3] ?? 0,
          c5: points[4] ?? 0,
        };
        essay.enemRubric = rubricStore;
        const total = annulled ? 0 : points.reduce((acc, value) => acc + value, 0);
        essay.rawScore = total;
      } else {
        const levels = Array.isArray(body?.enem?.levels)
          ? body.enem.levels.map((lvl) => Math.max(0, Math.min(Number(lvl) || 0, 5)))
          : [0, 0, 0, 0, 0];
        const points = [];
        const rubricStore = {};
        ENEM_RUBRIC.forEach((competency, index) => {
          const levelValue = levels[index] ?? competency.levels[0]?.level ?? 0;
          const levelData = getEnemLevelData(competency.key, levelValue) || competency.levels[0];
          points[index] = levelData?.points ?? 0;
          rubricStore[competency.key] = { level: levelData.level, reasonIds: [] };
        });
        essay.enemCompetencies = {
          c1: points[0] ?? 0,
          c2: points[1] ?? 0,
          c3: points[2] ?? 0,
          c4: points[3] ?? 0,
          c5: points[4] ?? 0,
        };
        essay.enemRubric = rubricStore;
        const total = annulled ? 0 : points.reduce((acc, value) => acc + value, 0);
        essay.rawScore = total;
      }
    }

    essay.updatedAt = new Date();
    essay.status = 'ready';
    essay.isCorrected = true;
    essay.correctedAt = new Date();
    await essay.save();
    const normalized = normalizeEssayScoreResponse(essay);
    return res.json({
      data: {
        ...normalized,
        status: essay.status,
        isCorrected: essay.isCorrected,
        correctedAt: essay.correctedAt,
      },
    });
  } catch (err) {
    console.error('[essays] save score failed', err);
    return res.status(500).json({ message: 'Erro ao salvar espelho' });
  }
}

async function generateFinalPdf(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const essay = await Essay.findById(id).populate('studentId').populate('classId');
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    const annotationsDocs = await EssayAnnotation.find({ essayId: id }).sort({ number: 1 }).lean();
    const annotations = annotationsDocs.map((ann) => mapAnnotationResponse(ann));
    const annotationsNorm = ensureAnnotationNumbers(annotations).sort((a, b) => a.number - b.number);
    const score = normalizeEssayScoreResponse(essay);
    const buffer = await generateCorrectedEssayPdf({
      essay,
      annotations: annotationsNorm,
      score,
      student: essay.studentId,
      classInfo: essay.classId,
    });

    const corrected = await uploadBuffer(buffer, 'essays/corrected', 'application/pdf', { returnResult: true });
    essay.correctedUrl = corrected?.secure_url || corrected || essay.correctedUrl;
    essay.correctionPdf = essay.correctionPdf || essay.correctedUrl;
    essay.status = 'ready';
    essay.isCorrected = true;
    essay.correctedAt = new Date();
    await essay.save();

    const normalized = normalizeEssayScoreResponse(essay);
    return res.json({
      data: {
        ...normalized,
        status: essay.status,
        isCorrected: essay.isCorrected,
        correctedAt: essay.correctedAt,
        correctedUrl: essay.correctedUrl,
      },
    });
  } catch (err) {
    console.error('[essays] final pdf failed', err);
    return res.status(500).json({ message: 'Erro ao gerar PDF corrigido' });
  }
}

async function uploadCorrectionPdf(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: 'Arquivo PDF inválido ou vazio.' });
    }

    const essay = await Essay.findById(id);
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }

    await assertUserCanAccessEssay(req.user, essay);

    if (essay.correctionPdfPublicId) {
      try {
        await cloudinary.uploader.destroy(essay.correctionPdfPublicId, { resource_type: 'raw' });
      } catch (destroyErr) {
        console.warn('[essays] Falha ao remover PDF anterior', {
          essayId: id,
          error: destroyErr?.message,
        });
      }
    }

    const uploadResult = await uploadBuffer(req.body, 'essays/corrected', 'application/pdf', {
      returnResult: true,
    });

    const correctionUrl = uploadResult?.secure_url || uploadResult?.url || null;
    if (!correctionUrl) {
      return res.status(502).json({ message: 'Não foi possível salvar o PDF de correção.' });
    }

    essay.correctionPdf = correctionUrl;
    if (uploadResult?.public_id) {
      essay.correctionPdfPublicId = uploadResult.public_id;
    }
    if (!essay.correctedUrl) {
      essay.correctedUrl = correctionUrl;
    }
    essay.status = 'ready';
    essay.isCorrected = true;
    essay.correctedAt = new Date();

    await essay.save();

    return res.json({
      success: true,
      data: {
        correctionPdf: correctionUrl,
        correctedUrl: essay.correctedUrl,
        isCorrected: essay.isCorrected,
        correctedAt: essay.correctedAt,
        status: essay.status,
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) {
      logEssayAuth(status, req, { essayId: req.params?.id, reason: err?.reason || err?.message });
      return res.status(status).json({ success: false, message: err?.message || 'Acesso negado' });
    }
    console.error('[essays] uploadCorrectionPdf error', err);
    return res.status(500).json({ success: false, message: 'Erro ao enviar PDF de correção.' });
  }
}

module.exports = {
  upload,
  getEssay,
  getThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  createEssay,
  updateEssay,
  listEssays,
  gradeEssay,
  updateAnnotations,
  renderCorrection,
  sendCorrectionEmail,
  listEssayAnnotations,
  saveEssayAnnotationsBatch,
  deleteEssayAnnotation,
  deleteEssay,
  getEssayScore: getEssayScoreController,
  saveEssayScore: saveEssayScoreController,
  generateFinalPdf,
  uploadCorrectionPdf,
  // Compat: endpoints GET/PUT para { highlights:[], comments:[] }
  async getAnnotationsCompat(req, res) {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const essay = await Essay.findById(id).select('richAnnotations');
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });
    const highlights = [];
    const comments = [];
    const rich = Array.isArray(essay.richAnnotations) ? essay.richAnnotations : [];
    for (const a of rich) {
      if (a && a.type === 'highlight' && Array.isArray(a.rects)) {
        for (const r of a.rects) {
          if (r && typeof r.x === 'number') {
            highlights.push({ page: a.page, x: r.x, y: r.y, w: r.w, h: r.h });
          }
        }
      }
      if (a && a.type === 'comment' && a.at) {
        comments.push({ page: a.page, x: a.at.x, y: a.at.y, text: a.text || '' });
      }
    }
    return res.json({ highlights, comments });
  },
  async putAnnotationsCompat(req, res) {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const body = req.body || {};
    const inHigh = Array.isArray(body.highlights) ? body.highlights : [];
    const inCom = Array.isArray(body.comments) ? body.comments : [];
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });
    const prev = Array.isArray(essay.richAnnotations) ? essay.richAnnotations : [];
    // Mantém tipos não cobertos (pen/box/strike) e substitui highlights/comments
    const keep = prev.filter((a) => a && !['highlight', 'comment'].includes(a.type));
    const now = new Date().toISOString();
    const richHighlights = inHigh
      .filter((r) => r && typeof r.page === 'number')
      .map((r) => ({
        id: (global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString(),
        page: r.page,
        type: 'highlight',
        createdAt: now,
        updatedAt: now,
        rects: [{ x: r.x || 0, y: r.y || 0, w: r.w || 0, h: r.h || 0 }],
        opacity: 0.35,
        color: '#FFEB3B'
      }));
    const richComments = inCom
      .filter((c) => c && typeof c.page === 'number')
      .map((c) => ({
        id: (global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString(),
        page: c.page,
        type: 'comment',
        createdAt: now,
        updatedAt: now,
        at: { x: c.x || 0, y: c.y || 0 },
        text: c.text || ''
      }));
    essay.richAnnotations = [...keep, ...richHighlights, ...richComments];
    await essay.save();
    return res.json({ highlights: inHigh, comments: inCom });
  },
  async streamOriginal(req, res) {
    try {
      const { id } = req.params;
      const essay = await Essay.findById(id);
      if (!essay || !essay.originalUrl) return res.status(404).json({ message: 'Arquivo não encontrado' });
  const origUrl = essay.originalUrl;
  const method = (req.method || 'GET').toUpperCase();
  const headers = {};
  if (req.headers['range']) headers['Range'] = req.headers['range'];
  // Para HEAD, alguns provedores não suportam; fazemos GET com Range mínimo para obter cabeçalhos
  const upstreamMethod = method === 'HEAD' ? 'GET' : method;
  if (method === 'HEAD' && !headers['Range']) headers['Range'] = 'bytes=0-0';

      const doRequest = (url, redirectsLeft) => new Promise((resolve) => {
        const h = url.startsWith('https') ? https : http;
  const r = h.request(url, { method: upstreamMethod, headers }, (up) => {
          const status = up.statusCode || 200;
          // Follow 3xx redirects (até 3 saltos)
          if ([301,302,303,307,308].includes(status) && up.headers['location'] && redirectsLeft > 0) {
            const loc = up.headers['location'];
            up.resume();
            try {
              const nextUrl = new URL(loc, url).toString();
              resolve({ type: 'redirect', url: nextUrl });
            } catch {
              resolve({ type: 'error', code: 502, msg: 'Redirecionamento inválido' });
            }
            return;
          }
          if (status >= 400) {
            // Propaga códigos comuns (401/403/404) para facilitar diagnóstico do client
            up.resume();
            if ([401, 403, 404].includes(status)) {
              resolve({ type: 'error', code: status, msg: 'Upstream error' });
              return;
            }
            // 3xx já tratado acima; demais como 502 genérico
            resolve({ type: 'error', code: 502, msg: 'Falha ao obter arquivo (upstream)' });
            return;
          }
          // Sucesso
          resolve({ type: 'ok', stream: up, headers: up.headers });
        });
        r.on('error', () => resolve({ type: 'error', code: 502, msg: 'Falha ao obter arquivo' }));
        r.end();
      });

      // Tenta primeiro uma URL assinada do Cloudinary (se possível), depois cai para a URL original
      const candidates = (() => {
        try {
          const u = new URL(origUrl);
          // Esperado: /<cloud>/<resource_type>/<type>/v<versao>/<public_id>.<ext>
          const parts = u.pathname.split('/').filter(Boolean);
          // parts[0]=<cloud>, [1]=resource_type, [2]=type, [3]=v..., [4..]=public_id segments
          if (parts.length >= 5) {
            const resource_type = parts[1];
            const deliveryType = parts[2];
            const last = parts[parts.length - 1] || '';
            const dot = last.lastIndexOf('.');
            const ext = dot > 0 ? last.slice(dot + 1) : 'pdf';
            const pubSegments = parts.slice(4);
            if (dot > 0) pubSegments[pubSegments.length - 1] = last.slice(0, dot);
            const publicId = pubSegments.join('/');
            const signedUrl = cloudinary.url(`${publicId}.${ext}`, {
              resource_type,
              type: deliveryType,
              sign_url: true,
              secure: true
            });
            return [signedUrl, origUrl];
          }
        } catch {}
        return [origUrl];
      })();

      let result;
      for (let c = 0; c < candidates.length; c++) {
        let current = candidates[c];
        let left = 3;
        // eslint-disable-next-line no-await-in-loop
        while (left >= 0) {
          // eslint-disable-next-line no-await-in-loop
          const r = await doRequest(current, left);
          if (r.type === 'redirect') {
            current = r.url;
            left -= 1;
            continue;
          }
          result = r;
          break;
        }
        if (result && result.type === 'ok') break; // sucesso
      }

      if (!result) return res.status(502).json({ message: 'Falha ao obter arquivo' });
      if (result.type === 'redirect-client') return res.redirect(302, result.url);
      if (result.type !== 'ok') return res.status(result.code || 502).json({ message: result.msg || 'Erro' });

  const up = result.stream;
      const upHeaders = result.headers || {};
      const ct = essay.originalMimeType || upHeaders['content-type'] || 'application/pdf';
      res.setHeader('Content-Type', typeof ct === 'string' ? ct : 'application/pdf');
      if (upHeaders['content-length']) res.setHeader('Content-Length', upHeaders['content-length']);
      if (upHeaders['content-range']) res.setHeader('Content-Range', upHeaders['content-range']);
  // Disposição inline com um nome de arquivo previsível
  const safeName = `redacao-${essay._id || 'arquivo'}.pdf`;
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'private, max-age=0');
      res.setHeader('Accept-Ranges', 'bytes');
      res.status(req.headers['range'] ? 206 : 200);
      if (method === 'HEAD') { up.resume(); res.end(); }
      else { up.pipe(res); }
    } catch (e) {
      res.status(500).json({ message: 'Erro ao transmitir arquivo' });
    }
  }
};
