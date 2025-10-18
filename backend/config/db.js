const mongoose = require('mongoose');

const connectDB = async () => {
  let uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    // Fallback: usar MongoDB em memória para dev
    try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        // Usa binário do MongoDB 7.x por compatibilidade com OpenSSL 3 (Ubuntu 24.04)
  const version = process.env.MEM_MONGO_VERSION || '8.0.4';
        const mongo = await MongoMemoryServer.create({
          binary: { version },
          instance: { storageEngine: 'wiredTiger' },
        });
      uri = mongo.getUri();
        console.log(`[DB] MongoDB em memória iniciado (v${version}):`, uri);
        // Encerra o servidor em memória no shutdown do processo
        const shutdown = async () => {
          try { await mongo.stop(); console.log('[DB] MongoDB em memória parado'); } catch {}
          process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } catch (err) {
        console.error('Erro ao iniciar MongoDB em memória:', err?.message || err);
      process.exit(1);
    }
  }
  try {
    const conn = await mongoose.connect(uri);
    const { host, name } = conn.connection;
    console.log(`[db] MongoDB conectado`, { host, db: name });
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
