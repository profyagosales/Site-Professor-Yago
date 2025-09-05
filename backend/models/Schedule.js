const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  weekday: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
    validate: {
      validator: Number.isInteger,
      message: 'Weekday must be an integer between 0 and 6'
    }
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:mm format'
    }
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:mm format'
    }
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  room: {
    type: String,
    trim: true,
    maxlength: 50
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  }
}, {
  timestamps: true
});

// Validação customizada para garantir que endTime > startTime
scheduleSchema.pre('validate', function(next) {
  if (this.startTime && this.endTime) {
    const start = this.startTime.split(':').map(Number);
    const end = this.endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    if (endMinutes <= startMinutes) {
      return next(new Error('End time must be after start time'));
    }
  }
  next();
});

// Índice composto para evitar sobreposições
scheduleSchema.index({ classId: 1, weekday: 1, startTime: 1, endTime: 1 });

// Método para verificar sobreposições
scheduleSchema.statics.checkOverlap = async function(classId, weekday, startTime, endTime, excludeId = null) {
  const start = startTime.split(':').map(Number);
  const end = endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  const query = {
    classId,
    weekday,
    $or: [
      // Nova aula começa durante uma aula existente
      {
        startTime: { $lte: startTime },
        endTime: { $gt: startTime }
      },
      // Nova aula termina durante uma aula existente
      {
        startTime: { $lt: endTime },
        endTime: { $gte: endTime }
      },
      // Nova aula engloba uma aula existente
      {
        startTime: { $gte: startTime },
        endTime: { $lte: endTime }
      }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return await this.findOne(query);
};

// Método para obter horários de uma turma
scheduleSchema.statics.getByClass = async function(classId) {
  return await this.find({ classId }).sort({ weekday: 1, startTime: 1 });
};

// Método para obter aulas do dia
scheduleSchema.statics.getTodayClasses = async function(classId) {
  const today = new Date();
  const weekday = today.getDay();
  
  return await this.find({ 
    classId, 
    weekday 
  }).sort({ startTime: 1 });
};

// Método para obter próximas aulas
scheduleSchema.statics.getUpcomingClasses = async function(classId, limit = 5) {
  const today = new Date();
  const currentWeekday = today.getDay();
  const currentTime = today.toTimeString().slice(0, 5);
  
  // Buscar aulas de hoje que ainda não começaram
  const todayClasses = await this.find({
    classId,
    weekday: currentWeekday,
    startTime: { $gte: currentTime }
  }).sort({ startTime: 1 });
  
  // Se não há aulas suficientes hoje, buscar dos próximos dias
  if (todayClasses.length < limit) {
    const remainingDays = [];
    for (let i = 1; i <= 7; i++) {
      const day = (currentWeekday + i) % 7;
      remainingDays.push(day);
    }
    
    const upcomingClasses = await this.find({
      classId,
      weekday: { $in: remainingDays }
    }).sort({ weekday: 1, startTime: 1 }).limit(limit - todayClasses.length);
    
    return [...todayClasses, ...upcomingClasses];
  }
  
  return todayClasses.slice(0, limit);
};

// Virtual para nome do dia da semana
scheduleSchema.virtual('weekdayName').get(function() {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[this.weekday];
});

// Virtual para duração em minutos
scheduleSchema.virtual('durationMinutes').get(function() {
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  return endMinutes - startMinutes;
});

// Virtual para duração formatada
scheduleSchema.virtual('durationFormatted').get(function() {
  const minutes = this.durationMinutes;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${mins}min`;
});

// Configurar virtuals para JSON
scheduleSchema.set('toJSON', { virtuals: true });
scheduleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
