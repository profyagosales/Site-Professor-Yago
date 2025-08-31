module.exports = {
  fileTokenSecret: process.env.FILE_TOKEN_SECRET || 'dev-secret',
  fileTokenTtl: Number(process.env.FILE_TOKEN_TTL_SECONDS || 300),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'https://professoryagosales.com.br',
};
