const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const authRequired = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Verificar se o token está no cookie ou no header
      let token;
      
      // Verificar primeiro se está no cookie
      if (req.cookies && req.cookies.auth_token) {
        console.log('Usuário autenticado via cookie');
        token = req.cookies.auth_token;
      } else {
        // Verificar o cabeçalho Authorization padrão
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          console.log('Usuário não está autenticado via cookie ou token');
          console.log('Headers disponíveis:', Object.keys(req.headers));
          console.log('Cookies disponíveis:', req.cookies ? Object.keys(req.cookies) : 'nenhum');
          console.log('USE_COOKIE_AUTH está definido como:', process.env.USE_COOKIE_AUTH);
          return res.status(401).json({ message: 'Token de autenticação não fornecido' });
        }
        
        console.log('Usuário autenticado via token Bearer');
        token = authHeader.split(' ')[1];
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
