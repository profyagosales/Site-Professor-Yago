const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const authRequired = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Verificar se o token está no cookie ou no header
      let token;
      let tokenSource = '';
      
      console.log('==== Verificação de autenticação ====');
      console.log(`Método: ${req.method}, URL: ${req.originalUrl}`);
      console.log('USE_COOKIE_AUTH:', process.env.USE_COOKIE_AUTH);
      console.log('Cookies presentes:', req.cookies ? Object.keys(req.cookies).join(', ') : 'nenhum');
      console.log('Origin:', req.headers.origin || 'Nenhuma origem');
      console.log('User-Agent:', req.headers['user-agent'] || 'Nenhum User-Agent');
      
      // Verificar primeiro se está no cookie
      if (req.cookies && req.cookies.auth_token) {
        console.log('✓ Token encontrado no cookie auth_token');
        token = req.cookies.auth_token;
        tokenSource = 'cookie';
      } else {
        console.log('✗ Token não encontrado no cookie auth_token');
        
        // Verificar o cabeçalho Authorization padrão
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          console.log('✓ Token encontrado no cabeçalho Authorization');
          token = authHeader.split(' ')[1];
          tokenSource = 'authorization header';
        } else if (req.headers['x-access-token']) {
          console.log('✓ Token encontrado no cabeçalho x-access-token');
          token = req.headers['x-access-token'];
          tokenSource = 'x-access-token header';
        } else {
          console.log('✗ Nenhum token de autenticação encontrado');
          
          // Log detalhado dos headers e cookies disponíveis para diagnóstico
          console.log('Headers disponíveis:', Object.keys(req.headers).join(', '));
          if (req.cookies && Object.keys(req.cookies).length > 0) {
            console.log('Cookies disponíveis:');
            console.log(JSON.stringify(req.cookies, null, 2));
          }
          
          return res.status(401).json({ 
            message: 'Token de autenticação não fornecido',
            cookieAuthEnabled: process.env.USE_COOKIE_AUTH === 'true',
            cookiesPresent: req.cookies ? Object.keys(req.cookies) : [],
            originHeader: req.headers.origin || null,
            refererHeader: req.headers.referer || null
          });
        }
      }
      
      if (!token) {
        return res.status(401).json({ 
          message: 'Token de autenticação inválido ou não fornecido',
          tokenSource: tokenSource
        });
      }
      
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        
        if (!decoded.sub) {
          return res.status(401).json({ 
            message: 'Token inválido (sem sub)',
            tokenSource: tokenSource
          });
        }

        // Verificar se o usuário existe
        const user = await User.findById(decoded.sub);
        
        if (!user) {
          return res.status(401).json({ 
            message: 'Usuário não encontrado no banco de dados',
            tokenSource: tokenSource 
          });
        }

        // Verificar o papel do usuário se necessário
        if (roles.length && !roles.includes(user.role)) {
          return res.status(403).json({ 
            message: `Acesso não autorizado para esta função. Requer: ${roles.join(', ')}`,
            userRole: user.role
          });
        }
        
        // Renovar o token se estiver usando cookies
        if (tokenSource === 'cookie' && process.env.USE_COOKIE_AUTH === 'true') {
          // Só renova se o token estiver próximo de expirar (menos de 1h restante)
          const now = Math.floor(Date.now() / 1000);
          const timeRemaining = decoded.exp - now;
          
          if (timeRemaining < 3600) { // menos de 1 hora restante
            console.log('Renovando token de autenticação por cookie');
            
            // Gerar novo token com nova data de expiração
            const newToken = jwt.sign(
              { sub: user._id, role: user.role },
              config.jwtSecret,
              { expiresIn: config.jwtExpiration }
            );
            
            // Definir novo cookie com o token renovado
            const { getAuthCookieOptions } = require('../utils/cookieUtils');
            res.cookie('auth_token', newToken, getAuthCookieOptions());
          }
        }
        
        // Adicionar usuário à requisição
        req.user = {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        };
        
        next();
      } catch (jwtError) {
        console.error('Erro na verificação do JWT:', jwtError.name, jwtError.message);
        
        if (jwtError.name === 'JsonWebTokenError') {
          return res.status(401).json({ 
            message: 'Token inválido',
            error: jwtError.message,
            tokenSource: tokenSource
          });
        }
        
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            message: 'Token expirado',
            expiredAt: jwtError.expiredAt,
            tokenSource: tokenSource
          });
        }
        
        throw jwtError;
      }
    } catch (error) {
      console.error('Erro na autenticação:', error);
      next(error);
    }
  };
};

module.exports = { authRequired };
