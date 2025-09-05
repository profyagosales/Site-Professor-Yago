const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const auth = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(auth);

// GET /announcements - Listar avisos para professores
router.get('/', announcementController.listAnnouncements);

// GET /announcements/for-students - Listar avisos para alunos
router.get('/for-students', announcementController.listAnnouncementsForStudents);

// POST /announcements - Criar novo aviso
router.post('/', announcementController.createAnnouncement);

// PUT /announcements/:id - Atualizar aviso
router.put('/:id', announcementController.updateAnnouncement);

// DELETE /announcements/:id - Excluir aviso
router.delete('/:id', announcementController.deleteAnnouncement);

// PATCH /announcements/:id/publish - Publicar aviso imediatamente
router.patch('/:id/publish', announcementController.publishAnnouncement);

// PATCH /announcements/:id/schedule - Agendar publicação
router.patch('/:id/schedule', announcementController.scheduleAnnouncement);

// PATCH /announcements/:id/cancel-schedule - Cancelar agendamento
router.patch('/:id/cancel-schedule', announcementController.cancelSchedule);

module.exports = router;
