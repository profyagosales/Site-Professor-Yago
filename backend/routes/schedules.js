const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const auth = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(auth);

// GET /schedules?classId= - Listar horários de uma turma
router.get('/', scheduleController.getSchedules);

// POST /schedules - Criar novo horário
router.post('/', scheduleController.createSchedule);

// PUT /schedules/:id - Atualizar horário
router.put('/:id', scheduleController.updateSchedule);

// DELETE /schedules/:id - Excluir horário
router.delete('/:id', scheduleController.deleteSchedule);

// GET /schedules/upcoming?classId=&limit= - Obter próximas aulas
router.get('/upcoming', scheduleController.getUpcomingClasses);

// GET /schedules/today?classId= - Obter aulas de hoje
router.get('/today', scheduleController.getTodayClasses);

module.exports = router;
