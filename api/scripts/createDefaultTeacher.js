// Importar o modelo de usuário
const User = require('../models/User');
const mongoose = require('mongoose');
const config = require('../config');
const bcrypt = require('bcryptjs');

// Conectar ao MongoDB
mongoose.connect(config.mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
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
      console.log('O usuário professor já existe no banco de dados.');
      mongoose.disconnect();
      return;
    }
    
    // Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultTeacher.password, salt);
    
    // Criar o novo usuário
    const newUser = new User({
      ...defaultTeacher,
      password: hashedPassword
    });
    
    await newUser.save();
    console.log('Usuário professor criado com sucesso!');
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Erro ao criar o usuário professor:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Executar a função
createDefaultTeacher();
