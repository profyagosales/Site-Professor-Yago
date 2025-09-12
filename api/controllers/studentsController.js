const User = require('../models/User');
const Class = require('../models/Class'); // Importar o modelo Class
const bcrypt = require('bcryptjs');

// Listar todos os alunos com filtros e paginação
exports.getStudents = async (req, res, next) => {
  try {
    const { query = '', page = 1, limit = 10, active, classId } = req.query;
    
    const filter = { role: 'student' };
    
    if (query) {
      filter.name = { $regex: query, $options: 'i' };
    }
    
    if (active !== undefined) {
      filter.active = active === 'true';
    }

    if (classId) {
      filter.classId = classId;
    }
    
    const options = {
      sort: { name: 1 },
      skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      limit: parseInt(limit, 10),
      populate: { path: 'classId', select: 'name year' }
    };
    
    const projection = '-passwordHash';
    
    const [users, total] = await Promise.all([
      User.find(filter, projection, options),
      User.countDocuments(filter)
    ]);
    
    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Criar um novo aluno
exports.createStudent = async (req, res, next) => {
  try {
    const { name, email, password, active, classId } = req.body;
    
    if (!name || !email || !password || !classId) {
      return res.status(400).json({ message: 'Nome, email, senha e turma são obrigatórios.' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Este email já está em uso.' });
    }

    const studentClass = await Class.findById(classId);
    if (!studentClass) {
        return res.status(400).json({ message: 'Turma não encontrada.' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const user = new User({
      name,
      email,
      passwordHash,
      role: 'student',
      active: active !== undefined ? active : true,
      classId
    });
    
    await user.save();
    
    const newUser = user.toJSON();
    delete newUser.passwordHash;
    
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

// Atualizar um aluno existente
exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, active, photoUrl, classId } = req.body;
    
    const user = await User.findById(id);
    
    if (!user || user.role !== 'student') {
      return res.status(404).json({ message: 'Aluno não encontrado.' });
    }
    
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Acesso não autorizado.' });
    }

    if (classId) {
        const studentClass = await Class.findById(classId);
        if (!studentClass) {
            return res.status(400).json({ message: 'Turma não encontrada.' });
        }
        user.classId = classId;
    }
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (active !== undefined) user.active = active;
    if (photoUrl) user.photoUrl = photoUrl;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }
    
    await user.save();
    
    const updatedUser = await User.findById(id).populate('classId', 'name year');

    const userJSON = updatedUser.toJSON();
    delete userJSON.passwordHash;
    
    res.json(userJSON);
  } catch (error) {
    next(error);
  }
};

// Deletar um aluno
exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user || user.role !== 'student') {
      return res.status(404).json({ message: 'Aluno não encontrado.' });
    }
    
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Acesso não autorizado.' });
    }
    
    await User.findByIdAndDelete(id);
    
    res.status(200).json({ message: 'Aluno deletado com sucesso.' });
  } catch (error) {
    next(error);
  }
};