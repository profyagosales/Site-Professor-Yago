const express = require('express');
const Class = require('../models/Class');

const router = express.Router();

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar turmas' });
  }
});

// Get class by id
router.get('/:id', async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate('students')
      .populate('teachers');
    if (!cls) return res.status(404).json({ error: 'Turma não encontrada' });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar turma' });
  }
});

// Create class
router.post('/', async (req, res) => {
  try {
    const { series, letter, discipline } = req.body;
    const newClass = await Class.create({ series, letter, discipline });
    res.status(201).json(newClass);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar turma' });
  }
});

// Update class
router.put('/:id', async (req, res) => {
  try {
    const { series, letter, discipline } = req.body;
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { series, letter, discipline },
      { new: true }
    );
    if (!updatedClass) return res.status(404).json({ error: 'Turma não encontrada' });
    res.json(updatedClass);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar turma' });
  }
});

// Delete class
router.delete('/:id', async (req, res) => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);
    if (!deletedClass) return res.status(404).json({ error: 'Turma não encontrada' });
    res.json({ message: 'Turma removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover turma' });
  }
});

module.exports = router;
