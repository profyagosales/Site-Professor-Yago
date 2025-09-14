// Middleware para debug de requisições
// Adicione esta linha ao app.js antes de registrar as rotas: app.use(requestDebugger);

module.exports = (req, res, next) => {
  // Silenciar completamente em ambiente de teste para evitar poluição de saída
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  // Pular debug para rotas de saúde/monitoramento
  if (req.path.includes('/health')) {
    return next();
  }

  console.log('\n=== DEBUG REQUEST ===');
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  
  // Informações do cliente
  console.log('IP:', req.ip);
  console.log('User-Agent:', req.headers['user-agent']);
  
  // Headers importantes para autenticação
  console.log('Headers de autenticação:');
  console.log('  Authorization:', req.headers.authorization || 'não fornecido');
  console.log('  x-access-token:', req.headers['x-access-token'] || 'não fornecido');
  console.log('  x-auth-token:', req.headers['x-auth-token'] || 'não fornecido');
  
  // Origin e Referrer para diagnósticos CORS
  console.log('Origin:', req.headers.origin || 'não fornecido');
  console.log('Referer:', req.headers.referer || 'não fornecido');
  
  // Cookies
  if (req.cookies && Object.keys(req.cookies).length > 0) {
    console.log('Cookies:');
    console.log(JSON.stringify(req.cookies, null, 2));
  } else {
    console.log('Cookies: nenhum');
  }
  
  // Exibir corpo da requisição para métodos não GET
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    console.log('Body:');
    // Ocultar senhas no log
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '[REDACTED]';
    console.log(JSON.stringify(safeBody, null, 2));
  }
  
  console.log('=====================\n');
  next();
};
