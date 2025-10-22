const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function hexToRgb(color) {
  if (typeof color !== 'string') return { r: 1, g: 0.8, b: 0.4 };
  const hex = color.replace('#', '');
  const value = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.padStart(6, '0');
  const num = parseInt(value, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return { r, g, b };
}

function wrapText(text, maxWidth, font, fontSize) {
  if (!text) return ['Sem comentário.'];
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : ['Sem comentário.'];
}

const CATEGORY_LABELS = {
  argumentacao: 'Argumentação',
  ortografia: 'Ortografia/Gramática',
  coesao: 'Coesão/Coerência',
  apresentacao: 'Apresentação',
  comentarios: 'Comentários gerais',
};

async function fetchPdfBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Não foi possível baixar o PDF original (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
}

async function generateCorrectedEssayPdf({
  essay,
  annotations,
  score,
  student,
  classInfo,
}) {
  if (!essay?.originalUrl) {
    throw new Error('Redação sem arquivo original.');
  }

  const originalBytes = await fetchPdfBytes(essay.originalUrl);
  const originalPdf = await PDFDocument.load(originalBytes);
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pagesCount = originalPdf.getPageCount();
  const commentColumnWidth = 220;
  const margin = 24;

  const annotationsByPage = new Map();
  (Array.isArray(annotations) ? annotations : []).forEach((ann) => {
    const page = Number(ann.page) || 1;
    if (!annotationsByPage.has(page)) annotationsByPage.set(page, []);
    annotationsByPage.get(page).push(ann);
  });

  for (let index = 0; index < pagesCount; index += 1) {
    const [origPage] = await pdfDoc.copyPages(originalPdf, [index]);
    const origWidth = origPage.getWidth();
    const origHeight = origPage.getHeight();
    let currentPage = pdfDoc.addPage([origWidth + commentColumnWidth, origHeight]);
    currentPage.drawPage(origPage, { x: 0, y: 0, width: origWidth, height: origHeight });

    const pageNumber = index + 1;
    const pageAnnotations = (annotationsByPage.get(pageNumber) || []).sort((a, b) => a.number - b.number);

    pageAnnotations.forEach((ann) => {
      const { r, g, b } = hexToRgb(ann.color);
      ann.rects.forEach((rect) => {
        const rectX = rect.x * origWidth;
        const rectWidth = rect.w * origWidth;
        const rectHeight = rect.h * origHeight;
        const rectY = origHeight - (rect.y + rect.h) * origHeight;
        currentPage.drawRectangle({
          x: rectX,
          y: rectY,
          width: rectWidth,
          height: rectHeight,
          color: rgb(r, g, b),
          opacity: 0.4,
          borderColor: rgb(r * 0.8, g * 0.8, b * 0.8),
          borderWidth: 1,
        });
        const badgeX = rectX + 6;
        const badgeY = rectY + rectHeight - 18;
        currentPage.drawRectangle({
          x: badgeX,
          y: badgeY,
          width: 20,
          height: 18,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.2, 0.2, 0.2),
          borderWidth: 1,
        });
        currentPage.drawText(`#${ann.number}`, {
          x: badgeX + 4,
          y: badgeY + 5,
          size: 10,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
      });
    });

    const columnX = origWidth + 12;
    const columnWidth = commentColumnWidth - margin;
    let cursorY = origHeight - margin;
    const categories = (title) => CATEGORY_LABELS[title] || 'Comentário';

    const ensureSpace = (estimatedHeight, continuation = false) => {
      if (cursorY - estimatedHeight > margin) return;
      currentPage = pdfDoc.addPage([origWidth + commentColumnWidth, origHeight]);
      cursorY = origHeight - margin;
      const headerText = continuation
        ? `Comentários — página ${pageNumber} (cont.)`
        : `Comentários — página ${pageNumber}`;
      currentPage.drawText(headerText, {
        x: columnX,
        y: cursorY,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      cursorY -= 18;
    };

    if (pageAnnotations.length) {
      currentPage.drawText(`Comentários — página ${pageNumber}`, {
        x: columnX,
        y: cursorY,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      cursorY -= 18;
    }

    pageAnnotations.forEach((ann, idx) => {
      const heading = `#${ann.number} ${categories(ann.category)}`;
      const textLines = wrapText(ann.comment, columnWidth, fontRegular, 10);
      const estimatedHeight = 18 + textLines.length * 12 + 8;
      ensureSpace(estimatedHeight, idx > 0);

      currentPage.drawText(heading, {
        x: columnX,
        y: cursorY,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      cursorY -= 16;
      textLines.forEach((line) => {
        currentPage.drawText(line, {
          x: columnX,
          y: cursorY,
          size: 10,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
        cursorY -= 12;
      });
      cursorY -= 8;
    });
  }

  const summaryPage = pdfDoc.addPage([612, 792]);
  const summaryMargin = 50;
  let summaryCursor = 792 - summaryMargin;

  const drawSummaryText = (text, options = {}) => {
    summaryPage.drawText(text, {
      x: summaryMargin,
      y: summaryCursor,
      size: options.size || 12,
      font: options.bold ? fontBold : fontRegular,
      color: options.color || rgb(0.2, 0.2, 0.2),
    });
    summaryCursor -= (options.lineHeight || 16);
  };

  drawSummaryText('Espelho de correção', { size: 18, bold: true, color: rgb(0.1, 0.1, 0.1), lineHeight: 28 });
  drawSummaryText(`Aluno: ${student?.name || '—'}`, { lineHeight: 18 });
  drawSummaryText(`Turma: ${classInfo?.name || `${classInfo?.series || ''}${classInfo?.letter || ''}`} `.trim() || '—', { lineHeight: 18 });
  drawSummaryText(`Modelo: ${essay.type || '—'}`, { lineHeight: 18 });

  if (score?.annulled) {
    drawSummaryText('ANULADA (nota 0)', { size: 16, bold: true, color: rgb(0.7, 0.1, 0.1), lineHeight: 24 });
  }

  if (score?.type === 'PAS' && score?.pas) {
    const pas = score.pas;
    drawSummaryText('PAS/UnB', { bold: true, lineHeight: 22 });
    drawSummaryText(`NC: ${pas.NC ?? '—'}`);
    drawSummaryText(`NL: ${pas.NL ?? '—'}`);
    drawSummaryText(`NE: ${pas.NE ?? '—'}`);
    drawSummaryText(`NR: ${score.annulled ? 0 : pas.NR ?? '—'}`);
    drawSummaryText('Fórmula: NR = NC - 2 × (NE / NL)', { lineHeight: 20 });
  }

  if (score?.type === 'ENEM' && score?.enem) {
    drawSummaryText('ENEM', { bold: true, lineHeight: 22 });
    const levels = score.enem.levels || [];
    levels.forEach((level, idx) => {
      const points = score.enem.points?.[idx] ?? levelToPoints(level);
      const line = `Competência ${idx + 1}: nível ${level} — ${points} pts`;
      drawSummaryText(line);
    });
    drawSummaryText(`Total: ${score.annulled ? 0 : score.enem.total ?? 0} pts`, { bold: true, lineHeight: 20 });
  }

  if (Array.isArray(score?.reasons) && score.reasons.length) {
    drawSummaryText('Motivos da anulação:', { bold: true, lineHeight: 20 });
    score.reasons.forEach((reason) => {
      drawSummaryText(`• ${reason}`);
    });
  }
  if (score?.otherReason) {
    drawSummaryText(`Observações: ${score.otherReason}`, { lineHeight: 18 });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function levelToPoints(level) {
  const LEVEL_POINTS = [0, 40, 80, 120, 160, 200];
  const idx = Math.max(0, Math.min(level ?? 0, 5));
  return LEVEL_POINTS[idx] ?? 0;
}

module.exports = {
  generateCorrectedEssayPdf,
};
