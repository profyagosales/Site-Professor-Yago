const express = require('express');
const multer = require('multer');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const {
  createAnnouncement,
  listTeacherAnnouncements,
  listStudentAnnouncements,
  listAnnouncements,
  uploadAnnouncementAsset,
} = require('../controllers/announcementsController');

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

router.get('/', authRequired, ensureTeacher, listAnnouncements);
router.post('/upload', authRequired, ensureTeacher, upload.single('file'), uploadAnnouncementAsset);
router.post('/', authRequired, ensureTeacher, upload.any(), createAnnouncement);
router.get('/teacher/:teacherId', authRequired, listTeacherAnnouncements);
router.get('/student/:studentId', authRequired, listStudentAnnouncements);

module.exports = router;
