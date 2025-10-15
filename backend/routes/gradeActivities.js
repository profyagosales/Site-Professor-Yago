const express = require('express');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const controller = require('../controllers/gradeActivitiesController');

const router = express.Router();

router.use(authRequired);
router.use(ensureTeacher);

router.get('/classes/:classId/activities', controller.listActivities);
router.post('/classes/:classId/activities', controller.createActivity);
router.patch('/classes/:classId/activities/:activityId', controller.updateActivity);
router.delete('/classes/:classId/activities/:activityId', controller.deleteActivity);
router.post('/classes/:classId/activities/:activityId/scores', controller.bulkUpsertScores);

module.exports = router;
