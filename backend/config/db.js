const mongoose = require('mongoose');

let memoryServer = null;
let memoryShutdownRegistered = false;

async function startMemoryServer() {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const version = process.env.MEM_MONGO_VERSION || '8.0.4';
    memoryServer = await MongoMemoryServer.create({
      binary: { version },
      instance: { storageEngine: 'wiredTiger' },
    });
    const uri = memoryServer.getUri();
    console.log(`[DB] MongoDB em memória iniciado (v${version}):`, uri);

    if (!memoryShutdownRegistered) {
      memoryShutdownRegistered = true;
      const shutdown = async () => {
        if (!memoryServer) return;
        try {
          await memoryServer.stop();
          console.log('[DB] MongoDB em memória parado');
        } catch (err) {
          console.warn('[DB] Falha ao parar MongoDB em memória', err?.message || err);
        } finally {
          process.exit(0);
        }
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    }

    return uri;
  } catch (err) {
    console.error('[DB] Erro ao iniciar MongoDB em memória:', err?.message || err);
    return null;
  }
}

async function resolveMongoUri() {
  const direct = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (direct) {
    return direct;
  }

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error('MONGO_URI ausente em produção.');
  }

  const preferMemory = process.env.MONGO_USE_MEMORY !== '0';
  if (preferMemory) {
    const memoryUri = await startMemoryServer();
    if (memoryUri) {
      return memoryUri;
    }
  }

  const localUri = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/site-professor-yago';
  console.warn('[DB] Usando MongoDB local:', localUri);
  return localUri;
}

const connectDB = async () => {
  try {
    const uri = await resolveMongoUri();
    if (!uri) {
      throw new Error('Não foi possível resolver a URI do MongoDB.');
    }
    const conn = await mongoose.connect(uri);
    const { host, name } = conn.connection;
    console.log('[db] MongoDB conectado', { host, db: name });
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err?.message || err);
    process.exit(1);
  }
};

module.exports = connectDB;
