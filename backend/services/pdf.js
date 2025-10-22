const http = require('http');
const https = require('https');
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

const SITE_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="10" y="10" width="80" height="80" rx="22" ry="22" fill="#fff2e5" stroke="#ff8a00" stroke-width="8" />
  <path d="M32 28 L46 48 L46 72" stroke="#ff8a00" stroke-width="10" stroke-linecap="round" fill="none" />
  <path d="M60 28 C78 28 78 46 60 46 C42 46 42 64 60 64 C76 64 76 72 62 74" stroke="#ff8a00" stroke-width="9" stroke-linecap="round" fill="none" />
</svg>`;

const COLOR_ORANGE = hexToRgb('#ff8a00');
const COLOR_SAGE = hexToRgb('#f9fafb');
const COLOR_MUTED = hexToRgb('#6b7280');
const COLOR_SLATE = hexToRgb('#1f2937');
const COLOR_NOTE_BG = hexToRgb('#fef3c7');
const COLOR_RED = hexToRgb('#dc2626');

const HEADER_HEIGHT = 120;
const HEADER_PADDING = 24;

function asPdfColor(color) {
  return rgb(color.r, color.g, color.b);
}

function resolveClassLabel(classInfo) {
  if (!classInfo) return null;
  const parts = [];
  if (classInfo.series) {
    const letter = classInfo.letter ? String(classInfo.letter).toUpperCase() : '';
    parts.push(`${classInfo.series}${letter}`.trim());
  }
  if (classInfo.discipline) parts.push(classInfo.discipline);
  if (!parts.length && classInfo.name) parts.push(classInfo.name);
  return parts.filter(Boolean).join(' • ') || null;
}

function resolveThemeName(essay) {
  if (!essay) return 'Tema não informado';
  if (essay.customTheme) return essay.customTheme;
  if (essay.themeId && typeof essay.themeId.name === 'string') return essay.themeId.name;
  if (essay.theme) return essay.theme;
  if (essay.topic) return essay.topic;
  return 'Tema não informado';
}

function resolveFinalScore(score) {
  if (!score) return { value: '-', caption: null, annulled: false };
  if (score.annulled) {
    return { value: '0', caption: 'Anulada', annulled: true };
  }
  if (score.type === 'PAS') {
    const nr = typeof score.pas?.NR === 'number' ? score.pas.NR : null;
    return { value: nr != null ? nr.toFixed(2) : '-', caption: 'PAS/UnB', annulled: false };
  }
  if (score.type === 'ENEM') {
    const total = typeof score.enem?.total === 'number' ? score.enem.total : null;
    return { value: total != null ? String(total) : '-', caption: 'ENEM', annulled: false };
  }
  const fallback = typeof score?.enem?.total === 'number'
    ? score.enem.total
    : typeof score?.pas?.NR === 'number'
      ? score.pas.NR
      : null;
  return { value: fallback != null ? String(fallback) : '-', caption: score?.type || null, annulled: false };
}

async function embedSvgLogo(pdfDoc) {
  try {
    const logo = await pdfDoc.embedSvg(SITE_LOGO_SVG);
    return logo;
  } catch (err) {
    console.warn('[pdf] Failed to embed logo SVG', err?.message || err);
    return null;
  }
}

async function embedRemoteImage(pdfDoc, url) {
  if (!url) return null;
  try {
    const data = await fetchRemoteBytes(url);
    if (!data || !data.length) return null;
    if (data[0] === 0x89 && data[1] === 0x50) {
      return await pdfDoc.embedPng(data);
    }
    if (data[0] === 0xff && data[1] === 0xd8) {
      return await pdfDoc.embedJpg(data);
    }
    return null;
  } catch (err) {
    console.warn('[pdf] Failed to embed remote image', url, err?.message || err);
    return null;
  }
}

async function fetchRemoteBytes(url) {
  return new Promise((resolve, reject) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const request = client.get(url, { timeout: 30000 }, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          response.resume();
          reject(new Error(`Não foi possível baixar o PDF original (status ${response.statusCode}).`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', (err) => reject(err));
      });
      request.on('error', (err) => reject(err));
      request.on('timeout', () => {
        request.destroy(new Error('Timeout ao baixar o PDF original.'));
      });
    } catch (err) {
      reject(err);
    }
  });
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

  const originalBytes = await fetchRemoteBytes(essay.originalUrl);
  const originalPdf = await PDFDocument.load(originalBytes);
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pagesCount = originalPdf.getPageCount();
  const commentColumnWidth = 220;
  const margin = 24;

  const logoImage = await embedSvgLogo(pdfDoc);
  const studentPhotoUrl = student?.photo || student?.photoUrl || null;
  const studentPhotoImage = await embedRemoteImage(pdfDoc, studentPhotoUrl);
  const studentName = student?.name || 'Aluno';
  const classLabel = resolveClassLabel(classInfo) || '-';
  const themeName = resolveThemeName(essay);
  const finalScore = resolveFinalScore(score);

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
    const pageWidth = origWidth + commentColumnWidth;
    const headerExtra = index === 0 ? HEADER_HEIGHT : 0;
    const pageHeight = origHeight + headerExtra;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    currentPage.drawPage(origPage, { x: 0, y: 0, width: origWidth, height: origHeight });

    if (index === 0) {
      const headerBaseY = pageHeight - HEADER_HEIGHT;
      currentPage.drawRectangle({
        x: 0,
        y: headerBaseY,
        width: pageWidth,
        height: HEADER_HEIGHT,
        color: asPdfColor(COLOR_SAGE),
      });

      let contentX = HEADER_PADDING;
      if (logoImage) {
        const maxLogoSize = HEADER_HEIGHT - HEADER_PADDING * 2;
        const logoScale = maxLogoSize / Math.max(logoImage.width, logoImage.height);
        const logoDims = logoImage.scale(logoScale);
        const logoY = headerBaseY + HEADER_HEIGHT - logoDims.height - HEADER_PADDING;
        currentPage.drawImage(logoImage, {
          x: contentX,
          y: logoY,
          width: logoDims.width,
          height: logoDims.height,
        });
        contentX += logoDims.width + 16;
      }

      const photoSize = 52;
      let textStartX = contentX;
      const photoY = headerBaseY + HEADER_HEIGHT - photoSize - HEADER_PADDING;
      if (studentPhotoImage) {
        const scale = photoSize / Math.max(studentPhotoImage.width, studentPhotoImage.height);
        const photoDims = studentPhotoImage.scale(scale);
        const drawnY = headerBaseY + HEADER_HEIGHT - photoDims.height - HEADER_PADDING;
        currentPage.drawImage(studentPhotoImage, {
          x: contentX,
          y: drawnY,
          width: photoDims.width,
          height: photoDims.height,
        });
        currentPage.drawEllipse({
          x: contentX + photoDims.width / 2,
          y: drawnY + photoDims.height / 2,
          xScale: photoDims.width / 2,
          yScale: photoDims.height / 2,
          borderColor: asPdfColor(COLOR_ORANGE),
          borderWidth: 1.5,
        });
        textStartX = contentX + photoDims.width + 14;
      } else {
        const placeholderColor = asPdfColor(hexToRgb('#ffedd5'));
        currentPage.drawEllipse({
          x: contentX + photoSize / 2,
          y: photoY + photoSize / 2,
          xScale: photoSize / 2,
          yScale: photoSize / 2,
          color: placeholderColor,
          borderColor: asPdfColor(COLOR_ORANGE),
          borderWidth: 1.5,
        });
        const initials = studentName.trim().charAt(0).toUpperCase() || 'A';
        currentPage.drawText(initials, {
          x: contentX + photoSize / 2 - 5,
          y: photoY + photoSize / 2 - 6,
          font: fontBold,
          size: 12,
          color: asPdfColor(COLOR_ORANGE),
        });
        textStartX = contentX + photoSize + 14;
      }

      let textY = headerBaseY + HEADER_HEIGHT - HEADER_PADDING - 6;
      currentPage.drawText(studentName, {
        x: textStartX,
        y: textY,
        font: fontBold,
        size: 14,
        color: asPdfColor(COLOR_SLATE),
      });
      textY -= 14;
      currentPage.drawText(`Turma: ${classLabel}`, {
        x: textStartX,
        y: textY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      textY -= 12;
      currentPage.drawText(`Tipo: ${essay.type || '-'}`, {
        x: textStartX,
        y: textY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      textY -= 12;
      const bimesterLabel = essay.bimester ?? essay.term ?? essay.bimestre ?? '-';
      currentPage.drawText(`Bimestre: ${bimesterLabel}`, {
        x: textStartX,
        y: textY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      textY -= 12;
      const themeLines = wrapText(`Tema: ${themeName}`, 260, fontRegular, 10);
      themeLines.forEach((line) => {
        currentPage.drawText(line, {
          x: textStartX,
          y: textY,
          font: fontRegular,
          size: 10,
          color: asPdfColor(COLOR_MUTED),
        });
        textY -= 12;
      });

      const noteBoxWidth = 150;
      const noteBoxHeight = 64;
      const noteX = pageWidth - noteBoxWidth - HEADER_PADDING;
      const noteY = headerBaseY + HEADER_PADDING / 2;
      currentPage.drawRectangle({
        x: noteX,
        y: noteY,
        width: noteBoxWidth,
        height: noteBoxHeight,
        color: asPdfColor(COLOR_NOTE_BG),
        borderColor: asPdfColor(COLOR_ORANGE),
        borderWidth: 1.4,
        borderRadius: 12,
      });
      currentPage.drawText('Nota', {
        x: noteX + 12,
        y: noteY + noteBoxHeight - 16,
        font: fontBold,
        size: 10,
        color: asPdfColor(COLOR_ORANGE),
      });
      currentPage.drawText(finalScore.value, {
        x: noteX + 12,
        y: noteY + 24,
        font: fontBold,
        size: 22,
        color: finalScore.annulled ? asPdfColor(COLOR_RED) : asPdfColor(COLOR_SLATE),
      });
      if (finalScore.caption) {
        currentPage.drawText(finalScore.caption, {
          x: noteX + 12,
          y: noteY + 8,
          font: fontRegular,
          size: 9,
          color: finalScore.annulled ? asPdfColor(COLOR_RED) : asPdfColor(COLOR_MUTED),
        });
      }
    }

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
    let cursorY = pageHeight - margin;
    if (index === 0) {
      cursorY -= HEADER_HEIGHT;
    }
    const categories = (title) => CATEGORY_LABELS[title] || 'Comentário';

    const createCommentsPage = (label) => {
      currentPage = pdfDoc.addPage([pageWidth, origHeight]);
      cursorY = origHeight - margin;
      currentPage.drawText(label, {
        x: columnX,
        y: cursorY,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      cursorY -= 18;
    };

    const ensureSpace = (estimatedHeight, continuation = false) => {
      if (cursorY - estimatedHeight > margin) return;
      createCommentsPage(`Comentários — página ${pageNumber}${continuation ? ' (cont.)' : ''}`);
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
  drawSummaryText(`Aluno: ${studentName}`, { lineHeight: 18 });
  drawSummaryText(`Turma: ${classLabel}`, { lineHeight: 18 });
  drawSummaryText(`Modelo: ${essay.type || '—'}`, { lineHeight: 18 });
  drawSummaryText(`Tema: ${themeName}`, { lineHeight: 18 });
  drawSummaryText(`Nota final: ${finalScore.value}${finalScore.caption ? ` (${finalScore.caption})` : ''}`, {
    lineHeight: 20,
    bold: true,
  });

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
