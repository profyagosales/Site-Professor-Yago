const cloudinary = require('cloudinary').v2;
const config = require('../config');

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

// Upload de arquivo (buffer) para o Cloudinary
exports.uploadFile = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    // Enviar o buffer para o stream de upload
    uploadStream.end(buffer);
  });
};

// Excluir arquivo do Cloudinary
exports.deleteFile = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};

// Gerar URL assinada (com prazo de expiração)
exports.getSignedUrl = (publicId, options = {}) => {
  const defaults = {
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hora
    secure: true
  };
  
  return cloudinary.url(publicId, { ...defaults, ...options });
};
