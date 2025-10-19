const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const ensureStudent = require('../middleware/ensureStudent');
const {
  createAnnouncement,
  listTeacherAnnouncements,
  listStudentAnnouncements,
  listAnnouncements,
  uploadAnnouncementAsset,
} = require('../controllers/announcementsController');
const Announcement = require('../models/Announcement');
const Student = require('../models/Student');

const router = express.Router();

const ACCEPTED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/pjpeg',
  'application/pdf',
]);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || '').toLowerCase();
    if (ACCEPTED_UPLOAD_MIME_TYPES.has(mime)) {
      cb(null, true);
      return;
    }
    const error = new Error('Tipo de arquivo não suportado. Utilize JPG, PNG ou PDF.');
    error.status = 400;
    cb(error);
  },
});

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  if (typeof value === 'object' && value._id && mongoose.Types.ObjectId.isValid(value._id)) {
    return new mongoose.Types.ObjectId(value._id);
  }
  return null;
}

function normalizeAnnouncement(doc) {
  if (!doc) return null;
  const createdAt =
    doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt || new Date().toISOString();
  const audience =
    doc.targetType === 'email'
      ? 'PROFESSORES'
      : doc.includeTeachers
        ? 'AMBOS'
        : 'ALUNOS';
  const attachments = Array.isArray(doc.attachments)
    ? doc.attachments
        .map((attachment) => {
          if (!attachment?.url) return null;
          const bytes = typeof attachment.size === 'number' ? attachment.size : null;
          const sizeKb = bytes !== null ? Number((bytes / 1024).toFixed(1)) : null;
          return {
            url: attachment.url,
            mime: attachment.mime || null,
            sizeKb,
            name: attachment.name || null,
          };
        })
        .filter(Boolean)
    : [];
  return {
    id: String(doc._id),
    title: doc.subject || null,
    html: doc.html || null,
    message: doc.message || null,
    attachments,
    createdAt,
    audience,
  };
}

async function listAnnouncementsForStudent(req, res, next) {
  try {
    const rawStudentId = req.auth?.sub || req.auth?.userId || req.user?._id || req.user?.id;
    const studentId = toObjectId(rawStudentId);
    if (!studentId) {
      return res.status(403).json({ success: false, message: 'Aluno não identificado.' });
    }

    const student = await Student.findById(studentId).select('class').lean();
    if (!student?.class) {
      return res.json({
        success: true,
        data: { items: [], total: 0, limit: 0, skip: 0, hasMore: false },
      });
    }

    let classId = toObjectId(req.query?.classId) || toObjectId(student.class);
    if (!classId || (student.class && !classId.equals(toObjectId(student.class)))) {
      classId = toObjectId(student.class);
    }

    if (!classId) {
      return res.json({
        success: true,
        data: { items: [], total: 0, limit: 0, skip: 0, hasMore: false },
      });
    }

    const limitRaw = Number.parseInt(req.query?.limit, 10);
    const skipRaw = Number.parseInt(req.query?.skip, 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;
    const skip = Number.isFinite(skipRaw) && skipRaw > 0 ? skipRaw : 0;
    const now = new Date();

    const visibilityFilter = {
      $or: [
        { scheduledFor: { $lte: now } },
        { scheduleAt: { $lte: now } },
        { scheduledFor: { $exists: false } },
      ],
    };

    const classFilter = {
      $or: [
        { classIds: { $exists: false } },
        { classIds: { $size: 0 } },
        { classIds: classId },
      ],
    };

    const query = { $and: [classFilter, visibilityFilter] };

    const [items, total] = await Promise.all([
      Announcement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(query),
    ]);

    const payload = {
      items: items.map(normalizeAnnouncement).filter(Boolean),
      total,
      limit,
      skip,
      hasMore: skip + items.length < total,
    };

    return res.json({ success: true, data: payload });
  } catch (err) {
    return next(err);
  }
}

router.get('/', authRequired, (req, res, next) => {
  const role = (req.auth?.role || req.user?.role || '').toString().toLowerCase();
  if (role === 'student') {
    return ensureStudent(req, res, () => listAnnouncementsForStudent(req, res, next));
  }
  return ensureTeacher(req, res, () => listAnnouncements(req, res, next));
});
router.post('/upload', authRequired, ensureTeacher, upload.single('file'), uploadAnnouncementAsset);
router.post('/', authRequired, ensureTeacher, upload.any(), createAnnouncement);
router.get('/teacher/:teacherId', authRequired, listTeacherAnnouncements);
router.get('/student/:studentId', authRequired, listStudentAnnouncements);

module.exports = router;
