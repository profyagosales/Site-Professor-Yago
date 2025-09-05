const Schedule = require('../models/Schedule');
const Class = require('../models/Class');

// GET /schedules?classId= - Listar horários de uma turma
exports.getSchedules = async (req, res) => {
  try {
    const { classId } = req.query;
    
    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: 'classId é obrigatório' 
      });
    }
    
    // Verificar se a turma existe e pertence ao professor
    const classExists = await Class.findOne({ 
      _id: classId, 
      teacherId: req.user.id 
    });
    
    if (!classExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Turma não encontrada' 
      });
    }
    
    const schedules = await Schedule.getByClass(classId);
    
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Erro ao buscar horários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// POST /schedules - Criar novo horário
exports.createSchedule = async (req, res) => {
  try {
    const { classId, weekday, startTime, endTime, subject, room } = req.body;
    
    // Validações básicas
    if (!classId || weekday === undefined || !startTime || !endTime || !subject) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos os campos obrigatórios devem ser preenchidos' 
      });
    }
    
    // Verificar se a turma existe e pertence ao professor
    const classExists = await Class.findOne({ 
      _id: classId, 
      teacherId: req.user.id 
    });
    
    if (!classExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Turma não encontrada' 
      });
    }
    
    // Verificar sobreposição de horários
    const overlap = await Schedule.checkOverlap(classId, weekday, startTime, endTime);
    
    if (overlap) {
      return res.status(400).json({ 
        success: false, 
        message: 'Já existe uma aula neste horário para esta turma' 
      });
    }
    
    // Criar novo horário
    const schedule = new Schedule({
      classId,
      weekday: parseInt(weekday),
      startTime,
      endTime,
      subject,
      room: room || '',
      teacherId: req.user.id
    });
    
    await schedule.save();
    
    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Horário criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar horário:', error);
    
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

// PUT /schedules/:id - Atualizar horário
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { weekday, startTime, endTime, subject, room } = req.body;
    
    // Buscar horário existente
    const existingSchedule = await Schedule.findOne({ 
      _id: id, 
      teacherId: req.user.id 
    });
    
    if (!existingSchedule) {
      return res.status(404).json({ 
        success: false, 
        message: 'Horário não encontrado' 
      });
    }
    
    // Verificar sobreposição de horários (excluindo o próprio horário)
    if (weekday !== undefined || startTime || endTime) {
      const overlap = await Schedule.checkOverlap(
        existingSchedule.classId, 
        weekday !== undefined ? parseInt(weekday) : existingSchedule.weekday,
        startTime || existingSchedule.startTime, 
        endTime || existingSchedule.endTime,
        id
      );
      
      if (overlap) {
        return res.status(400).json({ 
          success: false, 
          message: 'Já existe uma aula neste horário para esta turma' 
        });
      }
    }
    
    // Atualizar campos
    const updateData = {};
    if (weekday !== undefined) updateData.weekday = parseInt(weekday);
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (subject) updateData.subject = subject;
    if (room !== undefined) updateData.room = room;
    
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updatedSchedule,
      message: 'Horário atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar horário:', error);
    
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

// DELETE /schedules/:id - Excluir horário
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findOneAndDelete({ 
      _id: id, 
      teacherId: req.user.id 
    });
    
    if (!schedule) {
      return res.status(404).json({ 
        success: false, 
        message: 'Horário não encontrado' 
      });
    }
    
    res.json({
      success: true,
      message: 'Horário excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir horário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// GET /schedules/upcoming - Obter próximas aulas
exports.getUpcomingClasses = async (req, res) => {
  try {
    const { classId, limit = 5 } = req.query;
    
    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: 'classId é obrigatório' 
      });
    }
    
    // Verificar se a turma existe e pertence ao professor
    const classExists = await Class.findOne({ 
      _id: classId, 
      teacherId: req.user.id 
    });
    
    if (!classExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Turma não encontrada' 
      });
    }
    
    const upcomingClasses = await Schedule.getUpcomingClasses(classId, parseInt(limit));
    
    res.json({
      success: true,
      data: upcomingClasses
    });
  } catch (error) {
    console.error('Erro ao buscar próximas aulas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// GET /schedules/today - Obter aulas de hoje
exports.getTodayClasses = async (req, res) => {
  try {
    const { classId } = req.query;
    
    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: 'classId é obrigatório' 
      });
    }
    
    // Verificar se a turma existe e pertence ao professor
    const classExists = await Class.findOne({ 
      _id: classId, 
      teacherId: req.user.id 
    });
    
    if (!classExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Turma não encontrada' 
      });
    }
    
    const todayClasses = await Schedule.getTodayClasses(classId);
    
    res.json({
      success: true,
      data: todayClasses
    });
  } catch (error) {
    console.error('Erro ao buscar aulas de hoje:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};
