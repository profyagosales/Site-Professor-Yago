const express = require('express');
const { loginTeacher, loginStudent } = require('../controllers/authController');

const router = express.Router();

router.post('/login-teacher', loginTeacher);
router.post('/login-student', loginStudent);

module.exports = router;

