require('dotenv').config();

// Força o USE_COOKIE_AUTH para true - IMPORTANTE para o funcionamento da autenticação
process.env.USE_COOKIE_AUTH = 'true';

const isProd = process.env.NODE_ENV === 'production';

// Valores padrão para produção caso as variáveis de ambiente não estejam definidas
const PROD_MONGODB_URI = 'mongodb+srv://profyagored:pqtt1QixnwEVWiPH@profyago.yuhmlow.mongodb.net/ProfessorYago?retryWrites=true&w=majority&appName=ProfYago';
const PROD_JWT_SECRET = '1cb5a88e6ab4cc18d2365e639b9a0cf4164117e146c86a5acef95076d2ca0d3d';

console.log(`Modo: ${isProd ? 'Produção' : 'Desenvolvimento'}`);
console.log(`Cookie Auth: ${process.env.USE_COOKIE_AUTH}`);
console.log(`API Prefix: ${process.env.API_PREFIX || ''}`);

const config = {
  port: process.env.PORT || 5050,
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || (isProd ? PROD_MONGODB_URI : 'mongodb://localhost:27017/professor-yago'),
  jwtSecret: process.env.JWT_SECRET || (isProd ? PROD_JWT_SECRET : 'your_jwt_secret_for_dev'),
  jwtExpiration: '24h',
  jwtFileTokenExpiration: '5m',
  
  corsOptions: {
    origin: function (origin, callback) {
      // Split APP_DOMAIN into array if it's a comma-separated string
      const domains = process.env.APP_DOMAIN ? process.env.APP_DOMAIN.split(',') : [];
      
      // Aceitar qualquer origem de domínio Vercel ou domínio personalizado
      if (origin && (
          origin.includes('vercel.app') || 
          origin.includes('professoryagosales.com.br')
      )) {
        console.log(`Aceitando origem Vercel/domínio personalizado: ${origin}`);
        // Definir origem específica no cabeçalho Access-Control-Allow-Origin
        // Isso é necessário para que os cookies funcionem corretamente
        return callback(null, true);
      }
      
      const allowlist = [
        ...domains,
        process.env.FRONTEND_URL,
        'https://professoryagosales.com.br',
        'https://www.professoryagosales.com.br',
        'http://localhost:5173',
        'http://localhost:3000'
      ].filter(Boolean);
      
      console.log(`Requisição CORS de origem: ${origin || 'sem origem'}`);
      console.log(`Lista de domínios permitidos: ${allowlist.join(', ')}`);
      
      if (!origin || allowlist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`Origem ${origin} bloqueada por CORS`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // IMPORTANTE: Habilitar o compartilhamento de credenciais (cookies)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Authorization', 'Content-Type']
  },
  
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@example.com'
  },
  
  appDomain: process.env.APP_DOMAIN || 'professoryagosales.com.br'
};

module.exports = config;
