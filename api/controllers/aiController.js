const Essay = require('../models/Essay');
const { buildAIProvider } = require('../services/ai/aiProvider');
const provider = buildAIProvider();
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

    const suggestion = await provider.generateSuggestion({
      type: finalType,
      themeText: themeText || essay.themeText || essay.theme?.title,
      rawText: rawText || '',
      currentScores: currentScores || essay.enemScores || essay.pasScores || {}
    });
    const elapsed = Date.now() - start;
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

    res.json(suggestion);
  } catch (err) {
    next(err);
  }
};
