const express = require('express');
const authRequired = require('../middleware/auth');
const { search, getOne, getEssays } = require('../controllers/studentsController');

const router = express.Router();

router.get('/', authRequired, search);
router.get('/:id', authRequired, getOne);
router.get('/:id/essays', authRequired, getEssays);

module.exports = router;
