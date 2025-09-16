const crypto = require('crypto');

/**
 * Interface conceitual do provider de IA.
 * Nesta fase usamos apenas um mock determinístico para não depender de API externa.
 */
class MockAIProvider {
  constructor(options = {}) {
    this.mode = 'mock';
    this.maxRawText = options.maxRawText || 8000;
  }

  /**
   * Gera uma sugestão de correção estruturada.
   * @param {Object} params
   * @param {String} params.type ENEM | PAS | PAS/UnB
   * @param {String} [params.themeText]
   * @param {String} [params.rawText]
   * @param {Object} [params.currentScores]
   */
  async generateSuggestion(params) {
    const start = Date.now();
    const { type = 'ENEM', themeText = '', rawText = '', currentScores = {} } = params;
    const truncatedRaw = (rawText || '').slice(0, this.maxRawText);
    const hash = crypto.createHash('md5').update(truncatedRaw + themeText + type).digest('hex').slice(0,8);

    const competencies = this._buildCompetencies(type, currentScores);

    const generalFeedback = this._buildGeneralFeedback({ type, themeText, hash, rawLen: truncatedRaw.length });

    const improvements = [
      'Reforce a coesão entre parágrafos utilizando conectores adequados.',
      'Aprofunde a argumentação com dados concretos ou referências contextualizadas.',
      'Revise concordância verbal e nominal em trechos críticos.',
      'Considere elaborar uma conclusão que retome a tese com proposta mais específica.'
    ];

    const payload = {
      mode: this.mode,
      disclaimer: 'Sugestão automática (modo demonstração). Revise antes de aplicar.',
      type,
      sections: {
        generalFeedback,
        competencies,
        improvements
      },
      metadata: {
        generationMs: Date.now() - start,
        hash,
        rawTextChars: truncatedRaw.length
      }
    };
    return payload;
  }

  _buildCompetencies(type, currentScores) {
    if (type === 'ENEM') {
      return [1,2,3,4,5].map(i => ({
        id: `c${i}`,
        label: `Competência ${i}`,
        strength: this._sampleStrength(i),
        improvement: this._sampleImprovement(i),
        suggestedScore: typeof currentScores[`c${i}`] === 'number' ? currentScores[`c${i}`] : this._suggestEnemScore(i)
      }));
    }
    // PAS ou outras
    const map = [
      { id: 'arg', label: 'Argumentação' },
      { id: 'type', label: 'Tipologia' },
      { id: 'lang', label: 'Linguagem' }
    ];
    return map.map((c, idx) => ({
      ...c,
      strength: this._sampleStrength(idx+1),
      improvement: this._sampleImprovement(idx+1),
      suggestedScore: typeof currentScores[c.id] === 'number' ? currentScores[c.id] : this._suggestPasScore(idx)
    }));
  }

  _sampleStrength(seed) {
    const samples = [
      'Boa organização estrutural do texto.',
      'Clareza na formulação da tese.',
      'Uso consistente de operadores argumentativos.',
      'Vocabulário adequado ao registro formal.',
      'Coerência global mantida ao longo dos parágrafos.'
    ];
    return samples[seed % samples.length];
  }

  _sampleImprovement(seed) {
    const samples = [
      'Aprofundar exemplificação para sustentar argumentos.',
      'Reduzir repetições lexicais.',
      'Melhorar transições entre parágrafos intermediários.',
      'Refinar conclusões para maior impacto.',
      'Evitar construções excessivamente longas.'
    ];
    return samples[seed % samples.length];
  }

  _suggestEnemScore(i) {
    // Valores ilustrativos (multiplo de 40). Não é modelo real.
    return 120 + i*40; // 160..320 etc
  }

  _suggestPasScore(idx) {
    return 2 + idx; // 3..5 etc
  }

  _buildGeneralFeedback({ type, themeText, hash, rawLen }) {
    const base = `Análise gerada em modo demonstração (ref: ${hash}).`;
    const themeSegment = themeText ? ` Tema abordado: "${themeText.slice(0,80)}".` : '';
    const sizeSegment = rawLen ? ` Texto fornecido com ${rawLen} caracteres.` : ' Nenhum texto bruto fornecido.';
    const typeSegment = ` Formato identificado: ${type}.`;
    return `${base}${typeSegment}${themeSegment}${sizeSegment}\nForam identificados pontos fortes estruturais e oportunidades de refinamento conforme competências selecionadas.`;
  }
}

function buildAIProvider() {
  const providerName = process.env.AI_PROVIDER || 'mock';
  switch (providerName) {
    case 'mock':
    default:
      return new MockAIProvider();
  }
}

module.exports = { MockAIProvider, buildAIProvider };
