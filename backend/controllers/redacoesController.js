const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const Redacao = require('../models/Redacao');

const storage = multer.memoryStorage();
const upload = multer({ storage });

async function enviarRedacao(req, res) {
  try {
    const { student, class: classId, bimester, type } = req.body;
    if (!student || !classId || !bimester || !type || !req.file) {
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
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const fileName = `redacao-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, pdfBytes);

    const redacao = new Redacao({
      student,
      class: classId,
      bimester,
      type,
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

async function listarRedacoes(req, res) {
  try {
    const {
      status,
      bimestre,
      turma,
      aluno,
      page = 1,
      limit = 10,
      sort = '-submittedAt'
    } = req.query;

    if (!status) {
      return res.status(400).json({ error: 'Status \u00e9 obrigat\u00f3rio' });
    }

    const filter = { status };
    if (bimestre) filter.bimester = Number(bimestre);
    if (turma) filter.class = turma;
    if (aluno) filter.student = aluno;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const query = Redacao.find(filter)
      .populate('student', 'name rollNumber photo')
      .populate('class', 'series letter')
      .sort(sort);

    if (!isNaN(pageNum) && !isNaN(limitNum)) {
      query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [redacoes, total] = await Promise.all([
      query.exec(),
      Redacao.countDocuments(filter)
    ]);

    res.json({
      redacoes,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar reda\u00e7\u00f5es' });
  }
}

module.exports = { upload, enviarRedacao, listarRedacoes };
