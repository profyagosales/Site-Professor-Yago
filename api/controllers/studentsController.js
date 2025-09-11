const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Listar usuários (apenas alunos)
exports.getStudents = async (req, res, next) => {
  try {
    const { query = '', page = 1, limit = 10, active } = req.query;
    
    const filter = { role: 'student' };
    
    // Adicionar filtro de texto na busca
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Filtrar por status ativo
    if (active !== undefined) {
      filter.active = active === 'true';
    }
    
    const options = {
      sort: { createdAt: -1 },
      skip: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit)
    };
    
    // Não retornar o hash de senha
    const projection = '-passwordHash';
    
    const [users, total] = await Promise.all([
      User.find(filter, projection, options),
      User.countDocuments(filter)
    ]);
    
    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Criar novo aluno
exports.createStudent = async (req, res, next) => {
  try {
    const { name, email, password, active } = req.body;
    
    // Validações
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }
    
    // Verificar se o email já existe
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Este email já está em uso' });
    }
    
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Criar novo usuário
    const user = new User({
      name,
      email,
      passwordHash,
      role: 'student',
      active: active !== undefined ? active : true
    });
    
    await user.save();
    
    // Não retornar o hash da senha
    const newUser = user.toJSON();
    
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

// Atualizar aluno existente
exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, active, photoUrl } = req.body;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Garantir que apenas alunos possam ser atualizados por esta rota
    if (user.role !== 'student') {
      return res.status(403).json({ message: 'Esta rota só pode atualizar alunos' });
    }
    
    // Atualizar campos
    if (name !== undefined) {
      user.name = name;
    }
    
    if (email !== undefined) {
      // Verificar se o novo email já existe
      if (email !== user.email) {
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
          return res.status(400).json({ message: 'Este email já está em uso' });
        }
        
        user.email = email;
      }
    }
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }
    
    if (active !== undefined) {
      user.active = active;
    }
    
    if (photoUrl !== undefined) {
      user.photoUrl = photoUrl;
    }
    
    await user.save();
    
    // Não retornar o hash da senha
    const updatedUser = user.toJSON();
    
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// Excluir aluno
exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Garantir que apenas alunos possam ser excluídos por esta rota
    if (user.role !== 'student') {
      return res.status(403).json({ message: 'Esta rota só pode excluir alunos' });
    }
    
    await user.delete();
    
    res.json({ message: 'Aluno removido com sucesso' });
  } catch (error) {
    next(error);
  }
};