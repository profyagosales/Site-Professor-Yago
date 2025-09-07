// Script para criar usuário professor diretamente no ambiente de produção no Render
// Execute este script na shell do Render após o deploy

// 1. Abra o painel do seu serviço no Render
// 2. Vá para a aba "Shell"
// 3. Execute: node scripts/createDefaultTeacherProd.js

// Importar o modelo de usuário
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Definir o esquema do usuário diretamente no script para evitar problemas de importação
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['teacher', 'student'],
    required: true
  },
  photoUrl: {
    type: String,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// URI de conexão com o MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://profyagored:pqtt1QixnwEVWiPH@profyago.yuhmlow.mongodb.net/ProfessorYago?retryWrites=true&w=majority&appName=ProfYago';

// Conectar ao MongoDB
console.log('Conectando ao MongoDB...');
mongoose.connect(mongoUri)
  .then(() => {
    console.log('MongoDB conectado com sucesso');
    createDefaultTeacher();
  })
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });

// Registrar o modelo
const User = mongoose.model('User', UserSchema);

// Definir o usuário padrão
const defaultTeacher = {
  name: 'Yago Sales',
  email: 'prof.yago.red@gmail.com',
  password: 'TR24339es',
  role: 'teacher',
  createdAt: new Date()
};

// Função para criar o usuário padrão
async function createDefaultTeacher() {
  try {
    // Verificar se o usuário já existe
    console.log('Verificando se o usuário já existe...');
    const existingUser = await User.findOne({ email: defaultTeacher.email });
    
    if (existingUser) {
      console.log('O usuário professor padrão já existe.');
      mongoose.disconnect();
      process.exit(0);
    }

    // Hash da senha
    console.log('Criando hash da senha...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultTeacher.password, salt);

    // Criar o usuário
    console.log('Criando o usuário...');
    const newUser = new User({
      name: defaultTeacher.name,
      email: defaultTeacher.email,
      passwordHash: hashedPassword,
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
}
