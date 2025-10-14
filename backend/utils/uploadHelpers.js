const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;

function ensureConfigured() {
  const configured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  if (!configured) {
    throw new Error('Upload de imagens indisponível. Configure o Cloudinary antes de continuar.');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

exports.uploadSingleBuffer = async function uploadSingleBuffer(buffer, folder, mimetype) {
  ensureConfigured();
  const options = {
    folder,
    resource_type: mimetype && mimetype.startsWith('image/') ? 'image' : 'auto',
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) {
        return reject(err);
      }
      if (!result?.secure_url) {
        return reject(new Error('Falha ao salvar a imagem.'));
      }
      return resolve(result.secure_url);
    });
    bufferToStream(buffer).pipe(stream);
  });
};
