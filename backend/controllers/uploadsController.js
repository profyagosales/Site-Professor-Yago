const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Essay = require('../models/Essay');
const Student = require('../models/Student');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

function bufferToStream(buffer) {
  const { Readable } = require('stream');
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

async function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    bufferToStream(buffer).pipe(stream);
  });
}

async function uploadEssay(req, res) {
  try {
    const { studentId, topic, classId, fileUrl } = req.body;
    const cloudConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    const allowDirectUrl = process.env.ALLOW_DIRECT_FILE_URL === 'true' || !cloudConfigured;

    if ((!req.file && !fileUrl) || !studentId || !topic) {
      return res.status(400).json({ success: false, message: 'Arquivo ou URL, aluno e tema são obrigatórios' });
    }
    // Confirma aluno e classId (se ausente, tenta obter do aluno)
    const student = await Student.findById(studentId).select('class');
    if (!student) return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    const cls = classId || (student.class ? String(student.class) : null);
    if (!cls) return res.status(400).json({ success: false, message: 'Turma obrigatória' });

    let originalUrl;
    if (req.file) {
      originalUrl = await uploadBuffer(req.file.buffer, 'essays/original');
    } else if (allowDirectUrl && typeof fileUrl === 'string' && /^https?:\/\//.test(fileUrl)) {
      originalUrl = fileUrl;
    } else {
      return res.status(400).json({ success: false, message: 'Upload não configurado. Envie um arquivo ou habilite URL direta.' });
    }

    const essay = await Essay.create({
      studentId,
      classId: cls,
      customTheme: topic,
      type: 'PAS',
      bimester: 1,
  originalUrl,
      submittedAt: new Date(),
      status: 'PENDING',
    });

    res.status(201).json({ success: true, data: essay });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Falha no upload da redação' });
  }
}

module.exports = { upload, uploadEssay };
