const express = require('express');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const {
  createAnnouncement,
  listTeacherAnnouncements,
  listStudentAnnouncements,
} = require('../controllers/announcementsController');

const router = express.Router();

router.post('/', authRequired, ensureTeacher, createAnnouncement);
router.get('/teacher/:teacherId', authRequired, listTeacherAnnouncements);
router.get('/student/:studentId', authRequired, listStudentAnnouncements);

module.exports = router;
