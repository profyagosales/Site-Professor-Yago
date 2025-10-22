const http = require('http');
const https = require('https');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { ENEM_RUBRIC, ENEM_REASON_LABELS } = require('../constants/enemRubric');

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
const COLOR_ORANGE_ACCENT = hexToRgb('#fb923c');
const COLOR_ORANGE_DEEP = hexToRgb('#ea580c');
const COLOR_SAGE = hexToRgb('#f9fafb');
const COLOR_MUTED = hexToRgb('#6b7280');
const COLOR_SLATE = hexToRgb('#1f2937');
const COLOR_SLATE_DARK = hexToRgb('#0f172a');
const COLOR_NOTE_BG = hexToRgb('#fef3c7');
const COLOR_RED = hexToRgb('#dc2626');
const COLOR_WHITE = { r: 1, g: 1, b: 1 };

const HEADER_HEIGHT = 120;
const HEADER_PADDING = 24;

function isImageMimeType(mime) {
  return typeof mime === 'string' && mime.trim().toLowerCase().startsWith('image/');
}

function detectImageMimeFromBytes(buffer) {
  if (!buffer || buffer.length < 4) return null;
  const byte0 = buffer[0];
  const byte1 = buffer[1];
  const byte2 = buffer[2];
  const byte3 = buffer[3];
  if (byte0 === 0x89 && byte1 === 0x50 && byte2 === 0x4e && byte3 === 0x47) return 'image/png';
  if (byte0 === 0xff && byte1 === 0xd8) return 'image/jpeg';
  return null;
}

function blendColor(base, target, ratio = 0.5) {
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const r = clamp(base.r + (target.r - base.r) * ratio);
  const g = clamp(base.g + (target.g - base.g) * ratio);
  const b = clamp(base.b + (target.b - base.b) * ratio);
  return { r, g, b };
}

function lightenColor(color, ratio = 0.25) {
  return blendColor(color, COLOR_WHITE, ratio);
}

function normalizeHexColor(color, fallback = '#ff8a00') {
  if (typeof color !== 'string' || !/^#?[0-9a-f]{3,6}$/i.test(color)) return hexToRgb(fallback);
  return hexToRgb(color.startsWith('#') ? color : `#${color}`);
}

function asPdfColor(color) {
  return rgb(color.r, color.g, color.b);
}

function splitUppercaseTokens(text) {
  if (!text) return [{ text, highlight: false }];
  const tokens = text.split(/(\s+)/);
  return tokens.map((token) => {
    if (!token.trim()) return { text: token, highlight: false };
    const sanitized = token.replace(/[^A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9\/\-]/gi, '');
    const highlight =
      sanitized.length >= 2 &&
      sanitized === sanitized.toUpperCase() &&
      /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9\/\-]+$/.test(sanitized);
    return { text: token, highlight };
  });
}

function drawHighlightedParagraph(page, text, options) {
  const {
    x,
    y,
    maxWidth,
    font,
    fontSize,
    baseColor = rgb(0.2, 0.2, 0.2),
    highlightColor = asPdfColor(COLOR_ORANGE),
    lineHeight = fontSize + 4,
  } = options;
  let cursorX = x;
  let cursorY = y;
  const segments = splitUppercaseTokens(text);
  segments.forEach(({ text: segment, highlight }) => {
    const width = font.widthOfTextAtSize(segment, fontSize);
    if (cursorX + width > x + maxWidth) {
      cursorX = x;
      cursorY -= lineHeight;
    }
    page.drawText(segment, {
      x: cursorX,
      y: cursorY,
      font,
      size: fontSize,
      color: highlight ? highlightColor : baseColor,
    });
    cursorX += width;
  });
  return cursorY - lineHeight;
}

const ENEM_RUBRIC_BY_KEY = ENEM_RUBRIC.reduce((map, competency) => {
  map[competency.key] = competency;
  return map;
}, {});

function getEnemLevelData(key, level) {
  const competency = ENEM_RUBRIC_BY_KEY[key];
  if (!competency) return null;
  return competency.levels.find((lvl) => lvl.level === level) || competency.levels[0] || null;
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

function parseBase64Image(dataUri) {
  if (typeof dataUri !== 'string') return null;
  const match = dataUri.match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i);
  if (!match) return null;
  try {
    return Buffer.from(match[2], 'base64');
  } catch (err) {
    console.warn('[pdf] Failed to decode base64 image', err?.message || err);
    return null;
  }
}

function maybeDecodeLooseBase64(raw) {
  if (typeof raw !== 'string') return null;
  // Reject obvious URLs
  if (/^https?:\/\//i.test(raw)) return null;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) return null;
  try {
    const cleaned = raw.replace(/\s+/g, '');
    if (!cleaned || cleaned.length % 4 !== 0) return null;
    const buffer = Buffer.from(cleaned, 'base64');
    return buffer.length ? buffer : null;
  } catch (err) {
    return null;
  }
}

async function embedRemoteImage(pdfDoc, url) {
  if (!url) return null;
  try {
    let data = null;
    if (url.startsWith('data:image/')) {
      data = parseBase64Image(url);
    } else {
      data = await fetchRemoteBytes(url);
    }
    if (!data) {
      data = maybeDecodeLooseBase64(url);
    }
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
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return null;
  }
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
  if (!originalBytes || !originalBytes.length) {
    throw new Error('Arquivo original indisponível para gerar o PDF corrigido.');
  }

  const pdfDoc = await PDFDocument.create();

  const declaredMime = essay?.originalMimeType || null;
  const inferredMime = detectImageMimeFromBytes(originalBytes);
  let treatAsImage = isImageMimeType(declaredMime) || (!declaredMime && inferredMime);

  let embeddedImage = null;
  let embeddedPages = [];

  let pagesCount = 0;
  if (!treatAsImage) {
    try {
      const originalPdfDoc = await PDFDocument.load(originalBytes);
      pagesCount = originalPdfDoc.getPageCount();
      embeddedPages = await pdfDoc.embedPdf(
        originalBytes,
        Array.from({ length: pagesCount }, (_value, idx) => idx),
      );
    } catch (err) {
      console.warn('[pdf] Failed to load/embed original as PDF, falling back to image mode', err?.message || err);
      treatAsImage = true;
      pagesCount = 0;
    }
  }

  if (treatAsImage) {
    const mime = (declaredMime || inferredMime || 'image/jpeg').toLowerCase();
    try {
      embeddedImage = mime.includes('png') ? await pdfDoc.embedPng(originalBytes) : await pdfDoc.embedJpg(originalBytes);
    } catch (err) {
      console.error('[pdf] Failed to embed image for corrected PDF', err);
      throw new Error('Formato de arquivo da redação não suportado para gerar o PDF corrigido.');
    }
    pagesCount = 1;
  }

  if (!pagesCount || (!treatAsImage && embeddedPages.length !== pagesCount)) {
    throw new Error('Não foi possível processar o arquivo original para gerar o PDF corrigido.');
  }

  const commentColumnWidth = 220;
  const margin = 24;

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoImage = null;
  const studentPhotoUrl = student?.photo || student?.photoUrl || null;
  const studentPhotoImage = await embedRemoteImage(pdfDoc, studentPhotoUrl);
  const studentName = student?.name || 'Aluno';
  const classLabel = resolveClassLabel(classInfo) || '-';
  const themeName = resolveThemeName(essay);
  const finalScore = resolveFinalScore(score);
  const submissionDate =
    essay?.submittedAt ||
    essay?.sentAt ||
    essay?.sent_at ||
    essay?.createdAt ||
    essay?.updatedAt ||
    null;
  const bimesterLabel = essay?.bimester ?? essay?.term ?? essay?.bimestre ?? '-';

  const annotationsByPage = new Map();
  (Array.isArray(annotations) ? annotations : []).forEach((ann) => {
    const page = Number(ann.page) || 1;
    if (!annotationsByPage.has(page)) annotationsByPage.set(page, []);
    annotationsByPage.get(page).push(ann);
  });
  const overflowComments = [];

  for (let index = 0; index < pagesCount; index += 1) {
    let origWidth = 0;
    let origHeight = 0;

    if (treatAsImage) {
      origWidth = embeddedImage.width;
      origHeight = embeddedImage.height;
    } else {
      const embeddedPage = embeddedPages[index];
      if (!embeddedPage) {
        throw new Error(`Falha ao embutir a página ${index + 1} do PDF original.`);
      }
      origWidth = embeddedPage.width;
      origHeight = embeddedPage.height;
    }

    const pageWidth = origWidth + commentColumnWidth;
    const headerExtra = index === 0 ? HEADER_HEIGHT : 0;
    const pageHeight = origHeight + headerExtra;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    if (treatAsImage) {
      currentPage.drawImage(embeddedImage, { x: 0, y: 0, width: origWidth, height: origHeight });
    } else {
      const embeddedPage = embeddedPages[index];
      currentPage.drawPage(embeddedPage, { x: 0, y: 0, width: origWidth, height: origHeight });
    }

    if (index === 0) {
      const headerBaseY = pageHeight - HEADER_HEIGHT;
      currentPage.drawRectangle({
        x: 0,
        y: headerBaseY,
        width: pageWidth,
        height: HEADER_HEIGHT,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      currentPage.drawRectangle({
        x: 0,
        y: headerBaseY,
        width: pageWidth,
        height: HEADER_HEIGHT,
        color: asPdfColor(COLOR_ORANGE_ACCENT),
        opacity: 0.92,
      });
      currentPage.drawRectangle({
        x: 0,
        y: headerBaseY,
        width: pageWidth,
        height: HEADER_HEIGHT,
        color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.65)),
        opacity: 0.2,
      });

      const headerPaddingX = HEADER_PADDING;
      const headerPaddingY = HEADER_PADDING / 1.5;
      const logoBlockWidth = 220;
      const noteBlockWidth = 190;
      const centerWidth = pageWidth - headerPaddingX * 2 - logoBlockWidth - noteBlockWidth - 24;

      const logoBlockX = headerPaddingX;
      const centerBlockX = logoBlockX + logoBlockWidth + 12;
      const noteBlockX = pageWidth - noteBlockWidth - headerPaddingX;
      const headerContentY = headerBaseY + headerPaddingY;
      const headerContentHeight = HEADER_HEIGHT - headerPaddingY * 2;

      currentPage.drawRectangle({
        x: logoBlockX,
        y: headerContentY,
        width: logoBlockWidth,
        height: headerContentHeight,
        color: asPdfColor(COLOR_WHITE),
        borderColor: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.55)),
        borderWidth: 1.4,
        borderRadius: 18,
      });
      currentPage.drawRectangle({
        x: centerBlockX,
        y: headerContentY,
        width: centerWidth,
        height: headerContentHeight,
        color: asPdfColor(COLOR_WHITE),
        borderColor: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.55)),
        borderWidth: 1.4,
        borderRadius: 18,
      });
      currentPage.drawRectangle({
        x: noteBlockX,
        y: headerContentY,
        width: noteBlockWidth,
        height: headerContentHeight,
        color: asPdfColor(COLOR_WHITE),
        borderColor: asPdfColor(COLOR_ORANGE_DEEP),
        borderWidth: 1.6,
        borderRadius: 18,
      });

      const logoContentY = headerContentY + headerContentHeight - 28;
      if (logoImage) {
        const maxLogoSize = Math.min(70, headerContentHeight - 40);
        const scale = maxLogoSize / Math.max(logoImage.width, logoImage.height);
        const dims = logoImage.scale(scale);
        currentPage.drawImage(logoImage, {
          x: logoBlockX + (logoBlockWidth - dims.width) / 2,
          y: headerContentY + headerContentHeight - dims.height - 16,
          width: dims.width,
          height: dims.height,
        });
      } else {
        const emblemSize = 54;
        const emblemX = logoBlockX + (logoBlockWidth - emblemSize) / 2;
        const emblemY = headerContentY + headerContentHeight - emblemSize - 12;
        currentPage.drawEllipse({
          x: emblemX + emblemSize / 2,
          y: emblemY + emblemSize / 2,
          xScale: emblemSize / 2,
          yScale: emblemSize / 2,
          color: asPdfColor(COLOR_ORANGE_DEEP),
        });
        currentPage.drawText('YS', {
          x: emblemX + emblemSize / 2 - 13,
          y: emblemY + emblemSize / 2 - 13,
          font: fontBold,
          size: 22,
          color: rgb(1, 1, 1),
        });
      }
      currentPage.drawText('Professor Yago Sales', {
        x: logoBlockX + 20,
        y: logoContentY - 46,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      currentPage.drawText('professoryagosales.com.br', {
        x: logoBlockX + 20,
        y: logoContentY - 62,
        font: fontRegular,
        size: 9,
        color: asPdfColor(COLOR_MUTED),
      });

      const noteCaption = finalScore.annulled
        ? 'Redação anulada'
        : finalScore.caption || (essay.type === 'PAS' ? 'PAS/UnB' : essay.type || 'ENEM');
      currentPage.drawText('Nota final', {
        x: noteBlockX + 20,
        y: headerContentY + headerContentHeight - 26,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      currentPage.drawText(finalScore.value, {
        x: noteBlockX + 20,
        y: headerContentY + headerContentHeight / 2 + 4,
        font: fontBold,
        size: 28,
        color: finalScore.annulled ? asPdfColor(COLOR_RED) : asPdfColor(COLOR_SLATE_DARK),
      });
      currentPage.drawText(noteCaption, {
        x: noteBlockX + 20,
        y: headerContentY + 24,
        font: fontRegular,
        size: 10,
        color: finalScore.annulled ? asPdfColor(COLOR_RED) : asPdfColor(COLOR_MUTED),
      });

      const photoSize = 60;
      const photoX = centerBlockX + 18;
      const photoY = headerContentY + headerContentHeight - photoSize - 20;
      if (studentPhotoImage) {
        const scale = photoSize / Math.max(studentPhotoImage.width, studentPhotoImage.height);
        const photoDims = studentPhotoImage.scale(scale);
        const drawY = headerContentY + headerContentHeight - photoDims.height - 20;
        currentPage.drawImage(studentPhotoImage, {
          x: photoX,
          y: drawY,
          width: photoDims.width,
          height: photoDims.height,
        });
        currentPage.drawEllipse({
          x: photoX + photoDims.width / 2,
          y: drawY + photoDims.height / 2,
          xScale: photoDims.width / 2,
          yScale: photoDims.height / 2,
          borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
          borderWidth: 1.2,
        });
      } else {
        const placeholderColor = asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.6));
        currentPage.drawEllipse({
          x: photoX + photoSize / 2,
          y: photoY + photoSize / 2,
          xScale: photoSize / 2,
          yScale: photoSize / 2,
          color: placeholderColor,
          borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
          borderWidth: 1.2,
        });
        const initials = studentName.trim().charAt(0).toUpperCase() || 'A';
        currentPage.drawText(initials, {
          x: photoX + photoSize / 2 - 10,
          y: photoY + photoSize / 2 - 12,
          font: fontBold,
          size: 20,
          color: asPdfColor(COLOR_ORANGE_DEEP),
        });
      }

      const infoTextX = photoX + photoSize + 18;
      const infoTextMaxWidth = centerBlockX + centerWidth - infoTextX - 20;
      let infoTextY = headerContentY + headerContentHeight - 22;
      currentPage.drawText(studentName, {
        x: infoTextX,
        y: infoTextY,
        font: fontBold,
        size: 14,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      infoTextY -= 16;
      currentPage.drawText(`Turma: ${classLabel || '-'}`, {
        x: infoTextX,
        y: infoTextY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoTextY -= 13;
      currentPage.drawText(`Modelo: ${essay.type || '-'}`, {
        x: infoTextX,
        y: infoTextY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoTextY -= 13;
      currentPage.drawText(`Bimestre: ${bimesterLabel}`, {
        x: infoTextX,
        y: infoTextY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoTextY -= 13;
      const submissionLabel = submissionDate
        ? new Date(submissionDate).toLocaleDateString('pt-BR')
        : '-';
      currentPage.drawText(`Entregue em: ${submissionLabel}`, {
        x: infoTextX,
        y: infoTextY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoTextY -= 14;
      const themeLines = wrapText(`Tema: ${themeName}`, infoTextMaxWidth, fontRegular, 10);
      themeLines.forEach((line) => {
        currentPage.drawText(line, {
          x: infoTextX,
          y: infoTextY,
          font: fontRegular,
          size: 10,
          color: asPdfColor(COLOR_MUTED),
        });
        infoTextY -= 12;
      });
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

    const columnX = origWidth + 14;
    const columnWidth = commentColumnWidth - margin - 4;
    let cursorY = pageHeight - margin;
    if (index === 0) {
      cursorY -= HEADER_HEIGHT;
    }
    const categories = (title) => CATEGORY_LABELS[title] || 'Comentário';
    let commentsTitleDrawn = false;

    const drawCommentsHeading = () => {
      if (commentsTitleDrawn) return;
      currentPage.drawText('Comentários', {
        x: columnX,
        y: cursorY,
        size: 10,
        font: fontBold,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      cursorY -= 18;
      commentsTitleDrawn = true;
    };

    pageAnnotations.forEach((ann) => {
      const baseColor = normalizeHexColor(ann.color, '#f97316');
      const cardColor = lightenColor(baseColor, 0.82);
      const heading = `#${ann.number} ${categories(ann.category)}`;
      const commentText = ann.comment || 'Sem comentário.';
      const cardPaddingX = 10;
      const cardPaddingY = 8;
      const maxCardWidth = columnWidth - cardPaddingX * 2;
      const textLines = wrapText(commentText, maxCardWidth, fontRegular, 9);
      const contentHeight = 12 + textLines.length * 11;
      const cardHeight = cardPaddingY * 2 + contentHeight;
      const requiredHeight = cardHeight + 12;

      if (!commentsTitleDrawn) drawCommentsHeading();

      if (cursorY - requiredHeight <= margin + 4) {
        overflowComments.push({
          heading,
          comment: commentText,
          color: baseColor,
        });
        return;
      }

      const cardTop = cursorY;
      const cardBottom = cardTop - cardHeight;

      currentPage.drawRectangle({
        x: columnX,
        y: cardBottom,
        width: columnWidth,
        height: cardHeight,
        color: asPdfColor(cardColor),
        borderColor: asPdfColor(baseColor),
        borderWidth: 1,
        borderRadius: 12,
        opacity: 0.96,
      });

      let textY = cardTop - cardPaddingY - 2;
      currentPage.drawText(heading, {
        x: columnX + cardPaddingX,
        y: textY,
        size: 8,
        font: fontRegular,
        color: asPdfColor(COLOR_MUTED),
      });
      textY -= 13;
      textLines.forEach((line) => {
        currentPage.drawText(line, {
          x: columnX + cardPaddingX,
          y: textY,
          size: 9,
          font: fontRegular,
          color: asPdfColor(COLOR_SLATE),
        });
        textY -= 11;
      });
      cursorY = cardBottom - 10;
    });
  }

  const summaryPage = pdfDoc.addPage([612, 792]);
  const summaryWidth = summaryPage.getWidth();
  const summaryHeight = summaryPage.getHeight();
  const summaryMargin = 48;

  summaryPage.drawRectangle({
    x: 0,
    y: summaryHeight - 92,
    width: summaryWidth,
    height: 92,
    color: asPdfColor(COLOR_ORANGE_DEEP),
  });
  summaryPage.drawRectangle({
    x: 0,
    y: summaryHeight - 92,
    width: summaryWidth,
    height: 92,
    color: asPdfColor(COLOR_ORANGE_ACCENT),
    opacity: 0.92,
  });
  summaryPage.drawRectangle({
    x: 0,
    y: summaryHeight - 92,
    width: summaryWidth,
    height: 92,
    color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.6)),
    opacity: 0.25,
  });

  summaryPage.drawText('Espelho de correção', {
    x: summaryMargin,
    y: summaryHeight - 48,
    font: fontBold,
    size: 22,
    color: rgb(1, 1, 1),
  });
  summaryPage.drawText('Professor Yago Sales', {
    x: summaryMargin,
    y: summaryHeight - 70,
    font: fontRegular,
    size: 10,
    color: rgb(1, 1, 1),
  });

  const cardWidth = summaryWidth - summaryMargin * 2;
  const infoCardHeight = 120;
  const infoCardX = summaryMargin;
  const infoCardY = summaryHeight - 92 - 24 - infoCardHeight;

  summaryPage.drawRectangle({
    x: infoCardX,
    y: infoCardY,
    width: cardWidth,
    height: infoCardHeight,
    color: asPdfColor(COLOR_WHITE),
    borderColor: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.6)),
    borderWidth: 1.2,
    borderRadius: 16,
  });

  const labelColor = asPdfColor(COLOR_MUTED);
  const valueColor = asPdfColor(COLOR_SLATE_DARK);
  const infoLeftX = infoCardX + 20;
  const infoRightX = infoCardX + cardWidth / 2 + 16;

  const drawLabelValue = (x, topY, label, value, options = {}) => {
    summaryPage.drawText(label.toUpperCase(), {
      x,
      y: topY,
      font: fontBold,
      size: 8,
      color: labelColor,
    });
    const text = value != null && value !== '' ? String(value) : '—';
    summaryPage.drawText(text, {
      x,
      y: topY - 14,
      font: options.bold ? fontBold : fontRegular,
      size: options.size || 12,
      color: valueColor,
    });
    return topY - 28;
  };

  let infoLeftY = infoCardY + infoCardHeight - 24;
  infoLeftY = drawLabelValue(infoLeftX, infoLeftY, 'Aluno', studentName, { bold: true });
  infoLeftY = drawLabelValue(infoLeftX, infoLeftY, 'Turma', classLabel || '-');
  infoLeftY = drawLabelValue(infoLeftX, infoLeftY, 'Modelo', essay.type || '-');

  const submissionLabel = submissionDate
    ? new Date(submissionDate).toLocaleDateString('pt-BR')
    : '-';

  let infoRightY = infoCardY + infoCardHeight - 24;
  infoRightY = drawLabelValue(infoRightX, infoRightY, 'Bimestre', bimesterLabel);
  infoRightY = drawLabelValue(infoRightX, infoRightY, 'Entregue em', submissionLabel);
  summaryPage.drawText('TEMA', {
    x: infoRightX,
    y: infoRightY,
    font: fontBold,
    size: 8,
    color: labelColor,
  });
  infoRightY -= 14;
  const themeWrapped = wrapText(themeName || '-', cardWidth / 2 - 36, fontRegular, 11);
  themeWrapped.forEach((line) => {
    summaryPage.drawText(line, {
      x: infoRightX,
      y: infoRightY,
      font: fontRegular,
      size: 11,
      color: valueColor,
    });
    infoRightY -= 13;
  });

  const sectionSpacing = 28;
  const drawSectionCard = (title, height, renderContent) => {
    const cardY = currentY - height;
    summaryPage.drawRectangle({
      x: summaryMargin,
      y: cardY,
      width: cardWidth,
      height: height,
      color: asPdfColor(COLOR_WHITE),
      borderColor: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.6)),
      borderWidth: 1.1,
      borderRadius: 16,
    });
    summaryPage.drawText(title, {
      x: summaryMargin + 18,
      y: cardY + height - 24,
      font: fontBold,
      size: 13,
      color: valueColor,
    });
    renderContent({
      x: summaryMargin + 18,
      y: cardY + height - 42,
      width: cardWidth - 36,
      bottom: cardY + 16,
    });
    currentY = cardY - sectionSpacing;
  };

  let currentY = infoCardY - sectionSpacing;

  const noteCardHeight = score?.type === 'ENEM' ? 220 : 160;
  drawSectionCard('Resumo da nota', noteCardHeight, ({ x, y, width }) => {
    const pillWidth = 150;
    const pillHeight = 56;
    summaryPage.drawRectangle({
      x,
      y: y - pillHeight + 6,
      width: pillWidth,
      height: pillHeight,
      color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.7)),
      borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
      borderWidth: 1.2,
      borderRadius: 14,
    });
    summaryPage.drawText('Nota final', {
      x: x + 14,
      y: y - 12,
      font: fontBold,
      size: 10,
      color: asPdfColor(COLOR_ORANGE_DEEP),
    });
    summaryPage.drawText(finalScore.value, {
      x: x + 14,
      y: y - 32,
      font: fontBold,
      size: 22,
      color: finalScore.annulled ? asPdfColor(COLOR_RED) : asPdfColor(COLOR_SLATE_DARK),
    });
    const caption = finalScore.annulled
      ? 'Redação anulada'
      : finalScore.caption || (essay.type === 'PAS' ? 'PAS/UnB' : 'ENEM');
    summaryPage.drawText(caption, {
      x: x + 14,
      y: y - 48,
      font: fontRegular,
      size: 9,
      color: finalScore.annulled ? asPdfColor(COLOR_RED) : labelColor,
    });

    if (score?.type === 'PAS' && score?.pas) {
      const pas = score.pas;
      const pasErrors = pas.erros || {};
      const formatValue = (value, fraction = 2) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value.toFixed(fraction);
        }
        if (value == null) return '—';
        return String(value);
      };

      const macroRows = [
        {
          id: '1',
          label: 'Apresentação (legibilidade, respeito às margens e indicação de parágrafo)',
          range: '0,00 a 0,50',
          value: pas.apresentacao,
          fraction: 2,
        },
        {
          id: '2.1',
          label: 'Consistência da argumentação e progressão temática',
          range: '0,00 a 4,50',
          value: pas.argumentacao,
          fraction: 2,
        },
        {
          id: '2.2',
          label: 'Adequação ao tipo e ao gênero textual',
          range: '0,00 a 2,00',
          value: pas.adequacao,
          fraction: 2,
        },
        {
          id: '2.3',
          label: 'Coesão e Coerências',
          range: '0,00 a 3,00',
          value: pas.coesao,
          fraction: 2,
        },
      ];

      const microSummaryRows = [
        { label: 'Nota de conteúdo (NC)', value: pas.NC, fraction: 2 },
        { label: 'Número total de linhas (TL)', value: pas.TL ?? pas.NL, fraction: 0 },
        { label: 'Número de erros (NE)', value: pas.NE ?? 0, fraction: 0 },
        {
          label: 'Desconto por erro (2 ÷ TL)',
          value: pas.descontoPorErro != null ? Number(pas.descontoPorErro).toFixed(3) : '—',
          fraction: 3,
        },
        {
          label: 'Nota final da redação (NR)',
          value: finalScore.annulled ? 0 : pas.NR ?? '—',
          fraction: 2,
          accent: true,
        },
      ];

      const microErrorRows = [
        { label: 'Grafia / Acentuação', value: pasErrors.grafia ?? 0 },
        { label: 'Pontuação / Morfossintaxe', value: pasErrors.pontuacao ?? 0 },
        { label: 'Propriedade vocabular', value: pasErrors.propriedade ?? 0 },
      ];

      const colLabelX = x + 12;
      const colRangeX = x + width - 180;
      const colValueX = x + width - 70;
      const headerHeight = 24;
      const rowHeight = 30;
      let sectionY = y - pillHeight - 6;

      // Macro table header
      summaryPage.drawRectangle({
        x,
        y: sectionY,
        width,
        height: headerHeight,
        color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.7)),
        borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
        borderWidth: 1,
        borderRadius: 12,
      });
      summaryPage.drawText('Aspectos MACROestruturais (NC)', {
        x: colLabelX,
        y: sectionY - 16,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      sectionY -= headerHeight + 4;

      macroRows.forEach((row, index) => {
        if (index === 1) {
          const groupHeight = 26;
          summaryPage.drawRectangle({
            x,
            y: sectionY - groupHeight,
            width,
            height: groupHeight,
            color: asPdfColor(lightenColor(COLOR_SAGE, 0.25)),
            borderColor: asPdfColor(lightenColor(COLOR_MUTED, 0.45)),
            borderWidth: 1,
            borderRadius: 10,
          });
          summaryPage.drawText('2. Desenvolvimento do tema', {
            x: colLabelX,
            y: sectionY - 16,
            font: fontBold,
            size: 10,
            color: asPdfColor(COLOR_SLATE_DARK),
          });
          sectionY -= groupHeight + 6;
        }
        summaryPage.drawRectangle({
          x,
          y: sectionY - rowHeight,
          width,
          height: rowHeight,
          color: asPdfColor(index % 2 === 0 ? lightenColor(COLOR_SAGE, 0.3) : COLOR_WHITE),
          borderColor: asPdfColor(lightenColor(COLOR_MUTED, 0.5)),
          borderWidth: 1,
          borderRadius: 10,
        });
        summaryPage.drawText(`${row.id} ${row.label}`, {
          x: colLabelX,
          y: sectionY - 18,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        summaryPage.drawText(row.range, {
          x: colRangeX,
          y: sectionY - 18,
          font: fontRegular,
          size: 9,
          color: asPdfColor(COLOR_MUTED),
        });
        summaryPage.drawText(formatValue(row.value, row.fraction), {
          x: colValueX,
          y: sectionY - 18,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        sectionY -= rowHeight + 4;
      });

      sectionY -= 12;

      summaryPage.drawRectangle({
        x,
        y: sectionY - rowHeight,
        width,
        height: rowHeight,
        color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.7)),
        borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
        borderWidth: 1,
        borderRadius: 10,
      });
      summaryPage.drawText('Nota de conteúdo (NC)', {
        x: colLabelX,
        y: sectionY - 18,
        font: fontBold,
        size: 10,
        color: rgb(1, 1, 1),
      });
      summaryPage.drawText('0,00 a 10,00', {
        x: colRangeX,
        y: sectionY - 18,
        font: fontRegular,
        size: 9,
        color: rgb(1, 1, 1),
      });
      summaryPage.drawText(formatValue(pas.NC, 2), {
        x: colValueX,
        y: sectionY - 18,
        font: fontBold,
        size: 10,
        color: rgb(1, 1, 1),
      });
      sectionY -= rowHeight + 16;

      // Micro summary header
      summaryPage.drawRectangle({
        x,
        y: sectionY,
        width,
        height: headerHeight,
        color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.7)),
        borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
        borderWidth: 1,
        borderRadius: 12,
      });
      summaryPage.drawText('Aspectos MICROestruturais', {
        x: colLabelX,
        y: sectionY - 16,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      sectionY -= headerHeight + 4;

      microSummaryRows.forEach((row, index) => {
        summaryPage.drawRectangle({
          x,
          y: sectionY - rowHeight,
          width,
          height: rowHeight,
          color: asPdfColor(index % 2 === 0 ? lightenColor(COLOR_SAGE, 0.25) : COLOR_WHITE),
          borderColor: asPdfColor(row.accent ? COLOR_ORANGE_ACCENT : lightenColor(COLOR_MUTED, 0.5)),
          borderWidth: 1,
          borderRadius: 10,
        });
        summaryPage.drawText(row.label, {
          x: colLabelX,
          y: sectionY - 18,
          font: row.accent ? fontBold : fontRegular,
          size: 10,
          color: row.accent ? asPdfColor(COLOR_ORANGE_DEEP) : asPdfColor(COLOR_SLATE_DARK),
        });
        summaryPage.drawText(
          typeof row.value === 'string' ? row.value : formatValue(row.value, row.fraction),
          {
            x: colValueX,
            y: sectionY - 18,
            font: fontBold,
            size: 10,
            color: row.accent ? asPdfColor(COLOR_ORANGE_DEEP) : asPdfColor(COLOR_SLATE_DARK),
          },
        );
        sectionY -= rowHeight + 4;
      });

      sectionY -= 12;

      // Micro error table
      summaryPage.drawRectangle({
        x,
        y: sectionY,
        width,
        height: headerHeight,
        color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.7)),
        borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
        borderWidth: 1,
        borderRadius: 12,
      });
      summaryPage.drawText('Categorias de erro (NE)', {
        x: colLabelX,
        y: sectionY - 16,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      sectionY -= headerHeight + 4;

      const errorRowHeight = 28;
      microErrorRows.forEach((row) => {
        const rowHeightWithDesc = row.description ? errorRowHeight + 12 : errorRowHeight;
        summaryPage.drawRectangle({
          x,
          y: sectionY - rowHeightWithDesc,
          width,
          height: rowHeightWithDesc,
          color: asPdfColor(lightenColor(COLOR_SAGE, 0.35)),
          borderColor: asPdfColor(lightenColor(COLOR_MUTED, 0.4)),
          borderWidth: 1,
          borderRadius: 10,
        });
        summaryPage.drawText(row.label, {
          x: colLabelX,
          y: sectionY - 16,
          font: fontRegular,
          size: 9,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        summaryPage.drawText(formatValue(row.value, 0), {
          x: colValueX,
          y: sectionY - 16,
          font: fontBold,
          size: 9,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        if (row.description) {
          summaryPage.drawText(row.description, {
            x: colLabelX,
            y: sectionY - 30,
            font: fontRegular,
            size: 8,
            color: asPdfColor(COLOR_MUTED),
          });
        }
        sectionY -= rowHeightWithDesc + 4;
      });

      sectionY -= 10;
      summaryPage.drawText('Fórmula aplicada: NR = NC − 2 × (NE ÷ TL)', {
        x,
        y: sectionY,
        font: fontRegular,
        size: 9,
        color: labelColor,
      });
    }

    if (score?.type === 'ENEM' && score?.enem) {
      const competencies = ENEM_RUBRIC.map((competency, idx) => {
        const selection = score.enem.competencies?.[competency.key] || {};
        const levelValue = typeof selection.level === 'number' ? selection.level : score.enem.levels?.[idx];
        const levelData = getEnemLevelData(competency.key, levelValue) || competency.levels[0];
        const points = score.enem.points?.[idx] ?? levelData?.points ?? 0;
        const summaryText = levelData?.summary || '';
        return {
          key: competency.key,
          title: competency.title,
          level: levelData.level,
          points,
          summary: summaryText,
        };
      });

      const headerHeight = 30;
      summaryPage.drawRectangle({
        x,
        y: y - pillHeight - 12,
        width,
        height: headerHeight,
        color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.75)),
        borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
        borderWidth: 1,
        borderRadius: 12,
      });
      const colTitleX = x + 14;
      const colLevelX = x + 240;
      const colSummaryX = x + 300;
      const colPointsX = x + width - 90;
      summaryPage.drawText('Competência', {
        x: colTitleX,
        y: y - pillHeight - 30,
        font: fontBold,
        size: 10,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      summaryPage.drawText('Nível', {
        x: colLevelX,
        y: y - pillHeight - 30,
        font: fontBold,
        size: 10,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      summaryPage.drawText('Resumo do desempenho', {
        x: colSummaryX,
        y: y - pillHeight - 30,
        font: fontBold,
        size: 10,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      summaryPage.drawText('Pontuação', {
        x: colPointsX,
        y: y - pillHeight - 30,
        font: fontBold,
        size: 10,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });

      let rowY = y - pillHeight - headerHeight - 18;
      competencies.forEach((comp, idx) => {
        const rowHeight = 64;
        summaryPage.drawRectangle({
          x,
          y: rowY,
          width,
          height: rowHeight,
          color: asPdfColor(idx % 2 === 0 ? lightenColor(COLOR_SAGE, 0.3) : COLOR_WHITE),
          borderColor: asPdfColor(lightenColor(COLOR_MUTED, 0.45)),
          borderWidth: 1,
          borderRadius: 10,
        });
        summaryPage.drawText(`${comp.key} — ${comp.title}`, {
          x: colTitleX,
          y: rowY - 18,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        summaryPage.drawText(`Nível ${comp.level}`, {
          x: colLevelX,
          y: rowY - 18,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_SLATE),
        });
        summaryPage.drawText(`${comp.points} pts`, {
          x: colPointsX,
          y: rowY - 18,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        const summaryLines = wrapText(comp.summary, width - (colSummaryX - x) - 16, fontRegular, 10);
        let summaryY = rowY - 34;
        summaryLines.slice(0, 3).forEach((line) => {
          summaryPage.drawText(line, {
            x: colSummaryX,
            y: summaryY,
            font: fontRegular,
            size: 9,
            color: asPdfColor(COLOR_SLATE),
          });
          summaryY -= 12;
        });
        rowY -= rowHeight + 6;
      });

      summaryPage.drawText(`Total ENEM: ${score.annulled ? 0 : score.enem.total ?? 0} pts`, {
        x,
        y: rowY - 12,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
    }
  });

  if (overflowComments.length) {
    const commentCardHeight = Math.max(150, 70 + overflowComments.length * 68);
    drawSectionCard('Comentários (continuação)', commentCardHeight, ({ x, y, width }) => {
      let commentY = y;
      overflowComments.forEach((item) => {
        const baseColor = item.color;
        const bgColor = lightenColor(baseColor, 0.8);
        const lines = wrapText(item.comment, width - 24, fontRegular, 10);
        const cardHeight = 36 + lines.length * 12;
        if (commentY - cardHeight < y - commentCardHeight + 30) return;
        summaryPage.drawRectangle({
          x,
          y: commentY - cardHeight,
          width,
          height: cardHeight,
          color: asPdfColor(bgColor),
          borderColor: asPdfColor(baseColor),
          borderWidth: 1,
          borderRadius: 12,
        });
        summaryPage.drawText(item.heading, {
          x: x + 14,
          y: commentY - 18,
          font: fontRegular,
          size: 9,
          color: asPdfColor(COLOR_MUTED),
        });
        let textY = commentY - 32;
        lines.forEach((line) => {
          summaryPage.drawText(line, {
            x: x + 14,
            y: textY,
            font: fontRegular,
            size: 10,
            color: asPdfColor(COLOR_SLATE),
          });
          textY -= 12;
        });
        commentY -= cardHeight + 14;
      });
    });
  }

  const reasonEntries = [];
  if (Array.isArray(score?.reasons) && score.reasons.length) {
    score.reasons.forEach((reason) => {
      reasonEntries.push(`• ${reason}`);
    });
  }
  if (score?.otherReason) {
    reasonEntries.push(`• ${score.otherReason}`);
  }

  drawSectionCard(
    finalScore.annulled ? 'Motivos da anulação' : 'Observações',
    Math.max(110, 60 + reasonEntries.length * 14),
    ({ x, y, width }) => {
      if (!reasonEntries.length) {
        summaryPage.drawText(finalScore.annulled ? 'Nenhum motivo informado.' : 'Sem observações adicionais.', {
          x,
          y,
          font: fontRegular,
          size: 10,
          color: asPdfColor(COLOR_SLATE),
        });
        return;
      }
      let lineY = y;
      const wrapWidth = width;
      reasonEntries.forEach((entry) => {
        const lines = wrapText(entry, wrapWidth, fontRegular, 10);
        lines.forEach((line) => {
          summaryPage.drawText(line, {
            x,
            y: lineY,
            font: fontRegular,
            size: 10,
            color: asPdfColor(COLOR_SLATE),
          });
          lineY -= 12;
        });
        lineY -= 4;
      });
    }
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generateCorrectedEssayPdf,
};
