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

      const noteBoxWidth = 160;
      const noteBoxHeight = HEADER_HEIGHT - HEADER_PADDING;
      const noteBoxX = HEADER_PADDING;
      const noteBoxY = headerBaseY + HEADER_PADDING / 2;
      currentPage.drawRectangle({
        x: noteBoxX,
        y: noteBoxY,
        width: noteBoxWidth,
        height: noteBoxHeight,
        color: asPdfColor(COLOR_WHITE),
        borderColor: asPdfColor(COLOR_ORANGE_DEEP),
        borderWidth: 1.6,
        borderRadius: 16,
      });
      currentPage.drawText('Nota final', {
        x: noteBoxX + 16,
        y: noteBoxY + noteBoxHeight - 18,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      currentPage.drawText(finalScore.value, {
        x: noteBoxX + 16,
        y: noteBoxY + noteBoxHeight / 2 + 2,
        font: fontBold,
        size: 26,
        color: finalScore.annulled ? asPdfColor(COLOR_RED) : asPdfColor(COLOR_SLATE_DARK),
      });
      const noteCaption = finalScore.annulled
        ? 'Redação anulada'
        : finalScore.caption || (essay.type === 'PAS' ? 'PAS/UnB' : essay.type || 'ENEM');
      currentPage.drawText(noteCaption, {
        x: noteBoxX + 16,
        y: noteBoxY + 18,
        font: fontRegular,
        size: 9,
        color: finalScore.annulled ? asPdfColor(COLOR_RED) : asPdfColor(COLOR_MUTED),
      });

      const logoBoxWidth = 150;
      const infoBoxX = noteBoxX + noteBoxWidth + 20;
      const infoBoxY = noteBoxY;
      const infoBoxHeight = noteBoxHeight;
      const logoBoxX = pageWidth - logoBoxWidth - HEADER_PADDING;
      const infoBoxWidth = Math.max(220, logoBoxX - infoBoxX - 16);

      currentPage.drawRectangle({
        x: infoBoxX,
        y: infoBoxY,
        width: infoBoxWidth,
        height: infoBoxHeight,
        color: asPdfColor(COLOR_WHITE),
        borderColor: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.55)),
        borderWidth: 1.2,
        borderRadius: 16,
      });

      const photoSize = 58;
      const photoX = infoBoxX + 16;
      const photoY = infoBoxY + infoBoxHeight - photoSize - 16;
      if (studentPhotoImage) {
        const scale = photoSize / Math.max(studentPhotoImage.width, studentPhotoImage.height);
        const photoDims = studentPhotoImage.scale(scale);
        const drawY = infoBoxY + infoBoxHeight - photoDims.height - 16;
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
        const placeholderColor = asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.65));
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
          x: photoX + photoSize / 2 - 8,
          y: photoY + photoSize / 2 - 10,
          font: fontBold,
          size: 18,
          color: asPdfColor(COLOR_ORANGE_DEEP),
        });
      }

      const infoTextX = photoX + photoSize + 18;
      const infoTextMaxWidth = infoBoxX + infoBoxWidth - infoTextX - 16;
      let infoTextY = infoBoxY + infoBoxHeight - 18;
      const infoColor = asPdfColor(COLOR_SLATE_DARK);
      currentPage.drawText(studentName, {
        x: infoTextX,
        y: infoTextY,
        font: fontBold,
        size: 13,
        color: infoColor,
      });
      infoTextY -= 14;
      const bimesterLabel = essay.bimester ?? essay.term ?? essay.bimestre ?? '-';
      const submissionLabel = submissionDate
        ? new Date(submissionDate).toLocaleDateString('pt-BR')
        : '-';
      currentPage.drawText(`Turma: ${classLabel || '-'}`, {
        x: infoTextX,
        y: infoTextY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoTextY -= 12;
      currentPage.drawText(`Modelo: ${essay.type || '-'}`, {
        x: infoTextX,
        y: infoTextY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoTextY -= 12;
      currentPage.drawText(`Bimestre: ${bimesterLabel}`, {
        x: infoTextX,
        y: infoTextY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoTextY -= 12;
      currentPage.drawText(`Entregue: ${submissionLabel}`, {
        x: infoTextX,
        y: infoTextY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoTextY -= 12;
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

      currentPage.drawRectangle({
        x: logoBoxX,
        y: infoBoxY,
        width: logoBoxWidth,
        height: infoBoxHeight,
        color: asPdfColor(COLOR_WHITE),
        borderColor: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.55)),
        borderWidth: 1.2,
        borderRadius: 16,
      });

      if (logoImage) {
        const maxLogoSize = Math.min(60, infoBoxHeight - 36);
        const scale = maxLogoSize / Math.max(logoImage.width, logoImage.height);
        const dims = logoImage.scale(scale);
        currentPage.drawImage(logoImage, {
          x: logoBoxX + (logoBoxWidth - dims.width) / 2,
          y: infoBoxY + infoBoxHeight - dims.height - 18,
          width: dims.width,
          height: dims.height,
        });
      } else {
        const emblemSize = 48;
        const emblemX = logoBoxX + (logoBoxWidth - emblemSize) / 2;
        const emblemY = infoBoxY + infoBoxHeight - emblemSize - 22;
        currentPage.drawEllipse({
          x: emblemX + emblemSize / 2,
          y: emblemY + emblemSize / 2,
          xScale: emblemSize / 2,
          yScale: emblemSize / 2,
          color: asPdfColor(COLOR_ORANGE_DEEP),
        });
        currentPage.drawText('YS', {
          x: emblemX + emblemSize / 2 - 12,
          y: emblemY + emblemSize / 2 - 12,
          font: fontBold,
          size: 20,
          color: rgb(1, 1, 1),
        });
      }

      currentPage.drawText('Professor Yago Sales', {
        x: logoBoxX + 18,
        y: infoBoxY + 30,
        font: fontBold,
        size: 10,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      currentPage.drawText('professoryagosales.com.br', {
        x: logoBoxX + 18,
        y: infoBoxY + 18,
        font: fontRegular,
        size: 8,
        color: asPdfColor(COLOR_MUTED),
      });
      currentPage.drawText('@professoryagosales', {
        x: logoBoxX + 18,
        y: infoBoxY + 8,
        font: fontRegular,
        size: 8,
        color: asPdfColor(lightenColor(COLOR_SLATE, 0.4)),
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

    const columnX = origWidth + 12;
    const columnWidth = commentColumnWidth - margin;
    let cursorY = pageHeight - margin;
    if (index === 0) {
      cursorY -= HEADER_HEIGHT;
    }
    const categories = (title) => CATEGORY_LABELS[title] || 'Comentário';

    const drawCommentsHeading = (label) => {
      currentPage.drawText(label, {
        x: columnX,
        y: cursorY,
        size: 12,
        font: fontBold,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      cursorY -= 20;
    };

    const createCommentsPage = (label) => {
      currentPage = pdfDoc.addPage([pageWidth, origHeight]);
      cursorY = origHeight - margin;
      drawCommentsHeading(label);
    };

    const ensureSpace = (estimatedHeight, continuation = false) => {
      if (cursorY - estimatedHeight > margin + 10) return;
      createCommentsPage(`Comentários — página ${pageNumber}${continuation ? ' (cont.)' : ''}`);
    };

    if (pageAnnotations.length) {
      drawCommentsHeading(`Comentários — página ${pageNumber}`);
    }

    pageAnnotations.forEach((ann, idx) => {
      const baseColor = normalizeHexColor(ann.color, '#f97316');
      const cardColor = lightenColor(baseColor, 0.78);
      const heading = `#${ann.number} ${categories(ann.category)}`;
      const textLines = wrapText(
        ann.comment || 'Sem comentário.',
        columnWidth - 24,
        fontRegular,
        10
      );
      const cardPaddingX = 12;
      const cardPaddingY = 10;
      const contentHeight = 14 + textLines.length * 12;
      const cardHeight = cardPaddingY * 2 + contentHeight;

      ensureSpace(cardHeight + 12, idx > 0);
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

      const chipSize = 9;
      currentPage.drawEllipse({
        x: columnX + columnWidth - cardPaddingX - chipSize / 2,
        y: cardTop - cardPaddingY - chipSize / 2,
        xScale: chipSize / 2,
        yScale: chipSize / 2,
        color: asPdfColor(baseColor),
      });

      let textY = cardTop - cardPaddingY - 2;
      currentPage.drawText(heading, {
        x: columnX + cardPaddingX,
        y: textY,
        size: 11,
        font: fontBold,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      textY -= 14;
      textLines.forEach((line) => {
        currentPage.drawText(line, {
          x: columnX + cardPaddingX,
          y: textY,
          size: 10,
          font: fontRegular,
          color: asPdfColor(COLOR_SLATE),
        });
        textY -= 12;
      });
      cursorY = cardBottom - 12;
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

  const noteCardHeight = score?.type === 'ENEM' ? 240 : 180;
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
      const pasBoxWidth = (width - pillWidth - 20) / 3;
      const metrics = [
        { label: 'NC', value: score.pas.NC ?? '—' },
        { label: 'NL', value: score.pas.NL ?? '—' },
        { label: 'NE', value: score.pas.NE ?? '—' },
        { label: 'NR', value: finalScore.annulled ? '0' : score.pas.NR ?? '—', accent: true },
      ];
      const metricHeight = 52;
      let metricX = x + pillWidth + 20;
      let metricY = y - 4;
      metrics.forEach((metric, idx) => {
        if (idx === 3) {
          metricX = x;
          metricY = y - pillHeight - 22;
        }
        summaryPage.drawRectangle({
          x: metricX,
          y: metricY - metricHeight,
          width: pasBoxWidth,
          height: metricHeight,
          color: asPdfColor(metric.accent ? lightenColor(COLOR_ORANGE_ACCENT, 0.7) : lightenColor(COLOR_SAGE, 0.3)),
          borderColor: asPdfColor(metric.accent ? COLOR_ORANGE_ACCENT : lightenColor(COLOR_MUTED, 0.5)),
          borderRadius: 12,
          borderWidth: 1,
        });
        summaryPage.drawText(metric.label, {
          x: metricX + 12,
          y: metricY - 16,
          font: fontBold,
          size: 10,
          color: metric.accent ? asPdfColor(COLOR_ORANGE_DEEP) : labelColor,
        });
        summaryPage.drawText(String(metric.value), {
          x: metricX + 12,
          y: metricY - 34,
          font: fontBold,
          size: 18,
          color: valueColor,
        });
        metricX += pasBoxWidth + 12;
      });
      summaryPage.drawText('Fórmula: NR = NC - 2 × (NE / NL)', {
        x,
        y: y - pillHeight - 60,
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
        return {
          key: competency.key,
          title: competency.title,
          level: levelData.level,
          points,
          reasons: Array.isArray(selection.reasonIds) ? selection.reasonIds : [],
        };
      });

      const gridCols = 3;
      const gridPaddingTop = 12;
      const gridCellWidth = (width - 12) / gridCols - 8;
      const gridCellHeight = 64;
      let cellX = x;
      let cellY = y - pillHeight - gridPaddingTop;

      competencies.forEach((comp, idx) => {
        if (idx > 0 && idx % gridCols === 0) {
          cellX = x;
          cellY -= gridCellHeight + 10;
        }
        summaryPage.drawRectangle({
          x: cellX,
          y: cellY - gridCellHeight,
          width: gridCellWidth,
          height: gridCellHeight,
          color: asPdfColor(lightenColor(COLOR_SAGE, 0.35)),
          borderColor: asPdfColor(lightenColor(COLOR_MUTED, 0.3)),
          borderRadius: 12,
          borderWidth: 1,
        });
        summaryPage.drawText(comp.key, {
          x: cellX + 12,
          y: cellY - 16,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_ORANGE_DEEP),
        });
        summaryPage.drawText(`Nível ${comp.level}`, {
          x: cellX + 12,
          y: cellY - 30,
          font: fontBold,
          size: 12,
          color: valueColor,
        });
        summaryPage.drawText(`${comp.points} pts`, {
          x: cellX + 12,
          y: cellY - 44,
          font: fontRegular,
          size: 10,
          color: labelColor,
        });
        cellX += gridCellWidth + 12;
      });

      summaryPage.drawText(`Total ENEM: ${score.annulled ? 0 : score.enem.total ?? 0} pts`, {
        x,
        y: cellY - gridCellHeight - 18,
        font: fontBold,
        size: 12,
        color: valueColor,
      });

      const reasonLabels = [];
      ENEM_RUBRIC.forEach((competency, idx) => {
        const selection = score.enem.competencies?.[competency.key] || {};
        const reasons = Array.isArray(selection.reasonIds) ? selection.reasonIds : [];
        reasons.forEach((reasonId) => {
          const label = ENEM_REASON_LABELS.get(reasonId);
          if (label) reasonLabels.push(`• ${label}`);
        });
      });
      if (reasonLabels.length) {
        let reasonsY = cellY - gridCellHeight - 36;
        summaryPage.drawText('Justificativas selecionadas:', {
          x,
          y: reasonsY,
          font: fontBold,
          size: 10,
          color: labelColor,
        });
        reasonsY -= 14;
        reasonLabels.slice(0, 8).forEach((text) => {
          summaryPage.drawText(text, {
            x,
            y: reasonsY,
            font: fontRegular,
            size: 9,
            color: asPdfColor(COLOR_SLATE),
          });
          reasonsY -= 12;
        });
      }
    }
  });

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
