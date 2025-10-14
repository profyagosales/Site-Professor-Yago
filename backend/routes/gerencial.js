const express = require('express');
const { login } = require('../controllers/gerencialAuthController');
const ensureGerencial = require('../middleware/ensureGerencial');
const teachersController = require('../controllers/teachersController');
const { upload } = require('../controllers/uploadsController');

const router = express.Router();
const teachersRouter = express.Router();

function withPhotoUpload(req, res, next) {
  const contentType = (req.headers?.['content-type'] || '').toLowerCase();
  if (contentType.startsWith('multipart/form-data')) {
    return upload.single('photo')(req, res, next);
  }
  return next();
}

router.post('/login', login);

teachersRouter.get('/', ensureGerencial, teachersController.list);
teachersRouter.post('/', ensureGerencial, withPhotoUpload, teachersController.create);
teachersRouter.patch('/:id', ensureGerencial, withPhotoUpload, teachersController.update);
teachersRouter.delete('/:id', ensureGerencial, teachersController.remove);

router.use('/teachers', teachersRouter);

module.exports = router;
module.exports.teachersRouter = teachersRouter;
