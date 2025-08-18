const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const Redacao = require('../models/Redacao');

const storage = multer.memoryStorage();
const upload = multer({ storage });

async function enviarRedacao(req, res) {
  try {
    const { student, class: classId, bimester } = req.body;
    if (!student || !classId || !bimester || !req.file) {
      return res.status(400).json({ error: 'Dados inv\u00e1lidos' });
    }

    const pdfDoc = await PDFDocument.create();
    let image;
    if (req.file.mimetype === 'image/png') {
      image = await pdfDoc.embedPng(req.file.buffer);
    } else {
      image = await pdfDoc.embedJpg(req.file.buffer);
    }
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    const pdfBytes = await pdfDoc.save();

    const uploadDir = path.join(__dirname, '../uploads/redacoes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `redacao-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);

    const redacao = new Redacao({
      student,
      class: classId,
      bimester,
      file: fileName,
      submittedAt: new Date(),
      status: 'pendente'
    });
    await redacao.save();

    res.status(201).json({ redacao });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar reda\u00e7\u00e3o' });
  }
}

module.exports = { upload, enviarRedacao };
