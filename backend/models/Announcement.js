const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
    index: true
  },
  classIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  }],
  publishAt: {
    type: Date,
    default: null,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published'],
    default: 'draft',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Índices compostos para performance
announcementSchema.index({ teacherId: 1, status: 1, publishAt: 1 });
announcementSchema.index({ classIds: 1, status: 1, publishAt: 1 });
announcementSchema.index({ publishAt: 1, status: 1 });

// Virtual para determinar se o aviso está publicado
announcementSchema.virtual('isPublished').get(function() {
  if (this.status === 'published') return true;
  if (this.status === 'scheduled' && this.publishAt && new Date() >= this.publishAt) {
    return true;
  }
  return false;
});

// Virtual para determinar se o aviso está agendado
announcementSchema.virtual('isScheduled').get(function() {
  return this.status === 'scheduled' && this.publishAt && new Date() < this.publishAt;
});

// Virtual para determinar se o aviso é um rascunho
announcementSchema.virtual('isDraft').get(function() {
  return this.status === 'draft';
});

// Método para publicar aviso imediatamente
announcementSchema.methods.publishNow = function() {
  this.status = 'published';
  this.publishAt = new Date();
  return this.save();
};

// Método para agendar publicação
announcementSchema.methods.schedule = function(publishAt) {
  this.status = 'scheduled';
  this.publishAt = publishAt;
  return this.save();
};

// Método para cancelar agendamento
announcementSchema.methods.cancelSchedule = function() {
  this.status = 'draft';
  this.publishAt = null;
  return this.save();
};

// Método estático para buscar avisos publicados para alunos
announcementSchema.statics.findPublishedForStudents = function(classIds) {
  const now = new Date();
  return this.find({
    classIds: { $in: classIds },
    isActive: true,
    $or: [
      { status: 'published' },
      { 
        status: 'scheduled', 
        publishAt: { $lte: now } 
      }
    ]
  }).sort({ publishAt: -1, createdAt: -1 });
};

// Método estático para buscar avisos para professores
announcementSchema.statics.findForTeacher = function(teacherId, options = {}) {
  const query = {
    teacherId,
    isActive: true
  };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.classId) {
    query.classIds = options.classId;
  }
  
  return this.find(query).sort({ publishAt: -1, createdAt: -1 });
};

// Middleware para atualizar status automaticamente
announcementSchema.pre('save', function(next) {
  // Se está agendado e a data de publicação já passou, marcar como publicado
  if (this.status === 'scheduled' && this.publishAt && new Date() >= this.publishAt) {
    this.status = 'published';
  }
  next();
});

// Configurar virtuals para JSON
announcementSchema.set('toJSON', { virtuals: true });
announcementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Announcement', announcementSchema);
