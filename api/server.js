const app = require('./app');
const config = require('./config');
const connectDB = require('./config/db');

const PORT = process.env.PORT || config.port || 5050;

// Iniciar o servidor antes de tentar conectar ao banco
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Conectar ao MongoDB após iniciar o servidor
connectDB()
  .then(connected => {
    if (!connected) {
      console.warn('Servidor iniciado, mas sem conexão com o banco de dados. Algumas funcionalidades podem não estar disponíveis.');
    }
  })
  .catch(err => {
    console.error('Erro ao inicializar a conexão com o banco:', err);
  });
