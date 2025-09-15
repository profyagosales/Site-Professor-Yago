const Essay = require('../models/Essay');
const { MockAIProvider } = require('../services/ai/aiProvider');

const provider = new MockAIProvider();

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

    const { essayId, type, themeText, rawText, currentScores } = req.body || {};
    if (!essayId) {
      return res.status(400).json({ message: 'essayId é obrigatório' });
    }

    const essay = await Essay.findById(essayId).lean();
    if (!essay) {
      return res.status(404).json({ message: 'Redação não encontrada' });
    }

    // Determinar type final: prioridade do body, depois da redação
    const finalType = type || essay.type || 'ENEM';

    const suggestion = await provider.generateSuggestion({
      type: finalType,
      themeText: themeText || essay.themeText || essay.theme?.title,
      rawText: rawText || '',
      currentScores: currentScores || essay.enemScores || essay.pasScores || {}
    });

    res.json(suggestion);
  } catch (err) {
    next(err);
  }
};
