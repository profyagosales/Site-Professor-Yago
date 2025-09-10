const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const authRequired = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Verificar se o token está no cookie ou no header
      let token;
      
      console.log('==== Verificação de autenticação ====');
      console.log(`Método: ${req.method}, URL: ${req.originalUrl}`);
      console.log('USE_COOKIE_AUTH:', process.env.USE_COOKIE_AUTH);
      console.log('Cookies presentes:', req.cookies ? Object.keys(req.cookies).join(', ') : 'nenhum');
      
      // Verificar primeiro se está no cookie
      if (req.cookies && req.cookies.auth_token) {
        console.log('✓ Token encontrado no cookie');
        token = req.cookies.auth_token;
      } else {
        console.log('✗ Token não encontrado no cookie');
        
        // Verificar o cabeçalho Authorization padrão
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          console.log('✗ Token não encontrado no cabeçalho Authorization');
          console.log('Headers disponíveis:', Object.keys(req.headers).join(', '));
          
          // Log detalhado de cookies para debug
          if (req.cookies) {
            console.log('Detalhes de cookies disponíveis:');
            console.log(JSON.stringify(req.cookies, null, 2));
          }
          
          // Verificar outros cabeçalhos de autenticação
          if (req.headers['x-access-token']) {
            console.log('✓ Token encontrado no cabeçalho x-access-token');
            token = req.headers['x-access-token'];
          } else {
            console.log('✗ Nenhum token de autenticação encontrado');
            return res.status(401).json({ 
              message: 'Token de autenticação não fornecido',
              cookieAuthEnabled: process.env.USE_COOKIE_AUTH === 'true',
              cookiesPresent: req.cookies ? Object.keys(req.cookies) : []
            });
          }
        } else {
          console.log('✓ Token encontrado no cabeçalho Authorization');
          token = authHeader.split(' ')[1];
        }
      }
      
      if (!token) {
        return res.status(401).json({ message: 'Token de autenticação inválido' });
      }
      
      const decoded = jwt.verify(token, config.jwtSecret);
      
      if (!decoded.sub) {
        return res.status(401).json({ message: 'Token inválido' });
      }

      // Verificar se o usuário existe
      const user = await User.findById(decoded.sub);
      
      if (!user) {
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }

      // Verificar o papel do usuário se necessário
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Acesso não autorizado para esta função' });
      }
      
      // Adicionar usuário à requisição
      req.user = {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      };
      
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token inválido' });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado' });
      }
      
      next(error);
    }
  };
};

module.exports = { authRequired };
