require('dotenv').config();

const config = {
  port: process.env.PORT || 5050,
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_for_dev',
  jwtExpiration: '24h',
  jwtFileTokenExpiration: '5m',
  
  corsOptions: {
    origin: function (origin, callback) {
      // Split APP_DOMAIN into array if it's a comma-separated string
      const domains = process.env.APP_DOMAIN ? process.env.APP_DOMAIN.split(',') : [];
      
      const allowlist = [
        ...domains,
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000'
      ].filter(Boolean);
      
      if (!origin || allowlist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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
