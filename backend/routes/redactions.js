const express = require('express');
const { z } = require('zod');
const multer = require('multer');

const upload = multer();
const router = express.Router();

router.get('/themes', (req, res) => {
  res.json({ data: [] });
});

const themeSchema = z.object({ name: z.string() });
router.post('/themes', (req, res, next) => {
  try {
    const body = themeSchema.parse(req.body);
    res.status(201).json({ data: { id: 'tmp', name: body.name, createdAt: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
});

router.get('/submissions/teacher', (req, res) => {
  res.json({ data: [] });
});

router.get('/submissions/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    data: {
      id,
      studentId: 'student',
      classId: 'class',
      model: 'ENEM',
      themeText: 'Tema',
      bimester: 1,
      weightOnBimester: 1,
      fileUrl: '',
      evaluationId: 'evaluation'
    }
  });
});

const submissionSchema = z.object({
  studentId: z.string(),
  classId: z.string(),
  model: z.enum(['ENEM', 'PAS']),
  themeId: z.string().nullish(),
  themeText: z.string().optional(),
  bimester: z.enum(['1', '2', '3', '4']).transform(Number),
  weightOnBimester: z.coerce.number(),
});
router.post('/submissions', upload.single('file'), (req, res, next) => {
  try {
    const data = submissionSchema.parse(req.body);
    res.status(201).json({ data: { id: 'tmp', ...data, fileUrl: '', status: 'uploaded', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pas: null } });
  } catch (err) {
    next(err);
  }
});

const enemSchema = z.object({ enemScore: z.number().min(0).max(1000) });
router.post('/submissions/:id/grade-enem', (req, res, next) => {
  try {
    enemSchema.parse(req.body);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

const pasSchema = z.object({
  NC: z.number().optional(),
  NE: z.number().optional(),
  NL: z.number().optional(),
});
router.post('/submissions/:id/grade-pas', (req, res, next) => {
  try {
    pasSchema.parse(req.body);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

router.post('/submissions/:id/corrected-pdf', (req, res) => {
  res.status(204).end();
});

module.exports = router;
