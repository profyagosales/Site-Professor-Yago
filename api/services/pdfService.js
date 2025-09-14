const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
// Resolutor de fetch: usa fetch nativo do Node 18+ ou faz import dinâmico apenas se necessário.
// Mantemos função para facilitar mocking em testes.
function resolveFetch() {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch;
  // fallback lazy (evita erro em Jest quando mock é simples)
  return (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

// Categorias normalizadas (frontend): formal, grammar, argument, general, cohesion
const CATEGORY_NAMES = {
  formal: 'Aspectos Formais',
  grammar: 'Ortografia/Gramática',
  argument: 'Argumentação e Estrutura',
  general: 'Comentário Geral',
  cohesion: 'Coesão e Coerência'
};

function parseColor(input) {
  try {
    if (!input) return rgb(0.5,0.5,0.5);
    if (input.startsWith('rgba')) {
      const parts = input.replace(/rgba\(|\)|\s+/g,'').split(',');
      const [r,g,b] = parts.map(Number);
      return rgb((r||0)/255,(g||0)/255,(b||0)/255);
    }
    if (input.startsWith('rgb')) {
      const parts = input.replace(/rgb\(|\)|\s+/g,'').split(',');
      const [r,g,b] = parts.map(Number);
      return rgb((r||0)/255,(g||0)/255,(b||0)/255);
    }
    if (input.startsWith('#')) {
      let hex = input.substring(1);
      if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
      const intVal = parseInt(hex,16);
      const r = (intVal >> 16) & 255;
      const g = (intVal >> 8) & 255;
      const b = intVal & 255;
      return rgb(r/255,g/255,b/255);
    }
  } catch(e) { /* noop */ }
  return rgb(0.5,0.5,0.5);
}

// Novo formato: generateCorrectedPdf(originalPdfUrl, { essay, annotationSet, espelho })
// Compat: se vier no formato antigo (studentName etc) ainda funciona
exports.generateCorrectedPdf = async (originalPdfUrl, payload) => {
  try {
    let studentName, essayType, finalGrade, generalComments, enemScores, pasScores, annotations = [], annulment, rawScore;

    if (payload && payload.espelho) {
      const { essay, annotationSet, espelho } = payload;
      studentName = espelho.studentName || essay?.studentId?.name;
      essayType = espelho.type || essay?.type;
      generalComments = espelho.generalComments || essay?.generalComments;
      finalGrade = espelho.finalGrade;
      enemScores = essayType === 'ENEM' ? essay?.enem : undefined;
      pasScores = essayType === 'PAS' ? essay?.pas : undefined;
      annulment = essay?.annulment;
      rawScore = essayType === 'ENEM' ? essay?.enem?.rawScore : essay?.pas?.rawScore;
      annotations = (annotationSet?.highlights || []).map(h => ({
        page: h.page,
        rects: h.rects.map(r => ({ x: r.x, y: r.y, width: r.w ?? r.width, height: r.h ?? r.height })),
        category: h.category,
        comment: h.comment,
        text: h.text,
        color: h.color
      }));
    } else {
      // legado
      studentName = payload.studentName;
      essayType = payload.essayType;
      finalGrade = payload.finalGrade;
      generalComments = payload.generalComments;
      enemScores = payload.enemScores;
      pasScores = payload.pasScores;
      annotations = payload.annotations || [];
    }

  // Baixar o PDF original
  const fetchFn = resolveFetch();
  const pdfBytes = await fetchFn(originalPdfUrl).then(res => res.arrayBuffer());
    
    // Carregar o PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Processar anotações
    if (annotations && annotations.length > 0) {
      const byPage = {};
      annotations.forEach(a => { if (!byPage[a.page]) byPage[a.page] = []; byPage[a.page].push(a); });
      for (const [pageNum, list] of Object.entries(byPage)) {
        const page = pdfDoc.getPage(parseInt(pageNum,10)-1);
        if (!page) continue;
        list.forEach(a => {
          const fillColor = parseColor(a.color);
          (a.rects || []).forEach(rect => {
            page.drawRectangle({
              x: rect.x,
              y: page.getHeight() - rect.y - rect.height,
              width: rect.width,
              height: rect.height,
              color: fillColor,
              opacity: 0.35
            });
          });
        });
      }
    }
    
    // Adicionar página de espelho
    let espelhoPage = pdfDoc.addPage();
    const { width, height } = espelhoPage.getSize();
    let yPosition = height - 40;

    const drawText = (text, options) => {
        const { font: textFont = font, size = 11, x = 50, y = yPosition, color = rgb(0,0,0), maxWidth = width - 100, lineHeight = 15 } = options;
        const words = text.split(' ');
        let line = '';
        for(const word of words) {
            const testLine = line + word + ' ';
            const testWidth = textFont.widthOfTextAtSize(testLine, size);
            if (testWidth > maxWidth) {
                espelhoPage.drawText(line, { x, y: yPosition, size, font: textFont, color });
                yPosition -= lineHeight;
                line = word + ' ';
            } else {
                line = testLine;
            }
        }
        espelhoPage.drawText(line, { x, y: yPosition, size, font: textFont, color });
        yPosition -= lineHeight;
    };

    const drawTitle = (text, size = 18) => {
        espelhoPage.drawText(text, {
            x: 50,
            y: yPosition,
            size,
            font: boldFont,
            color: rgb(0, 0, 0),
        });
        yPosition -= size * 1.8;
    };
    
    drawTitle('ESPELHO DE CORREÇÃO');
    
    drawText(`Aluno(a): ${studentName || 'N/A'}`, { y: yPosition, size: 12 });
    drawText(`Modelo: ${essayType}`, { y: yPosition, size: 12 });
    yPosition -= 20;

    if (annotations && annotations.length > 0) {
      drawTitle('Comentários e Anotações', 14);
      annotations.forEach((ann, index) => {
        if (yPosition < 80) { espelhoPage = pdfDoc.addPage(); yPosition = height - 40; }
        const color = parseColor(ann.color);
        const categoryName = CATEGORY_NAMES[ann.category] || 'Outros';
        espelhoPage.drawRectangle({ x: 50, y: yPosition + 2, width: 10, height: 10, color });
        espelhoPage.drawText(`${index + 1}. [${categoryName}]`, { x: 65, y: yPosition, size: 10, font: boldFont });
        yPosition -= 15;
        if (ann.text) drawText(`Trecho: "${ann.text}"`, { x: 65, size: 9, color: rgb(0.3,0.3,0.3) });
        drawText(`Comentário: ${ann.comment}`, { x: 65, size: 10 });
        yPosition -= 10;
      });
      yPosition -= 20;
    }

    if (generalComments) {
        if (yPosition < 100) {
            espelhoPage = pdfDoc.addPage();
            yPosition = height - 40;
        }
        drawTitle('Comentários Gerais', 14);
        drawText(generalComments, { size: 11, lineHeight: 15 });
        yPosition -= 20;
    }

    if (yPosition < 250) {
        espelhoPage = pdfDoc.addPage();
        yPosition = height - 40;
    }
    drawTitle('Detalhamento da Nota', 14);

    if (annulment && annulment.active) {
      drawText('REDAÇÃO ANULADA', { size: 14 });
      (annulment.reasons || []).forEach(r => drawText(`- ${r}`, { size: 10 }));
    } else if (essayType === 'ENEM' && enemScores) {
      const scores = [
        `Competência 1: ${enemScores.c1 || 0}/200`,
        `Competência 2: ${enemScores.c2 || 0}/200`,
        `Competência 3: ${enemScores.c3 || 0}/200`,
        `Competência 4: ${enemScores.c4 || 0}/200`,
        `Competência 5: ${enemScores.c5 || 0}/200`,
      ];
      scores.forEach(score => drawText(score, { size: 11 }));
    } else if (essayType === 'PAS' && pasScores) {
      const scores = [
        `NC (Conteúdo): ${pasScores.NC ?? 0}`,
        `NE (Erros): ${pasScores.NE ?? 0}`,
        `NL (Linhas): ${pasScores.NL ?? 1}`,
      ];
      scores.forEach(score => drawText(score, { size: 11 }));
    }
    yPosition -= 20;

    drawTitle('Nota Final', 16);
  espelhoPage.drawText(`${(finalGrade !== undefined ? finalGrade : (rawScore || 0))}`, { x: 50, y: yPosition, size: 22, font: boldFont });

    const correctedPdfBytes = await pdfDoc.save();
    
    return correctedPdfBytes;
  } catch (error) {
    console.error('Erro ao gerar PDF corrigido:', error);
    throw error;
  }
};
