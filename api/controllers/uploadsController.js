const cloudinaryService = require('../services/cloudinaryService');
const multer = require('multer');

// Upload de arquivos de redação para o Cloudinary
exports.uploadEssay = async (req, res, next) => {
  try {
    // Verifica se um arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo foi enviado' });
    }

    // Verificar o tipo do arquivo (apenas PDF permitido)
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Apenas arquivos PDF são permitidos' });
    }

    // Upload do arquivo para o Cloudinary
    const result = await cloudinaryService.uploadFile(req.file.buffer, {
      folder: `essays/${req.user.role}/${req.user.id}`,
      resource_type: 'auto'
    });

    // Retornar dados do upload
    res.json({
      url: result.secure_url,
      mime: req.file.mimetype,
      size: req.file.size,
      pages: result.pages || null // Cloudinary pode retornar o número de páginas para PDFs
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Arquivo muito grande. O limite é 10MB.' });
      }
      return res.status(400).json({ message: `Erro no upload: ${error.message}` });
    }
    next(error);
  }
};
