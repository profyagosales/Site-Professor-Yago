const errorHandler = (err, req, res, next) => {
  // Detectar erro de filtro Multer (ex: MIME inválido) – normalmente vem como Error simples.
  let statusCode = err.statusCode || 500;
  if (!err.statusCode && err.message && /apenas arquivos pdf/i.test(err.message)) {
    statusCode = 400;
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413; // payload demasiado grande
  }

  res.status(statusCode).json({
    message: err.message || 'Erro interno no servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
