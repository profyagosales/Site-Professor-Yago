const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  try {
    // Log para debug
    console.log(`Tentando conectar ao MongoDB com URI: ${config.mongoUri ? 'URI configurada' : 'URI não configurada!'}`);
    
    if (!config.mongoUri) {
      console.error('MongoDB URI não configurada! Verifique as variáveis de ambiente MONGODB_URI ou MONGO_URI.');
      // Não encerramos o processo para permitir que o servidor inicie mesmo sem o banco
      return false;
    }
    
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout após 5 segundos
      socketTimeoutMS: 45000, // Tempo limite do socket após 45 segundos
    });
    
    console.log('MongoDB Connected');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Não encerrar o processo em caso de erro
    return false;
  }
};

module.exports = connectDB;
