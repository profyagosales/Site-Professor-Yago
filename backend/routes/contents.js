const express = require('express');
const Content = require('../models/Content');
const authRequired = require('../middleware/auth');

const router = express.Router();

// Get all contents
router.get('/', authRequired, async (req, res, next) => {
  try {
    const contents = await Content.find();
    res.status(200).json({
      success: true,
      message: 'Conteúdos obtidos com sucesso',
      data: contents
    });
  } catch (err) {
    err.status = 500;
    err.message = 'Erro ao buscar conteúdos';
    next(err);
  }
});

// Create content
router.post('/', authRequired, async (req, res, next) => {
  try {
    const { classId, bimester, title, description, date, done } = req.body;
    const content = await Content.create({
      teacher: req.user._id,
      classId,
      bimester,
      title,
      description,
      date,
      done
    });
    res.status(200).json({
      success: true,
      message: 'Conteúdo criado com sucesso',
      data: content
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao criar conteúdo';
    }
    next(err);
  }
});

// Update content
router.patch('/:id', authRequired, async (req, res, next) => {
  try {
    const content = await Content.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!content) {
      const error = new Error('Conteúdo não encontrado');
      error.status = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      message: 'Conteúdo atualizado com sucesso',
      data: content
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao atualizar conteúdo';
    }
    next(err);
  }
});

// Delete content
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const content = await Content.findByIdAndDelete(req.params.id);
    if (!content) {
      const error = new Error('Conteúdo não encontrado');
      error.status = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      message: 'Conteúdo removido com sucesso',
      data: null
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao remover conteúdo';
    }
    next(err);
  }
});

module.exports = router;
