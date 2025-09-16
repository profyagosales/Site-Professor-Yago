const Essay = require('../models/Essay');
const AICorrectionSuggestion = require('../models/AICorrectionSuggestion');
const { buildAIProvider, withFallback } = require('../services/ai/aiProvider');
const baseProvider = buildAIProvider();
const provider = withFallback(baseProvider);
const logger = require('../services/logger');

function featureEnabled() {
  return process.env.ENABLE_AI_CORRECTION === 'true';
}

exports.correctionSuggestion = async (req, res, next) => {
  try {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ message: 'Apenas professores' });
    }
    if (!featureEnabled()) {
      return res.status(403).json({ message: 'Funcionalidade desabilitada (ENABLE_AI_CORRECTION != true)' });
    }

  let { essayId, type, themeText, rawText, currentScores } = req.body || {};
    if (!essayId) {
      return res.status(400).json({ message: 'essayId é obrigatório' });
    }

    const essay = await Essay.findById(essayId).lean();
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }

    // Determinar type final: prioridade do body, depois da redação
    const finalType = type || essay.type || 'ENEM';

    const start = Date.now();
    // Sanitização e limites
    if (rawText && typeof rawText === 'string') {
      if (rawText.length > 12000) {
        return res.status(413).json({ message: 'Texto bruto excede 12.000 caracteres' });
      }
      // Remover caracteres de controle exceto \n\r\t
      rawText = rawText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
    }

    const generationInput = {
      type: finalType,
      themeText: themeText || essay.themeText || essay.theme?.title,
      rawText: rawText || '',
      currentScores: currentScores || essay.enemScores || essay.pasScores || {}
    };

    // Geração + hash (provider mock já retorna hash em metadata). Antes de gerar, se houver hash conhecido e registro recente igual, reutiliza.
  let suggestion = await provider.generateSuggestion(generationInput);

    // Tentativa de reuso: se já existe registro com mesmo hash para o mesmo professor e redação, retorna sem criar novo.
    if (suggestion?.metadata?.hash) {
      const existing = await AICorrectionSuggestion.findOne({
        essayId: essay._id,
        teacherId: req.user._id,
        hash: suggestion.metadata.hash
      }).sort({ createdAt: -1 }).lean();
      if (existing) {
        try {
          logger.info('ai_suggestion_reused', {
            userId: req.user._id?.toString(),
            essayId: essay._id?.toString(),
            type: finalType,
            provider: process.env.AI_PROVIDER || 'mock',
            hash: suggestion.metadata.hash
          });
        } catch (_) {}
        return res.json({ suggestionId: existing._id, ...suggestion, reused: true });
      }
    }
    const elapsed = Date.now() - start;
    // Persistir
    let record;
    try {
      record = await AICorrectionSuggestion.create({
        essayId: essay._id,
        teacherId: req.user._id,
        provider: process.env.AI_PROVIDER || 'mock',
        type: finalType,
        hash: suggestion.metadata?.hash,
        generationMs: suggestion.metadata?.generationMs,
        rawTextChars: suggestion.metadata?.rawTextChars,
        sections: suggestion.sections,
        disclaimer: suggestion.disclaimer
      });
    } catch (persistErr) {
      logger.error('ai_suggestion_persist_error', { error: persistErr.message });
    }
    try {
      logger.info('ai_suggestion_generated', {
        userId: req.user._id?.toString(),
        essayId: essay._id?.toString(),
        type: finalType,
        ms: elapsed,
        hasRaw: !!rawText,
        provider: process.env.AI_PROVIDER || 'mock',
        mode: suggestion.mode,
        hash: suggestion.metadata?.hash
      });
    } catch (e) { /* swallow logging errors */ }

  res.json({ suggestionId: record?._id, ...suggestion, reused: false, providerFallback: !!suggestion?.metadata?.fallback });
  } catch (err) {
    next(err);
  }
};

exports.applySuggestion = async (req, res, next) => {
  try {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ message: 'Apenas professores' });
    }
    const { id } = req.params;
    const { applyFeedback, applyScores } = req.body || {};
    const suggestion = await AICorrectionSuggestion.findById(id);
    if (!suggestion) return res.status(404).json({ message: 'Sugestão não encontrada' });
    if (suggestion.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Não autorizado para esta sugestão' });
    }
    const updates = {};
    if (applyFeedback && !suggestion.appliedFeedback) {
      updates.appliedFeedback = true;
      updates.appliedAt = new Date();
    }
    if (applyScores && !suggestion.appliedScores) {
      updates.appliedScores = true;
      updates.appliedScoresAt = new Date();
    }
    if (Object.keys(updates).length) {
      await AICorrectionSuggestion.updateOne({ _id: suggestion._id }, { $set: updates });
      try {
        logger.info('ai_suggestion_applied', {
          suggestionId: suggestion._id.toString(),
          userId: req.user._id.toString(),
          applyFeedback: !!updates.appliedFeedback,
            applyScores: !!updates.appliedScores
        });
      } catch (_) {}
    }
    res.json({ ok: true, updated: updates });
  } catch (err) { next(err); }
};
