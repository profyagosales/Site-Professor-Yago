const mongoose = require('mongoose');

const RectSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
  },
  { _id: false }
);

const EssayAnnotationSchema = new mongoose.Schema(
  {
    essayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Essay', required: true, index: true },
    page: { type: Number, required: true },
    rects: { type: [RectSchema], default: [] },
    color: { type: String, required: true },
    category: { type: String, required: true },
    comment: { type: String, default: '' },
    number: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  },
  { timestamps: true }
);

EssayAnnotationSchema.index({ essayId: 1, number: 1 }, { unique: false });

module.exports = mongoose.model('EssayAnnotation', EssayAnnotationSchema, 'essay_annotations');
