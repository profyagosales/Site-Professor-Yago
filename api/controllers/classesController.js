const Class = require('../models/Class');
const User = require('../models/User');

// @desc    Obter todas as turmas
// @route   GET /api/classes
// @access  Private (Teacher)
exports.getClasses = async (req, res, next) => {
  try {
    const classes = await Class.find({ teacherId: req.user.id }).sort({ year: -1, name: 1 });
    res.status(200).json(classes);
  } catch (error) {
    next(error);
  }
};

// @desc    Criar uma nova turma
// @route   POST /api/classes
// @access  Private (Teacher)
exports.createClass = async (req, res, next) => {
  try {
    const { name, year, school } = req.body;
    const teacherId = req.user.id;

    const newClass = await Class.create({
      name,
      year,
      school,
      teacherId,
    });

    res.status(201).json(newClass);
  } catch (error) {
    next(error);
  }
};

// @desc    Atualizar uma turma
// @route   PUT /api/classes/:id
// @access  Private (Teacher)
exports.updateClass = async (req, res, next) => {
  try {
    let schoolClass = await Class.findById(req.params.id);

    if (!schoolClass) {
      return res.status(404).json({ message: 'Turma não encontrada' });
    }

    // Garantir que o professor só possa editar sua própria turma
    if (schoolClass.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    schoolClass = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(schoolClass);
  } catch (error) {
    next(error);
  }
};

// @desc    Deletar uma turma
// @route   DELETE /api/classes/:id
// @access  Private (Teacher)
exports.deleteClass = async (req, res, next) => {
  try {
    const schoolClass = await Class.findById(req.params.id);

    if (!schoolClass) {
      return res.status(404).json({ message: 'Turma não encontrada' });
    }

    if (schoolClass.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    // Verificar se há alunos na turma antes de deletar
    const studentsInClass = await User.countDocuments({ classId: req.params.id });
    if (studentsInClass > 0) {
      return res.status(400).json({ message: 'Não é possível deletar a turma, pois há alunos associados a ela.' });
    }

    await schoolClass.remove();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
