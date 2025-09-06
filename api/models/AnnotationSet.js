const mongoose = require('mongoose');

const AnnotationSetSchema = new mongoose.Schema({
  essayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Essay',
    required: true,
    unique: true
  },
  highlights: [
    {
      page: {
        type: Number,
        required: true
      },
      rects: [
        {
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          w: { type: Number, required: true },
          h: { type: Number, required: true }
        }
      ],
      color: {
        type: String,
        required: true,
        enum: ['orange', 'green', 'yellow', 'red', 'blue']
      },
      category: {
        type: String,
        required: true,
        enum: [
          'formal', // Laranja — Aspectos formais
          'ortografia', // Verde — Ortografia/gramática
          'argumentacao', // Amarelo — Argumentação e estrutura
          'geral', // Vermelho — Comentário geral
          'coesao' // Azul — Coesão e coerência
        ]
      },
      comment: {
        type: String,
        required: true
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  comments: [
    {
      text: {
        type: String,
        required: true
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Atualizar o timestamp de updatedAt
AnnotationSetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AnnotationSet', AnnotationSetSchema);
