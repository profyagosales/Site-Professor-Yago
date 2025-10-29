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
  const { studentId, topic, classId, fileUrl, type: bodyType, bimester: bodyBimester } = req.body;
    const cloudConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    const allowDirectUrl = process.env.ALLOW_DIRECT_FILE_URL === 'true' || !cloudConfigured;

    if ((!req.file && !fileUrl) || !studentId || !topic) {
      const missing = [];
      if (!req.file && !fileUrl) missing.push('arquivo ou URL');
      if (!studentId) missing.push('aluno');
      if (!topic) missing.push('tema');
      return res.status(400).json({ success: false, message: `Campos obrigatórios ausentes: ${missing.join(', ')}` });
    }
    // Confirma aluno e classId (se ausente, tenta obter do aluno)
    const student = await Student.findById(studentId).select('class');
    if (!student) return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    const cls = classId || (student.class ? String(student.class) : null);
    if (!cls) return res.status(400).json({ success: false, message: 'Turma obrigatória' });

    let originalUrl;
    let originalMimeType = null;
    if (req.file) {
      if (!cloudConfigured) {
        return res.status(400).json({ success: false, message: 'Upload de arquivo indisponível. Configure o Cloudinary ou envie uma URL (fileUrl).' });
      }
      originalUrl = await uploadBuffer(req.file.buffer, 'essays/original');
      originalMimeType = req.file.mimetype || null;
    } else if (allowDirectUrl && typeof fileUrl === 'string' && /^https?:\/\//.test(fileUrl)) {
      originalUrl = fileUrl;
      // tenta detectar content-type por HEAD (best-effort, sem bloquear sucesso)
      try {
        const https = require('https');
        const http = require('http');
        await new Promise((resolve) => {
          let done = false;
          const h = fileUrl.startsWith('https') ? https : http;
          const reqHead = h.request(fileUrl, { method: 'HEAD' }, (resp) => {
            if (done) return; done = true;
            const ct = resp.headers['content-type'];
            if (typeof ct === 'string') originalMimeType = ct.split(';')[0];
            resolve();
          });
          reqHead.on('error', () => { if (!done) { done = true; resolve(); } });
          reqHead.setTimeout(1500, () => { try { reqHead.destroy(); } catch {} if (!done) { done = true; resolve(); } });
          reqHead.end();
        });
      } catch {}
    } else {
      const msg = allowDirectUrl ? 'URL inválida. Envie um arquivo ou uma URL http/https válida.' : 'Upload não configurado. Envie um arquivo (Cloudinary ausente) ou habilite URL direta.';
      return res.status(400).json({ success: false, message: msg });
    }

    const essay = await Essay.create({
      studentId,
      classId: cls,
      customTheme: topic,
      type: bodyType === 'ENEM' ? 'ENEM' : 'PAS',
      bimester: Number(bodyBimester) || 1,
      originalUrl,
      originalMimeType: originalMimeType,
      submittedAt: new Date(),
      status: 'pending',
    });

    res.status(201).json({ success: true, data: essay });
  } catch (err) {
    console.error('uploadEssay error:', err && (err.message || err));
    const message =
      err?.code === 'LIMIT_FILE_SIZE'
        ? 'Arquivo muito grande (máx 20MB)'
        : err?.message?.includes('Invalid image file')
        ? 'Arquivo inválido ou corrompido'
        : 'Falha no upload da redação';
    res.status(500).json({ success: false, message });
  }
}

module.exports = { upload, uploadEssay };
// Debug/status endpoint (no secrets exposed)
module.exports.cloudStatus = (req, res) => {
  const status = {
    cloudConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    env: {
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      ALLOW_DIRECT_FILE_URL: process.env.ALLOW_DIRECT_FILE_URL === 'true',
    },
  };
  res.json({ success: true, data: status });
};
