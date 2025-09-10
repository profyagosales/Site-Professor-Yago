/**
 * Servidor Express simples para configuração inicial
 * Use este arquivo apenas para configuração inicial, depois volte para o server.js normal
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = express();

// Configuração básica
app.use(cors({
  origin: function (origin, callback) {
    // Aceitar qualquer origem durante a configuração
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Modelo de usuário simplificado
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  role: String,
  createdAt: Date
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

// Conectar ao MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://profyagored:pqtt1QixnwEVWiPH@profyago.yuhmlow.mongodb.net/ProfessorYago';
    
    await mongoose.connect(mongoUri, {
      // Use as opções do MongoDB recomendadas
    });
    
    console.log('MongoDB conectado com sucesso');
    return true;
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err);
    return false;
  }
};

// Rotas de diagnóstico
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de configuração simplificada funcionando',
    timestamp: new Date().toISOString() 
  });
});

// Rota de teste
app.get('/setup/test', (req, res) => {
  res.json({ 
    message: 'Rota de setup está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Rota para criar professor padrão
app.post('/setup/create-default-teacher', async (req, res) => {
  try {
    const { secretKey } = req.body;
    const SETUP_SECRET = '24b8b03a7fdc5b1d6f4a1ebc8b69f3a7';
    
    console.log('Requisição recebida para criar professor padrão');
    console.log('Chave secreta recebida:', secretKey ? 'Presente (valor ocultado)' : 'Não fornecida');
    
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

// Iniciar o servidor
const PORT = process.env.PORT || 5050;

// Conectar ao MongoDB e depois iniciar o servidor
connectDB()
  .then(connected => {
    if (connected) {
      app.listen(PORT, () => {
        console.log(`Servidor de configuração simplificada rodando na porta ${PORT}`);
      });
    } else {
      console.error('Não foi possível iniciar o servidor devido a problemas com o banco de dados');
    }
  })
  .catch(err => {
    console.error('Falha na inicialização:', err);
  });
