const Essay = require('../models/Essay');
const AnnotationSet = require('../models/AnnotationSet');
const jwt = require('jsonwebtoken');
const config = require('../config');
const cloudinaryService = require('../services/cloudinaryService');
const pdfService = require('../services/pdfService');
const logger = require('../services/logger');
const { trackPdfGeneration, incEmailSent, incStatusTransition } = require('../middleware/metrics');
const emailService = require('../services/emailService');
// Usando importação dinâmica para node-fetch v3
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Resumo agregado para dashboards
exports.getEssaysSummary = async (req, res, next) => {
  try {
    const { classId, bimester } = req.query;
    const match = {};
    if (bimester) {
      const b = parseInt(bimester); if (!isNaN(b)) match.bimester = b;
    }
    if (req.user.role === 'student') {
      match.studentId = req.user.id;
    } else if (classId) {
      const User = require('../models/User');
      const students = await User.find({ classId, role: 'student' }, '_id');
      match.studentId = { $in: students.map(s => s._id) };
    }

    const pipeline = [ { $match: match }, {
      $facet: {
        byStatus: [ { $group: { _id: '$status', count: { $sum: 1 } } } ],
        byType: [ { $group: { _id: '$type', count: { $sum: 1 } } } ],
        byBimester: [ { $match: { bimester: { $exists: true } } }, { $group: { _id: '$bimester', count: { $sum: 1 } } } ],
        total: [ { $count: 'value' } ]
      }
    }];

    const [result] = await Essay.aggregate(pipeline);

    const mapArray = arr => Object.fromEntries((arr||[]).map(i => [i._id, i.count]));
    res.json({
      total: (result.total && result.total[0] && result.total[0].value) || 0,
      byStatus: mapArray(result.byStatus),
      byType: mapArray(result.byType),
      byBimester: mapArray(result.byBimester)
    });
  } catch (error) { next(error); }
};

// Listar redações com filtros
exports.getEssays = async (req, res, next) => {
  try {
    const { status, type, themeId, q, page = 1, limit = 10, bimester, classId, studentId } = req.query;
    
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

    if (bimester) {
      const b = parseInt(bimester);
      if (!isNaN(b)) filter.bimester = b;
    }

    // Filtro por turma via join (fazemos lookup posterior)
    if (classId) {
      // coletar alunos da turma
      const User = require('../models/User');
      const students = await User.find({ classId, role: 'student' }, '_id');
      filter.studentId = { $in: students.map(s => s._id) };
    }

    if (studentId) {
      filter.studentId = studentId;
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
    // Validar type
    if (type !== undefined) {
      if (!['ENEM','PAS'].includes(type)) {
        return res.status(400).json({ message: 'type inválido (ENEM|PAS)' });
      }
      essay.type = type;
    }
    // Exclusividade themeId/themeText
    if (themeId !== undefined && themeText !== undefined && themeId && themeText) {
      return res.status(400).json({ message: 'Envie apenas themeId OU themeText, não ambos.' });
    }
    if (themeId !== undefined) {
      essay.themeId = themeId || undefined;
      if (themeId) essay.themeText = undefined;
    }
    if (themeText !== undefined) {
      essay.themeText = themeText || undefined;
      if (themeText) essay.themeId = undefined;
    }
    if (bimester !== undefined) {
      const num = Number(bimester);
      if (!Number.isInteger(num) || num < 1 || num > 4) {
        return res.status(400).json({ message: 'bimester deve ser inteiro entre 1 e 4' });
      }
      essay.bimester = num;
    }
    if (countInBimester !== undefined) essay.countInBimester = !!countInBimester;
    if (studentId) {
      const User = require('../models/User');
      const newStudent = await User.findById(studentId);
      if (!newStudent || newStudent.role !== 'student') {
        return res.status(400).json({ message: 'studentId inválido' });
      }
      essay.studentId = studentId;
    }

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
    
    // Resposta simplificada: { annotations: [...] }
    res.json({
      essayId: annotationSet.essayId,
      annotations: (annotationSet.highlights || []).map(h => ({
        page: h.page,
        rects: h.rects,
        color: h.color,
        category: h.category,
        comment: h.comment,
        text: h.text,
        id: h._id
      })),
      updatedAt: annotationSet.updatedAt
    });
  } catch (error) {
    next(error);
  }
};

// Atualizar anotações (substituição idempotente do conjunto de highlights)
exports.updateAnnotations = async (req, res, next) => {
  try {
    const { id } = req.params; // essayId
    const { annotations } = req.body; // payload esperado: { annotations: [...] }

    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Apenas professores podem editar anotações' });
    }

    const essay = await require('../models/Essay').findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });

    // Validação básica do array
    if (!Array.isArray(annotations)) {
      return res.status(400).json({ message: 'Formato inválido: annotations deve ser array' });
    }

    // Map de normalização de categorias antigas -> novas
    const categoryMap = {
      ortografia: 'grammar',
      argumentacao: 'argument',
      coesao: 'cohesion',
      geral: 'general',
      // já compatíveis: formal, grammar, argument, general, cohesion
    };
    const allowedCategories = new Set(['formal','grammar','argument','general','cohesion']);

    const sanitized = [];
    for (let i = 0; i < annotations.length; i++) {
      const a = annotations[i];
      const errors = [];
      if (typeof a.page !== 'number' || a.page < 1) errors.push('page inválida');
      if (!Array.isArray(a.rects) || a.rects.length === 0) errors.push('rects obrigatórios');
      if (typeof a.comment !== 'string' || a.comment.trim() === '') errors.push('comment obrigatório');
      if (typeof a.category !== 'string') errors.push('category obrigatória');
      if (typeof a.color !== 'string' || a.color.trim() === '') errors.push('color obrigatória');
      if (errors.length) {
        return res.status(400).json({ message: 'Erro de validação em annotation', index: i, errors });
      }

      const normalizedCategory = categoryMap[a.category] || a.category;
      if (!allowedCategories.has(normalizedCategory)) {
        return res.status(400).json({ message: `Categoria inválida: ${a.category}` });
      }

      // Sanitizar rects (números não negativos, largura/altura > 0)
      const rects = a.rects.map(r => ({
        x: Number(r.x),
        y: Number(r.y),
        w: Number(r.w),
        h: Number(r.h)
      })).filter(r => Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.w) && Number.isFinite(r.h) && r.w > 0 && r.h > 0);

      if (!rects.length) {
        return res.status(400).json({ message: 'Todos os rects inválidos após sanitização', index: i });
      }

      sanitized.push({
        page: a.page,
        rects,
        color: a.color,
        category: normalizedCategory,
        comment: a.comment.trim(),
        text: a.text ? String(a.text).slice(0, 500) : undefined,
        createdBy: req.user.id
      });
    }

    // Upsert do AnnotationSet
    let annotationSet = await AnnotationSet.findOne({ essayId: id });
    if (!annotationSet) {
      annotationSet = new AnnotationSet({ essayId: id, highlights: sanitized });
    } else {
      annotationSet.highlights = sanitized;
      annotationSet.updatedAt = Date.now();
    }
    await annotationSet.save();

    res.json({
      essayId: annotationSet.essayId,
      annotations: annotationSet.highlights.map(h => ({
        page: h.page,
        rects: h.rects,
        color: h.color,
        category: h.category,
        comment: h.comment,
        text: h.text,
        id: h._id
      })),
      updatedAt: annotationSet.updatedAt
    });
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

    // Transição automática PENDING -> GRADING ao iniciar correção
    if (essay.status === 'PENDING') {
      try {
        const { assertTransition } = require('../services/statusService');
        assertTransition(essay, 'GRADING');
        essay.teacherId = req.user.id;
        incStatusTransition();
        logger.info('Transição de status',{ essayId: essay._id, from:'PENDING', to:'GRADING' });
      } catch (e) {
        return res.status(400).json({ message: e.message });
      }
    } else if (!['GRADING','GRADED'].includes(essay.status)) {
      return res.status(400).json({ message: `Status atual (${essay.status}) não permite salvar correção` });
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
    const payload = req.body;
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Apenas professores podem atribuir notas' });
    if (payload.type && payload.type !== essay.type) {
      return res.status(400).json({ message: 'Tipo enviado não corresponde ao tipo da redação' });
    }

    try {
      const { applyScoring } = require('../services/scoringService');
      await applyScoring({ essay, payload: { ...payload, type: essay.type } });
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    // Exigir que esteja em GRADING para graduar
    if (essay.status !== 'GRADING') {
      return res.status(400).json({ message: `Redação precisa estar em GRADING para atribuir nota (atual: ${essay.status})` });
    }
    try {
      const { assertTransition } = require('../services/statusService');
      assertTransition(essay, 'GRADED');
      essay.teacherId = req.user.id;
      incStatusTransition();
      logger.info('Transição de status',{ essayId: essay._id, from:'GRADING', to:'GRADED' });
      if (!essay.gradedAt) essay.gradedAt = new Date();
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
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
    
    // Verificar se está corrigida (permitir reenviar se já SENT)
    if (!['GRADED','SENT'].includes(essay.status)) {
      return res.status(400).json({ message: 'A redação precisa estar corrigida (GRADED) para enviar por e-mail' });
    }

    // Gerar PDF se ausente (idempotência de pipeline)
    const AnnotationSet = require('../models/AnnotationSet');
    if (!essay.correctedPdfUrl) {
      const annotationSet = await AnnotationSet.findOne({ essayId: id });
      if (!annotationSet || !annotationSet.highlights || !annotationSet.highlights.length) {
        return res.status(400).json({ message: 'A redação precisa ter anotações para gerar/enviar PDF' });
      }
      const startPdf = process.hrtime.bigint();
      const pdfBuffer = await pdfService.generateCorrectedPdf(essay.file.originalUrl, {
        essay,
        annotationSet,
        espelho: {
          studentName: essay.studentId.name,
          type: essay.type,
          generalComments: essay.generalComments,
          finalGrade: essay.type === 'ENEM' ? essay.enem?.rawScore : essay.pas?.rawScore
        }
      });
      const endPdf = process.hrtime.bigint();
      trackPdfGeneration(Number(endPdf - startPdf)/1e6);
      logger.info('PDF corrigido gerado', { essayId: essay._id });
      const uploadResult = await cloudinaryService.uploadFile(pdfBuffer, {
        folder: `essays/corrected/${essay._id}`,
        resource_type: 'auto'
      });
      essay.correctedPdfUrl = uploadResult.secure_url;
      await essay.save();
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
    incEmailSent();
    logger.info('Email enviado',{ essayId: essay._id, to: essay.studentId.email });
    
    // Registrar envio do e-mail e transicionar status se ainda GRADED
    essay.email = { lastSentAt: new Date() };
    if (essay.status === 'GRADED') {
      try {
        const { assertTransition } = require('../services/statusService');
        assertTransition(essay, 'SENT');
        incStatusTransition();
        logger.info('Transição de status',{ essayId: essay._id, from:'GRADED', to:'SENT' });
          if (!essay.sentAt) essay.sentAt = new Date();
      } catch (e) {
        // Se falhar a transição, ainda consideramos o envio feito mas retornamos erro de fluxo
        return res.status(400).json({ message: e.message, emailSent: true });
      }
    }
    await essay.save();
    
    res.json({ 
      success: true,
      message: 'E-mail enviado com sucesso',
      sentTo: essay.studentId.email,
      sentAt: essay.email.lastSentAt,
      status: essay.status
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

// Alterar status manualmente (endpoint controlado) - hoje só útil para PENDING -> GRADING se for necessário sem salvar correção
exports.changeEssayStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status alvo é obrigatório' });
    if (!['PENDING','GRADING','GRADED','SENT'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ message: 'Redação não encontrada' });
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Apenas professores podem alterar status' });
    try {
      const { assertTransition } = require('../services/statusService');
      assertTransition(essay, status);
      await essay.save();
      res.json({ success: true, status: essay.status });
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
  } catch (error) { next(error); }
};
