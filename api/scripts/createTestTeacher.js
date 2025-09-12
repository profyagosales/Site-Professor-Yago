const User = require('../models/User');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

async function createTestTeacher() {
  try {
    // Conectar ao MongoDB
    await connectDB();
    
    // Verificar se já existe um usuário professor de teste
    const existingUser = await User.findOne({ email: 'professor@teste.com' });
    
    if (existingUser) {
      console.log('Professor de teste já existe:', existingUser.name);
      return existingUser;
    }
    
    // Criar um novo usuário professor
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const newUser = new User({
      name: 'Professor Teste',
      email: 'professor@teste.com',
      passwordHash: hashedPassword,
      role: 'teacher'
    });
    
    await newUser.save();
    console.log('Professor de teste criado com sucesso:', newUser.name);
    return newUser;
  } catch (error) {
    console.error('Erro ao criar professor de teste:', error);
    throw error;
  }
}

// Executa a função se o script for chamado diretamente
if (require.main === module) {
  createTestTeacher()
    .then((user) => {
      console.log('Script concluído com sucesso!');
      console.log('Dados do usuário:');
      console.log('- Email: professor@teste.com');
      console.log('- Senha: 123456');
      console.log('- Nome: ', user.name);
      console.log('- ID: ', user._id);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = createTestTeacher;
