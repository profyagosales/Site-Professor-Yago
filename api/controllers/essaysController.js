const Essay = require('../models/Essay');
const AnnotationSet = require('../models/AnnotationSet');
const jwt = require('jsonwebtoken');
const config = require('../config');
const cloudinaryService = require('../services/cloudinaryService');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
// Usando importação dinâmica para node-fetch v3
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Listar redações com filtros
exports.getEssays = async (req, res, next) => {
  try {
    const { status, type, themeId, q, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    
    // Filtro por status
    if (status) {
      filter.status = status;
    }
    
    // Filtro por tipo
    if (type) {
      filter.type = type;
    }
    
    // Filtro por tema
    if (themeId) {
      filter.themeId = themeId;
    }
    
    // Busca por texto
    if (q) {
      filter.$or = [
        { 'themeText': { $regex: q, $options: 'i' } }
      ];
    }
    
    // Filtro por usuário (alunos só veem suas próprias redações)
    if (req.user.role === 'student') {
      filter.studentId = req.user.id;
    }
    
    const options = {
      sort: { createdAt: -1 },
      skip: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit),
      populate: [
        { path: 'studentId', select: 'name email' },
        { path: 'teacherId', select: 'name email' },
        { path: 'themeId', select: 'title' }
      ]
    };
    
    const [essays, total] = await Promise.all([
      Essay.find(filter, null, options),
      Essay.countDocuments(filter)
    ]);
    
    res.json({
      essays,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper simples de validação de criação
function validateCreationPayload({ type, themeId, themeText, file }) {
  const errors = [];
  if (!type) errors.push('type é obrigatório');
  if (type && !['ENEM','PAS'].includes(type)) errors.push('type inválido (ENEM|PAS)');
  if (!file || !file.originalUrl) errors.push('arquivo (file.originalUrl) obrigatório');
  if (!themeId && !themeText) errors.push('themeId ou themeText obrigatório');
  return errors;
}

// Criar nova redação (Aluno)
exports.createEssay = async (req, res, next) => {
  try {
    const { type, themeId, themeText, file, bimester, countInBimester } = req.body;

    const validationErrors = validateCreationPayload({ type, themeId, themeText, file });
    if (validationErrors.length) {
      return res.status(400).json({ message: 'Erros de validação', errors: validationErrors });
    }

    const essay = new Essay({
      studentId: req.user.id,
      type,
      themeId: themeId || undefined,
      themeText: themeText || undefined,
      bimester: bimester || undefined,
      countInBimester: !!countInBimester,
      file: {
        originalUrl: file.originalUrl,
        mime: file.mime || 'application/pdf',
        size: file.size,
        pages: file.pages
      },
      status: 'PENDING'
    });

    await essay.save();
    res.status(201).json(essay);
  } catch (error) {
    next(error);
  }
};

// Criar nova redação para um aluno específico (Professor)
exports.createEssayForStudent = async (req, res, next) => {
  const { studentId } = req.params;
  const { themeId, type, bimester, countInBimester } = req.body;
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ message: 'Arquivo da redação é obrigatório.' });
    if (!themeId) return res.status(400).json({ message: 'O tema da redação é obrigatório.' });
    const finalType = (type && ['ENEM','PAS'].includes(type)) ? type : 'ENEM';

    const uploadResult = await cloudinaryService.uploadFile(file.buffer, {
      folder: `essays/originals/${studentId}`,
      resource_type: 'auto'
    });
    const pageCount = await pdfService.getPdfPageCount(uploadResult.secure_url);

    const essay = new Essay({
      studentId,
      teacherId: req.user.id,
      type: finalType,
      themeId,
      bimester: bimester || undefined,
      countInBimester: !!countInBimester,
      file: {
        originalUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        mime: file.mimetype,
        size: file.size,
        pages: pageCount,
      },
      status: 'PENDING'
    });

    await essay.save();
    res.status(201).json(essay);
  } catch (error) {
    next(error);
  }
};

// Obter uma redação por ID
exports.getEssayById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const essay = await Essay.findById(id)
      .populate('studentId', 'name email')
      .populate('teacherId', 'name email')
      .populate('themeId', 'title');
    
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }
    
    // Verificar permissão
    if (req.user.role === 'student' && essay.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acesso não autorizado a esta redação' });
    }
    
    res.json(essay);
  } catch (error) {
    next(error);
  }
};

// Atualizar uma redação (apenas enquanto PENDING)
exports.updateEssay = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, themeId, themeText, file, bimester, countInBimester, studentId } = req.body;
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });
    if (essay.status !== 'PENDING') {
      return res.status(409).json({ message: 'Apenas redações com status PENDING podem ser editadas' });
    }

    if (type && ['ENEM','PAS'].includes(type)) essay.type = type;
    if (themeId !== undefined) {
      essay.themeId = themeId;
      if (themeId) essay.themeText = undefined; // limpa texto livre se definimos themeId
    }
    if (themeText !== undefined) {
      essay.themeText = themeText;
      if (themeText) essay.themeId = undefined; // exclusividade
    }
    if (bimester !== undefined) essay.bimester = bimester;
    if (countInBimester !== undefined) essay.countInBimester = !!countInBimester;
    if (studentId) essay.studentId = studentId; // reatribuição (opcional)

    if (file && file.originalUrl) {
      essay.file = {
        originalUrl: file.originalUrl,
        mime: file.mime || essay.file.mime,
        size: file.size || essay.file.size,
        pages: file.pages || essay.file.pages
      };
    }

    essay.updatedAt = Date.now();
    await essay.save();
    res.json(essay);
  } catch (error) {
    next(error);
  }
};

// Gerar token para acesso ao arquivo
exports.generateFileToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const essay = await Essay.findById(id);
    
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }
    
    // Verificar permissão
    if (req.user.role === 'student' && essay.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acesso não autorizado a este arquivo' });
    }
    
    // Gerar token com expiração curta
    const token = jwt.sign(
      { 
        sub: req.user.id, 
        essayId: essay._id,
        scope: 'file:read' 
      },
      config.jwtSecret,
      { expiresIn: config.jwtFileTokenExpiration }
    );
    
    res.json({ token });
  } catch (error) {
    next(error);
  }
};

// Obter arquivo da redação (com verificação de token)
exports.getEssayFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verificar token
    const token = req.query.t || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!token) {
      return res.status(401).json({ message: 'Token de acesso não fornecido' });
    }
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      
      if (decoded.scope !== 'file:read' || decoded.essayId !== id) {
        return res.status(403).json({ message: 'Token inválido para este arquivo' });
      }
      
      const essay = await Essay.findById(id);
      
      if (!essay) {
        return res.status(404).json({ message: 'Redação não encontrada' });
      }
      
      // Streaming do arquivo do Cloudinary
      const response = await fetch(essay.file.originalUrl);
      
      // Configurar cabeçalhos
      res.setHeader('Content-Type', essay.file.mime || 'application/pdf');
      if (essay.file.size) {
        res.setHeader('Content-Length', essay.file.size);
      }
      
      // Streaming da resposta
      response.body.pipe(res);
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token inválido ou expirado' });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

// Obter cabeçalhos do arquivo da redação (HEAD)
exports.getEssayFileHead = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verificar token
    const token = req.query.t || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!token) {
      return res.status(401).json({ message: 'Token de acesso não fornecido' });
    }
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      
      if (decoded.scope !== 'file:read' || decoded.essayId !== id) {
        return res.status(403).json({ message: 'Token inválido para este arquivo' });
      }
      
      const essay = await Essay.findById(id);
      
      if (!essay) {
        return res.status(404).json({ message: 'Redação não encontrada' });
      }
      
      // Configurar cabeçalhos
      res.setHeader('Content-Type', essay.file.mime || 'application/pdf');
      if (essay.file.size) {
        res.setHeader('Content-Length', essay.file.size);
      }
      
      res.status(200).end();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token inválido ou expirado' });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

// Obter anotações de uma redação
exports.getAnnotations = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const essay = await Essay.findById(id);
    
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }
    
    // Verificar permissão
    if (req.user.role === 'student' && essay.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acesso não autorizado a estas anotações' });
    }
    
    // Buscar ou criar conjunto de anotações
    let annotationSet = await AnnotationSet.findOne({ essayId: id })
      .populate('highlights.createdBy', 'name')
      .populate('comments.createdBy', 'name');
    
    if (!annotationSet) {
      annotationSet = new AnnotationSet({
        essayId: id,
        highlights: [],
        comments: []
      });
    }
    
    res.json(annotationSet);
  } catch (error) {
    next(error);
  }
};

// Salvar rascunho da correção
exports.saveCorrection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { annotations, generalComments, enemScores, pasScores, finalGrade } = req.body;

    const essay = await Essay.findById(id);

    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }

    // O middleware authRequired já garante que o usuário é um professor

    // Atualiza os campos da correção
    if (annotations) {
        essay.annotations = annotations.map(ann => ({
            text: ann.content.text,
            comment: ann.comment.text,
            category: ann.category,
            position: ann.position,
        }));
    }
    if (generalComments) {
      essay.generalComments = generalComments;
    }
    if (enemScores) {
      essay.enemScores = enemScores;
    }
    if (pasScores) {
      essay.pasScores = pasScores;
    }
    if (finalGrade !== undefined) {
      essay.finalGrade = finalGrade;
    }

    // Atualiza o status da redação se for a primeira vez que está sendo corrigida
    if (essay.status === 'PENDING') {
      essay.status = 'GRADING';
      essay.teacherId = req.user.id;
    }
    
    essay.updatedAt = Date.now();

    const updatedEssay = await essay.save();

    res.json(updatedEssay);
  } catch (error) {
    next(error);
  }
};

// Atribuir nota à redação
exports.gradeEssay = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      type, 
      c1, c2, c3, c4, c5, // ENEM
      NC, NE, NL, // PAS
      annulment 
    } = req.body;
    
    const essay = await Essay.findById(id);
    
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }
    
    // Apenas professores podem atribuir notas
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Apenas professores podem atribuir notas' });
    }
    
    // Verificar anulação
    let rawScore = 0;
    
    if (annulment && annulment.active) {
      essay.annulment = {
        active: true,
        reasons: annulment.reasons || []
      };
    } else {
      // Calcular nota baseada no tipo
      if (type === 'ENEM') {
        if (c1 === undefined || c2 === undefined || c3 === undefined || c4 === undefined || c5 === undefined) {
          return res.status(400).json({ message: 'Todas as competências são obrigatórias para redações ENEM' });
        }
        
        // Validar valores
        if (c1 < 0 || c1 > 200 || c2 < 0 || c2 > 200 || c3 < 0 || c3 > 200 || c4 < 0 || c4 > 200 || c5 < 0 || c5 > 200) {
          return res.status(400).json({ message: 'Valores de competências devem estar entre 0 e 200' });
        }
        
        rawScore = c1 + c2 + c3 + c4 + c5;
        
        essay.enem = { c1, c2, c3, c4, c5, rawScore };
      } else if (type === 'PAS') {
        if (NC === undefined || NE === undefined) {
          return res.status(400).json({ message: 'NC e NE são obrigatórios para redações PAS' });
        }
        
        // Validar valores
        if (NC < 0 || NE < 0) {
          return res.status(400).json({ message: 'Valores de NC e NE devem ser positivos' });
        }
        
        // Usar NL padrão = 1 se não fornecido
        const nlValue = NL || 1;
        
        // Calcular nota: NR = NC - 2*NE/NL (>=0)
        rawScore = Math.max(0, NC - (2 * NE / nlValue));
        
        essay.pas = { NC, NE, NL: nlValue, rawScore };
      } else {
        return res.status(400).json({ message: 'Tipo de redação inválido' });
      }
    }
    
    // Atualizar status e nota
    essay.status = 'GRADED';
    essay.teacherId = req.user.id;
    essay.updatedAt = Date.now();
    
    await essay.save();
    
    res.json(essay);
  } catch (error) {
    next(error);
  }
};

// Gerar e salvar PDF corrigido
exports.exportCorrectedPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const essay = await Essay.findById(id);
    
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }
    
    // Apenas professores podem exportar
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Apenas professores podem exportar redações corrigidas' });
    }
    
    // Verificar se está corrigida
    if (essay.status !== 'GRADED') {
      return res.status(400).json({ message: 'A redação precisa estar corrigida para exportar' });
    }
    
    // Obter anotações
    const annotationSet = await AnnotationSet.findOne({ essayId: id });
    
    if (!annotationSet || !annotationSet.highlights || annotationSet.highlights.length === 0) {
      return res.status(400).json({ message: 'A redação precisa ter anotações para exportar' });
    }
    
    // Preparar espelho para o PDF
    const espelho = {
      type: essay.type,
      annulment: essay.annulment,
      ...(essay.type === 'ENEM' ? essay.enem : {}),
      ...(essay.type === 'PAS' ? essay.pas : {})
    };
    
    // Gerar PDF corrigido
    const correctedPdfBuffer = await pdfService.generateCorrectedPdf(
      essay.file.originalUrl,
      annotationSet,
      espelho
    );
    
    // Fazer upload do PDF corrigido para o Cloudinary
    const result = await cloudinaryService.uploadFile(correctedPdfBuffer, {
      folder: `essays/corrected/${essay._id}`,
      resource_type: 'auto'
    });
    
    // Salvar URL do PDF corrigido
    essay.correctedPdfUrl = result.secure_url;
    await essay.save();
    
    res.json({ 
      url: result.secure_url,
      message: 'PDF corrigido gerado com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

// Enviar PDF corrigido por e-mail
exports.sendEmailWithPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const essay = await Essay.findById(id)
      .populate('studentId', 'name email')
      .populate('themeId', 'title');
    
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }
    
    // Apenas professores podem enviar e-mails
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Apenas professores podem enviar e-mails com redações corrigidas' });
    }
    
    // Verificar se está corrigida
    if (essay.status !== 'GRADED') {
      return res.status(400).json({ message: 'A redação precisa estar corrigida para enviar por e-mail' });
    }
    
    // Verificar se há PDF corrigido
    if (!essay.correctedPdfUrl) {
      return res.status(400).json({ message: 'É necessário gerar o PDF corrigido antes de enviar por e-mail' });
    }
    
    // Verificar se o aluno tem e-mail
    if (!essay.studentId || !essay.studentId.email) {
      return res.status(400).json({ message: 'O aluno não possui e-mail cadastrado' });
    }
    
    // Tema da redação
    const themeTitle = essay.themeId ? essay.themeId.title : essay.themeText || 'Tema não especificado';
    
    // Enviar e-mail
    await emailService.sendEmailWithPdf({
      to: essay.studentId.email,
      subject: `Redação Corrigida - ${themeTitle}`,
      text: `Olá ${essay.studentId.name},\n\nSua redação do tema "${themeTitle}" foi corrigida pelo professor.\n\nSegue em anexo o arquivo com a correção.\n\nAtenciosamente,\nProfessor Yago Sales`,
      html: `
        <h2>Redação Corrigida</h2>
        <p>Olá <strong>${essay.studentId.name}</strong>,</p>
        <p>Sua redação do tema "<strong>${themeTitle}</strong>" foi corrigida pelo professor.</p>
        <p>Segue em anexo o arquivo com a correção.</p>
        <p>Atenciosamente,<br>Professor Yago Sales</p>
      `,
      pdfUrl: essay.correctedPdfUrl,
      filename: `redacao_corrigida_${essay._id}.pdf`
    });
    
    // Registrar envio do e-mail
    essay.email = {
      lastSentAt: new Date()
    };
    
    await essay.save();
    
    res.json({ 
      success: true,
      message: 'E-mail enviado com sucesso',
      sentTo: essay.studentId.email,
      sentAt: essay.email.lastSentAt
    });
  } catch (error) {
    next(error);
  }
};

// Gerar PDF corrigido
exports.generateCorrectedPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const essay = await Essay.findById(id).populate('studentId', 'name');

    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }

    if (essay.status !== 'GRADED' && essay.status !== 'GRADING') {
        // Salva a correção antes de gerar o PDF, caso ainda não tenha sido salva
        const { annotations, generalComments, enemScores, pasScores, finalGrade } = req.body;
        if (annotations) {
            essay.annotations = annotations.map(ann => ({
                text: ann.content.text,
                comment: ann.comment.text,
                category: ann.category,
                position: ann.position,
            }));
        }
        if (generalComments) essay.generalComments = generalComments;
        if (enemScores) essay.enemScores = enemScores;
        if (pasScores) essay.pasScores = pasScores;
        if (finalGrade !== undefined) essay.finalGrade = finalGrade;
    }


    // Dados para o espelho de correção
    const correctionData = {
      studentName: essay.studentId.name,
      essayType: essay.type,
      finalGrade: essay.finalGrade,
      generalComments: essay.generalComments,
      enemScores: essay.enemScores,
      pasScores: essay.pasScores,
      annotations: essay.annotations,
    };

    // Gera o PDF
    const pdfBytes = await pdfService.generateCorrectedPdf(essay.file.originalUrl, correctionData);

    // Envia o PDF como resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="redacao_corrigida_${essay._id}.pdf"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Erro ao gerar PDF corrigido:', error);
    next(error);
  }
};
