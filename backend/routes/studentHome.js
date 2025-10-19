const express = require('express');
const authRequired = require('../middleware/auth');
const ensureStudent = require('../middleware/ensureStudent');
const { getStudentHome } = require('../controllers/studentHomeController');

const router = express.Router();

router.get('/home', authRequired, ensureStudent, getStudentHome);

module.exports = router;
