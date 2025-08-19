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

async function corrigirRedacao(req, res) {
  try {
    const { id } = req.params;
    const { tipo } = req.body;
    const redacao = await Redacao.findById(id);
    if (!redacao) {
      return res.status(404).json({ error: 'Redação não encontrada' });
    }

    let finalScore = 0;
    const correction = { tipo };

    if (tipo === 'PAS/UnB') {
      const { NC, NE, NL } = req.body;
      if (typeof NC !== 'number' || typeof NE !== 'number' || typeof NL !== 'number' || NL === 0) {
        return res.status(400).json({ error: 'Dados inválidos para correção PAS/UnB' });
      }
      finalScore = NC - (2 * NE) / NL;
      Object.assign(correction, { NC, NE, NL, finalScore, competencias: [] });
    } else if (tipo === 'ENEM') {
      const { checklist = {}, competencias = [] } = req.body;
      const invalidComp = !Array.isArray(competencias) || competencias.length !== 5;
      const validScores = [0, 40, 80, 120, 160, 200];

      const anulacoes = Object.keys(checklist).filter((key) => checklist[key]);
      if (anulacoes.length > 0) {
        correction.anulacao = anulacoes.join(', ');
      }

      if (correction.anulacao) {
        finalScore = 0;
        correction.finalScore = finalScore;
        correction.competencias = competencias;
      } else {
        if (invalidComp || competencias.some((c) => !validScores.includes(c))) {
          return res.status(400).json({ error: 'Competências inválidas' });
        }
        finalScore = competencias.reduce((sum, val) => sum + val, 0);
        Object.assign(correction, { competencias, finalScore });
      }
    } else {
      return res.status(400).json({ error: 'Tipo de correção inválido' });
    }

    redacao.correction = correction;
    redacao.status = 'corrigida';

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    page.drawText(`Tipo: ${tipo}`, { x: 50, y: 350, size: 14 });
    page.drawText(`Nota final: ${finalScore}`, { x: 50, y: 330, size: 14 });
    if (correction.anulacao) {
      page.drawText(`Anulação: ${correction.anulacao}`, { x: 50, y: 310, size: 14 });
    }
    const pdfBytes = await pdfDoc.save();
    const uploadDir = path.join(__dirname, '../uploads/redacoes');
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const pdfName = `correcao-${id}-${Date.now()}.pdf`;
    const pdfPath = path.join(uploadDir, pdfName);
    await fs.promises.writeFile(pdfPath, pdfBytes);
    redacao.correctionPdf = pdfName;

    await redacao.save();

    res.json({ redacao, correctionPdf: pdfName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao corrigir redação' });
  }
}

module.exports = { upload, enviarRedacao, listarRedacoes, corrigirRedacao };
