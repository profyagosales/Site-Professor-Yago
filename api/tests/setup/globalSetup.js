const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  global.__MONGOD__ = mongod;
  process.env.MONGODB_URI = uri; // usado pelo config
  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_EXPIRATION = '2h';
  process.env.JWT_FILE_TOKEN_EXPIRATION = '10m';
  process.env.USE_COOKIE_AUTH = 'false'; // força fluxo header-only nos testes
};
