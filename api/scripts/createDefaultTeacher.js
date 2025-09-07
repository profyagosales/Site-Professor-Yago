// Importar o modelo de usuário
const User = require('../models/User');
const mongoose = require('mongoose');
const config = require('../config');
const bcrypt = require('bcryptjs');

// Conectar ao MongoDB
mongoose.connect(config.mongoUri)
.then(() => console.log('MongoDB conectado com sucesso'))
.catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});

// Definir o usuário padrão
const defaultTeacher = {
  name: 'Yago Sales',
  email: 'prof.yago.red@gmail.com',
  password: 'TR24339es',
  role: 'teacher',
  createdAt: new Date()
};

// Função para criar o usuário padrão
const createDefaultTeacher = async () => {
  try {
    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ email: defaultTeacher.email });
    
    if (existingUser) {
      console.log('O usuário professor padrão já existe.');
      mongoose.disconnect();
      process.exit(0);
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultTeacher.password, salt);

    // Criar o usuário
    const newUser = new User({
      name: defaultTeacher.name,
      email: defaultTeacher.email,
      password: hashedPassword,
      role: defaultTeacher.role,
      createdAt: defaultTeacher.createdAt
    });

    // Salvar no banco de dados
    await newUser.save();
    
    console.log('Usuário professor padrão criado com sucesso:');
    console.log(`Email: ${defaultTeacher.email}`);
    console.log(`Senha: ${defaultTeacher.password}`);
    
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar o usuário padrão:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Executar a função
createDefaultTeacher();
