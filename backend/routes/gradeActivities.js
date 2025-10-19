const express = require('express');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const controller = require('../controllers/gradeActivitiesController');

const router = express.Router();

router.use(authRequired);
router.use(ensureTeacher);

router.get('/grade-activities', controller.listGradeActivities);
router.post('/grade-activities', controller.createGradeActivity);
router.put('/grade-activities/:id', controller.updateGradeActivity);
router.delete('/grade-activities/:id', controller.deleteGradeActivity);
router.post('/grade-activities/:id/grades', controller.bulkSetActivityGrades);

module.exports = router;
