const path = require('path');
const { spawn } = require('child_process');
const multer = require('multer');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const Grade = require('../models/Grade');
const { sendEmail } = require('../services/emailService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

async function processOMR(req, res) {
  try {
    const { evaluationId, studentId } = req.body;
    if (!evaluationId || !studentId || !req.file) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const evaluation = await Evaluation.findById(evaluationId);
    const student = await Student.findById(studentId).populate('class');
    if (!evaluation || !student) {
      return res.status(404).json({ error: 'Avaliação ou aluno não encontrado' });
    }

    const answerKeyMap = {};
    evaluation.answerKey.forEach((ans, idx) => {
      const optionIndex = 'ABCDE'.indexOf(String(ans).toUpperCase());
      if (optionIndex !== -1) {
        answerKeyMap[idx] = optionIndex;
      }
    });

    const pdfPath = req.file.path;
    const outputDir = path.join(__dirname, '../uploads');
    const scriptPath = path.join(__dirname, '../omr/grade_omr.py');

    const py = spawn('python3', [
      scriptPath,
      pdfPath,
      JSON.stringify(answerKeyMap),
      student._id.toString(),
      student.class ? student.class._id.toString() : '',
      outputDir
    ]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', async (code) => {
      if (code !== 0) {
        console.error('Python stderr:', stderr);
        return res.status(500).json({ error: 'Erro ao processar OMR' });
      }

      let result;
      try {
        result = JSON.parse(stdout.trim());
      } catch (err) {
        console.error('Falha ao interpretar JSON:', err);
        return res.status(500).json({ error: 'Erro ao interpretar resultado' });
      }

      const correctedFileName = path.basename(result.pdf_corrigido);
      let grade = await Grade.findOne({ student: studentId, evaluation: evaluationId });
      if (!grade) {
        grade = new Grade({
          student: studentId,
          evaluation: evaluationId,
          bimester: evaluation.bimester,
          score: result.pontuacao,
          correctedFile: correctedFileName
        });
      } else {
        grade.score = result.pontuacao;
        grade.bimester = evaluation.bimester;
        grade.correctedFile = correctedFileName;
      }
      await grade.save();

      try {
        await sendEmail({
          to: student.email,
          subject: 'Resultado da avaliação',
          html: `<p>Olá ${student.name}, sua nota foi ${grade.score}.</p>`,
          attachments: [
            { filename: correctedFileName, path: result.pdf_corrigido }
          ]
        });
      } catch (emailErr) {
        console.error('Erro ao enviar e-mail:', emailErr);
      }

      res.json({ grade });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao processar OMR' });
  }
}

module.exports = { upload, processOMR };
