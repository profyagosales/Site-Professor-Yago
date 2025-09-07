// Rota temporária para criar o usuário professor padrão
// IMPORTANTE: Remova esta rota após criar o usuário!

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Chave secreta para autorizar a criação do usuário (para segurança adicional)
const SETUP_SECRET = '24b8b03a7fdc5b1d6f4a1ebc8b69f3a7';

router.post('/create-default-teacher', async (req, res) => {
  try {
    // Verificar se a chave secreta está correta
    const { secretKey } = req.body;
    
    if (secretKey !== SETUP_SECRET) {
      return res.status(401).json({ 
        message: 'Não autorizado. Chave secreta incorreta.' 
      });
    }
    
    // Dados do professor padrão
    const defaultTeacher = {
      name: 'Yago Sales',
      email: 'prof.yago.red@gmail.com',
      password: 'TR24339es',
      role: 'teacher'
    };
    
    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ email: defaultTeacher.email });
    
    if (existingUser) {
      return res.status(200).json({ 
        message: 'O usuário professor já existe',
        user: {
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }
    
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultTeacher.password, salt);
    
    // Criar o usuário
    const newUser = new User({
      name: defaultTeacher.name,
      email: defaultTeacher.email,
      passwordHash: hashedPassword,
      role: defaultTeacher.role,
      createdAt: new Date()
    });
    
    // Salvar no banco de dados
    await newUser.save();
    
    return res.status(201).json({
      message: 'Usuário professor padrão criado com sucesso',
      user: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar usuário professor padrão:', error);
    return res.status(500).json({ 
      message: 'Erro ao criar usuário professor padrão', 
      error: error.message 
    });
  }
});

module.exports = router;
