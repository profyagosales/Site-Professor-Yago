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
    // Auto-seed opcional
    if (connected && process.env.AUTO_SEED_TEACHER === 'true') {
      (async () => {
        try {
          const User = require('./models/User');
          const count = await User.countDocuments({ role: 'teacher' });
          if (count === 0) {
            const bcrypt = require('bcryptjs');
            const email = process.env.TEACHER_SEED_EMAIL || 'prof.yago.red@gmail.com';
            const password = process.env.TEACHER_SEED_PASSWORD || 'changeme123';
            const name = process.env.TEACHER_SEED_NAME || 'Professor Seed';
            const passwordHash = await bcrypt.hash(password, 10);
            await User.create({ email, name, role: 'teacher', passwordHash });
            console.log('[auto-seed] Professor seed criado:', email);
          } else {
            console.log('[auto-seed] Já existem professores, não criando seed.');
          }
        } catch (e) {
          console.error('[auto-seed] Erro ao criar professor seed', e.message);
        }
      })();
    }
  })
  .catch(err => {
    console.error('Erro ao inicializar a conexão com o banco:', err);
  });
