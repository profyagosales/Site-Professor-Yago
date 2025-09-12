const Theme = require('../models/Theme');
const User = require('../models/User');
const connectDB = require('../config/db');

async function createTestThemes() {
  try {
    // Conectar ao MongoDB
    await connectDB();
    
    // Encontrar um usuário professor
    const teacher = await User.findOne({ role: 'teacher' });
    
    if (!teacher) {
      console.error('Nenhum professor encontrado. Execute o script createTestTeacher.js primeiro.');
      return;
    }
    
    // Temas de exemplo
    const temas = [
      { title: 'Os desafios da educação digital no Brasil' },
      { title: 'Sustentabilidade e desenvolvimento econômico' },
      { title: 'A influência das redes sociais na formação de opinião' },
      { title: 'Desigualdade social no contexto da pandemia' },
      { title: 'O papel da tecnologia na democratização do conhecimento' }
    ];
    
    // Contar temas existentes
    const count = await Theme.countDocuments();
    if (count > 0) {
      console.log(`Já existem ${count} temas cadastrados. Pulando criação de temas.`);
      const existingThemes = await Theme.find().lean();
      return existingThemes;
    }
    
    // Criar temas
    const createdThemes = [];
    
    for (const tema of temas) {
      const newTheme = new Theme({
        title: tema.title,
        active: true,
        createdBy: teacher._id
      });
      
      await newTheme.save();
      createdThemes.push(newTheme);
      console.log('Tema criado:', newTheme.title);
    }
    
    return createdThemes;
  } catch (error) {
    console.error('Erro ao criar temas de teste:', error);
    throw error;
  }
}

// Executa a função se o script for chamado diretamente
if (require.main === module) {
  createTestThemes()
    .then((themes) => {
      console.log(`Script concluído com sucesso! ${themes?.length || 0} temas cadastrados.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = createTestThemes;
