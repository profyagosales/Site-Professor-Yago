jest.setTimeout(30000);
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
// const path = require('path');

let mongo;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.MONGOMS_VERSION = '7.0.3';
  process.env.MONGOMS_ARCHIVE_NAME =
    'mongodb-linux-x86_64-ubuntu2204-7.0.3.tgz';
  process.env.MONGOMS_STORAGE_ENGINE = 'wiredTiger';
  // process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, '..', '.mongodb-binaries');
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});
