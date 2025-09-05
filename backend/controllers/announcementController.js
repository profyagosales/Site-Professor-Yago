const Announcement = require('../models/Announcement');
const Class = require('../models/Class');

// GET /announcements - Listar avisos para professores
exports.listAnnouncements = async (req, res) => {
  try {
    const { status, classId, limit = 50 } = req.query;
    const teacherId = req.user.id;
    
    const announcements = await Announcement.findForTeacher(teacherId, {
      status,
      classId
    }).limit(parseInt(limit));
    
    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Erro ao listar avisos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// GET /announcements/for-students - Listar avisos para alunos
exports.listAnnouncementsForStudents = async (req, res) => {
  try {
    const { classIds } = req.query;
    
    if (!classIds) {
      return res.status(400).json({ 
        success: false, 
        message: 'classIds é obrigatório' 
      });
    }
    
    const classIdArray = Array.isArray(classIds) ? classIds : [classIds];
    
    const announcements = await Announcement.findPublishedForStudents(classIdArray);
    
    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Erro ao listar avisos para alunos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// POST /announcements - Criar novo aviso
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, classIds, publishAt, priority = 'normal' } = req.body;
    const teacherId = req.user.id;
    
    // Validações básicas
    if (!title || !message || !classIds || classIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Título, mensagem e turmas são obrigatórios' 
      });
    }
    
    // Verificar se as turmas existem e pertencem ao professor
    const classes = await Class.find({ 
      _id: { $in: classIds }, 
      teacherId 
    });
    
    if (classes.length !== classIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Uma ou mais turmas não foram encontradas' 
      });
    }
    
    // Determinar status baseado na data de publicação
    let status = 'draft';
    if (publishAt) {
      const publishDate = new Date(publishAt);
      if (publishDate > new Date()) {
        status = 'scheduled';
      } else {
        status = 'published';
      }
    } else {
      status = 'published';
    }
    
    const announcement = new Announcement({
      title,
      message,
      teacherId,
      classIds,
      publishAt: publishAt ? new Date(publishAt) : new Date(),
      status,
      priority
    });
    
    await announcement.save();
    
    res.status(201).json({
      success: true,
      data: announcement,
      message: status === 'scheduled' ? 'Aviso agendado com sucesso' : 'Aviso publicado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar aviso:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// PUT /announcements/:id - Atualizar aviso
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, classIds, publishAt, priority } = req.body;
    const teacherId = req.user.id;
    
    const announcement = await Announcement.findOne({ 
      _id: id, 
      teacherId 
    });
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aviso não encontrado' 
      });
    }
    
    // Só permite editar se não estiver publicado ou se for o próprio professor
    if (announcement.status === 'published' && announcement.publishAt && new Date() >= announcement.publishAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Não é possível editar avisos já publicados' 
      });
    }
    
    // Atualizar campos
    if (title) announcement.title = title;
    if (message) announcement.message = message;
    if (classIds) {
      // Verificar se as turmas existem e pertencem ao professor
      const classes = await Class.find({ 
        _id: { $in: classIds }, 
        teacherId 
      });
      
      if (classes.length !== classIds.length) {
        return res.status(400).json({ 
          success: false, 
          message: 'Uma ou mais turmas não foram encontradas' 
        });
      }
      
      announcement.classIds = classIds;
    }
    if (priority) announcement.priority = priority;
    
    // Atualizar data de publicação e status
    if (publishAt !== undefined) {
      if (publishAt) {
        const publishDate = new Date(publishAt);
        if (publishDate > new Date()) {
          announcement.status = 'scheduled';
          announcement.publishAt = publishDate;
        } else {
          announcement.status = 'published';
          announcement.publishAt = publishDate;
        }
      } else {
        announcement.status = 'draft';
        announcement.publishAt = null;
      }
    }
    
    await announcement.save();
    
    res.json({
      success: true,
      data: announcement,
      message: 'Aviso atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar aviso:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// DELETE /announcements/:id - Excluir aviso
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const announcement = await Announcement.findOne({ 
      _id: id, 
      teacherId 
    });
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aviso não encontrado' 
      });
    }
    
    // Marcar como inativo em vez de excluir
    announcement.isActive = false;
    await announcement.save();
    
    res.json({
      success: true,
      message: 'Aviso excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir aviso:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// PATCH /announcements/:id/publish - Publicar aviso imediatamente
exports.publishAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const announcement = await Announcement.findOne({ 
      _id: id, 
      teacherId 
    });
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aviso não encontrado' 
      });
    }
    
    await announcement.publishNow();
    
    res.json({
      success: true,
      data: announcement,
      message: 'Aviso publicado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao publicar aviso:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// PATCH /announcements/:id/schedule - Agendar publicação
exports.scheduleAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { publishAt } = req.body;
    const teacherId = req.user.id;
    
    if (!publishAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'publishAt é obrigatório' 
      });
    }
    
    const announcement = await Announcement.findOne({ 
      _id: id, 
      teacherId 
    });
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aviso não encontrado' 
      });
    }
    
    await announcement.schedule(new Date(publishAt));
    
    res.json({
      success: true,
      data: announcement,
      message: 'Aviso agendado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao agendar aviso:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// PATCH /announcements/:id/cancel-schedule - Cancelar agendamento
exports.cancelSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const announcement = await Announcement.findOne({ 
      _id: id, 
      teacherId 
    });
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aviso não encontrado' 
      });
    }
    
    await announcement.cancelSchedule();
    
    res.json({
      success: true,
      data: announcement,
      message: 'Agendamento cancelado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};
