module.exports = {
  FILE_TOKEN_SECRET: process.env.FILE_TOKEN_SECRET || 'dev-secret',
  FILE_TOKEN_TTL_SECONDS: Number(process.env.FILE_TOKEN_TTL_SECONDS || 300),
};
