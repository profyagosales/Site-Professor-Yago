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
const COLOR_BG = hexToRgb('#f7f8fa');
const COLOR_BORDER = hexToRgb('#e2e8f0');
const COLOR_BORDER_SOFT = hexToRgb('#f1f5f9');
const COLOR_BLUE = hexToRgb('#2563eb');
const COLOR_PINK = hexToRgb('#db2777');
const COLOR_LILAC = hexToRgb('#9333ea');

const ANNUL_REASON_LABELS = {
  MENOS_7_LINHAS: 'Menos de 7 linhas',
  FUGA_TEMA: 'Fuga ao tema',
  COPIA: 'Cópia',
  ILEGIVEL: 'Ilegível',
  FUGA_GENERO: 'Fuga ao gênero',
  OUTROS: 'Outros',
};

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

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const studentEntity = student || essay?.studentId || {};
  const studentName = studentEntity?.name || essay?.studentName || 'Aluno';
  const studentPhotoUrl =
    studentEntity?.photo ||
    studentEntity?.photoUrl ||
    studentEntity?.avatarUrl ||
    studentEntity?.avatar ||
    null;
  const studentPhotoImage = await embedRemoteImage(pdfDoc, studentPhotoUrl);
  const studentInitials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() ?? '')
    .join('') || 'A';

  const classLabel =
    resolveClassLabel(classInfo) ||
    classInfo?.name ||
    essay?.className ||
    essay?.classroom ||
    null;
  const subjectLabel = essay?.subject || essay?.subjectName || classInfo?.discipline || null;
  const modelLabel = essay?.type === 'PAS' ? 'PAS/UnB' : essay?.type || null;
  const bimesterRaw = essay?.bimester ?? essay?.term ?? essay?.bimestre ?? essay?.bimesterNumber ?? null;
  const bimesterLabel = Number.isFinite(Number(bimesterRaw))
    ? `${Number(bimesterRaw)}º bimestre`
    : (typeof bimesterRaw === 'string' && bimesterRaw.trim().length ? bimesterRaw : null);
  const heroMetaParts = [];
  if (classLabel) heroMetaParts.push(classLabel);
  if (subjectLabel) heroMetaParts.push(subjectLabel);
  if (modelLabel) heroMetaParts.push(modelLabel);
  if (bimesterLabel) heroMetaParts.push(bimesterLabel);
  const heroMetaLine = heroMetaParts.length ? heroMetaParts.join(' • ') : '—';

  const themeName = resolveThemeName(essay);
  const finalScoreInfo = resolveFinalScore(score);
  const finalScoreSuffix = essay?.type === 'PAS' ? '/10' : '/1000';
  const submissionDate =
    essay?.submittedAt ||
    essay?.sentAt ||
    essay?.sent_at ||
    essay?.deliveryDate ||
    essay?.createdAt ||
    null;
  const submissionLabel = submissionDate ? new Date(submissionDate).toLocaleDateString('pt-BR') : '—';
  const professorName = 'Professor Yago Sales';

  const annotationsByPage = new Map();
  (Array.isArray(annotations) ? annotations : []).forEach((ann) => {
    const page = Number(ann.page) || 1;
    if (!annotationsByPage.has(page)) annotationsByPage.set(page, []);
    annotationsByPage.get(page).push(ann);
  });

  const overflowComments = [];

  const layout = {
    marginLeft: 32,
    marginRight: 32,
    marginTop: 30,
    marginBottom: 36,
    columnGap: 18,
    pdfPadding: 14,
    commentsPadding: 16,
    commentCardWidth: 236,
    heroHeight: 118,
    heroGap: 18,
  };

  let lastPageWidth = 612;

  const drawHero = (page, rect) => {
    const { x, y, width, height } = rect;
    const paddingX = 24;
    const paddingY = 16;
    const sectionGap = 18;
    const brandWidth = 84;
    const statCardWidth = 132;
    const statGap = 10;
    const statsWidth = statCardWidth * 2 + statGap;
    const avatarSize = 46;

    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: asPdfColor(COLOR_WHITE),
      borderColor: asPdfColor(COLOR_BORDER),
      borderWidth: 1.15,
      borderRadius: 22,
    });
    page.drawRectangle({
      x: x + 4,
      y: y - 4,
      width: width,
      height: height,
      color: asPdfColor(lightenColor(COLOR_SLATE_DARK, 0.92)),
      opacity: 0.12,
      borderRadius: 24,
    });

    const brandX = x + paddingX;
    const brandY = y + height - paddingY;
    page.drawRectangle({
      x: brandX,
      y: brandY - 52,
      width: 52,
      height: 52,
      color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.75)),
      borderColor: asPdfColor(COLOR_ORANGE_DEEP),
      borderWidth: 1.4,
      borderRadius: 16,
    });
    page.drawText('YS', {
      x: brandX + 16,
      y: brandY - 26,
      font: fontBold,
      size: 18,
      color: asPdfColor(COLOR_ORANGE_DEEP),
    });
    page.drawText(professorName, {
      x: brandX,
      y: brandY - 60,
      font: fontBold,
      size: 11,
      color: asPdfColor(COLOR_SLATE_DARK),
    });

    const statsX = x + width - paddingX - statsWidth;
    const centerX = brandX + brandWidth + sectionGap;
    const centerWidth = Math.max(140, statsX - sectionGap - centerX);

    const avatarX = centerX;
    const avatarY = y + height - paddingY - avatarSize;
    if (studentPhotoImage) {
      const scale = avatarSize / Math.max(studentPhotoImage.width, studentPhotoImage.height);
      const dims = studentPhotoImage.scale(scale);
      page.drawRectangle({
        x: avatarX - 2,
        y: avatarY - 2,
        width: avatarSize + 4,
        height: avatarSize + 4,
        color: asPdfColor(COLOR_WHITE),
        borderRadius: 14,
      });
      page.drawImage(studentPhotoImage, {
        x: avatarX,
        y: avatarY,
        width: dims.width,
        height: dims.height,
      });
      page.drawRectangle({
        x: avatarX,
        y: avatarY,
        width: avatarSize,
        height: avatarSize,
        borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
        borderWidth: 1.2,
        borderRadius: 12,
      });
    } else {
      page.drawRectangle({
        x: avatarX,
        y: avatarY,
        width: avatarSize,
        height: avatarSize,
        color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.78)),
        borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
        borderWidth: 1.2,
        borderRadius: 12,
      });
      page.drawText(studentInitials, {
        x: avatarX + 12,
        y: avatarY + 16,
        font: fontBold,
        size: 16,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
    }

    const infoX = avatarX + avatarSize + 14;
    let infoY = y + height - paddingY - 6;
    page.drawText(studentName, {
      x: infoX,
      y: infoY,
      font: fontBold,
      size: 14,
      color: asPdfColor(COLOR_SLATE_DARK),
    });
    infoY -= 15;
    const metaLine = wrapText(heroMetaLine, centerWidth - avatarSize - 16, fontRegular, 10);
    metaLine.forEach((line) => {
      page.drawText(line, {
        x: infoX,
        y: infoY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoY -= 12;
    });
    const themeLines = wrapText(`Tema: ${themeName}`, centerWidth - avatarSize - 16, fontRegular, 10);
    themeLines.forEach((line) => {
      page.drawText(line, {
        x: infoX,
        y: infoY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      infoY -= 12;
    });

    const statTitles = [
      { label: 'TOTAL', value: finalScoreInfo.value, suffix: finalScoreSuffix },
      { label: 'MODELO', value: modelLabel || '—', suffix: '' },
    ];
    statTitles.forEach((stat, idx) => {
      const sx = statsX + idx * (statCardWidth + statGap);
      page.drawRectangle({
        x: sx,
        y: y + height - paddingY - 66,
        width: statCardWidth,
        height: 64,
        color: asPdfColor(idx === 0 ? lightenColor(COLOR_ORANGE_ACCENT, 0.86) : COLOR_WHITE),
        borderColor: asPdfColor(idx === 0 ? COLOR_ORANGE_ACCENT : COLOR_BORDER),
        borderWidth: 1.2,
        borderRadius: 14,
      });
      page.drawText(stat.label, {
        x: sx + 12,
        y: y + height - paddingY - 24,
        font: fontBold,
        size: 8.5,
        color: asPdfColor(COLOR_ORANGE_DEEP),
      });
      const valueColor = finalScoreInfo.annulled && idx === 0 ? COLOR_RED : COLOR_SLATE_DARK;
      const statValueText = stat.value || '—';
      page.drawText(statValueText, {
        x: sx + 12,
        y: y + height - paddingY - 42,
        font: fontBold,
        size: 18,
        color: asPdfColor(valueColor),
      });
      if (stat.suffix) {
        page.drawText(stat.suffix, {
          x: sx + 12 + fontBold.widthOfTextAtSize(statValueText, 18) + 4,
          y: y + height - paddingY - 38,
          font: fontRegular,
          size: 10,
          color: asPdfColor(COLOR_MUTED),
        });
      }
    });

    page.drawText(`Entregue em ${submissionLabel}`, {
      x: x + paddingX,
      y: y + 10,
      font: fontRegular,
      size: 9,
      color: asPdfColor(COLOR_MUTED),
    });
  };

  const drawCommentSidebar = ({
    page,
    cardX,
    cardY,
    cardWidth,
    cardHeight,
    comments,
  }) => {
    page.drawRectangle({
      x: cardX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      color: asPdfColor(COLOR_WHITE),
      borderColor: asPdfColor(COLOR_BORDER),
      borderWidth: 1.1,
      borderRadius: 22,
    });

    let cursorY = cardY + cardHeight - layout.commentsPadding;
    const baseX = cardX + layout.commentsPadding;
    page.drawText(`Comentários (${comments.length})`, {
      x: baseX,
      y: cursorY - 12,
      font: fontBold,
      size: 11,
      color: asPdfColor(COLOR_SLATE_DARK),
    });
    cursorY -= 24;

    const availableBottom = cardY + layout.commentsPadding;
    const columnWidth = cardWidth - layout.commentsPadding * 2;

    const getCategoryLabel = (key) => CATEGORY_LABELS[key] || 'Comentário';

    comments.forEach((ann) => {
      const baseColor = normalizeHexColor(ann.color, '#f97316');
      const bgColor = lightenColor(baseColor, 0.85);
      const heading = `#${ann.number} ${getCategoryLabel(ann.category)}`;
      const commentText = ann.comment && ann.comment.trim().length ? ann.comment.trim() : 'Sem comentário.';
      const textLines = wrapText(commentText, columnWidth - 20, fontRegular, 10);
      const cardHeightInner = 34 + textLines.length * 12;
      const totalHeight = cardHeightInner + 12;

      if (cursorY - totalHeight < availableBottom) {
        overflowComments.push({
          heading,
          comment: commentText,
          color: baseColor,
          number: ann.number,
        });
        return;
      }

      const cardBottom = cursorY - cardHeightInner;
      page.drawRectangle({
        x: baseX,
        y: cardBottom,
        width: columnWidth,
        height: cardHeightInner,
        color: asPdfColor(bgColor),
        borderColor: asPdfColor(baseColor),
        borderWidth: 1,
        borderRadius: 14,
      });
      page.drawText(heading, {
        x: baseX + 10,
        y: cursorY - 18,
        font: fontBold,
        size: 9,
        color: asPdfColor(COLOR_MUTED),
      });
      let textY = cursorY - 32;
      textLines.forEach((line) => {
        page.drawText(line, {
          x: baseX + 10,
          y: textY,
          font: fontRegular,
          size: 10,
          color: asPdfColor(COLOR_SLATE),
        });
        textY -= 12;
      });
      cursorY = cardBottom - 10;
    });
  };

  for (let index = 0; index < pagesCount; index += 1) {
    const embeddedPage = treatAsImage ? null : embeddedPages[index];
    const drawWidth = treatAsImage ? embeddedImage.width : embeddedPage.width;
    const drawHeight = treatAsImage ? embeddedImage.height : embeddedPage.height;

    const pdfCardWidth = drawWidth + layout.pdfPadding * 2;
    const pdfCardHeight = drawHeight + layout.pdfPadding * 2;
    const heroBlockHeight = index === 0 ? layout.heroHeight + layout.heroGap : 0;
    const pageWidth = layout.marginLeft + pdfCardWidth + layout.columnGap + layout.commentCardWidth + layout.marginRight;
    const pageHeight = layout.marginBottom + pdfCardHeight + heroBlockHeight + layout.marginTop;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    lastPageWidth = pageWidth;
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: asPdfColor(COLOR_BG),
    });

    if (index === 0) {
      drawHero(page, {
        x: layout.marginLeft,
        y: pageHeight - layout.marginTop - layout.heroHeight,
        width: pageWidth - layout.marginLeft - layout.marginRight,
        height: layout.heroHeight,
      });
    }

    const pdfCardX = layout.marginLeft;
    const pdfCardY = layout.marginBottom;

    page.drawRectangle({
      x: pdfCardX,
      y: pdfCardY,
      width: pdfCardWidth,
      height: pdfCardHeight,
      color: asPdfColor(COLOR_WHITE),
      borderColor: asPdfColor(COLOR_BORDER),
      borderWidth: 1.05,
      borderRadius: 22,
    });
    page.drawRectangle({
      x: pdfCardX + 6,
      y: pdfCardY - 6,
      width: pdfCardWidth,
      height: pdfCardHeight,
      color: asPdfColor(lightenColor(COLOR_SLATE_DARK, 0.93)),
      opacity: 0.18,
      borderRadius: 24,
    });

    const pdfX = pdfCardX + layout.pdfPadding;
    const pdfY = pdfCardY + layout.pdfPadding;

    if (treatAsImage) {
      page.drawImage(embeddedImage, {
        x: pdfX,
        y: pdfY,
        width: drawWidth,
        height: drawHeight,
      });
    } else {
      page.drawPage(embeddedPage, {
        x: pdfX,
        y: pdfY,
        width: drawWidth,
        height: drawHeight,
      });
    }

  const pageNumber = index + 1;
  const pageAnnotations = (annotationsByPage.get(pageNumber) || []).sort((a, b) => a.number - b.number);

    pageAnnotations.forEach((ann) => {
      const baseColor = normalizeHexColor(ann.color, '#f97316');
      const cardColor = lightenColor(baseColor, 0.82);
      (ann.rects || []).forEach((rect) => {
        const rectWidth = rect.w * drawWidth;
        const rectHeight = rect.h * drawHeight;
        const rectX = pdfX + rect.x * drawWidth;
        const rectY = pdfY + (drawHeight - (rect.y + rect.h) * drawHeight);
        page.drawRectangle({
          x: rectX,
          y: rectY,
          width: rectWidth,
          height: rectHeight,
          color: asPdfColor(baseColor),
          opacity: 0.35,
          borderColor: asPdfColor(cardColor),
          borderWidth: 1,
        });
        page.drawRectangle({
          x: rectX + 6,
          y: rectY + rectHeight - 22,
          width: 22,
          height: 18,
          color: asPdfColor(COLOR_WHITE),
          borderColor: asPdfColor(COLOR_BORDER),
          borderWidth: 1,
          borderRadius: 6,
        });
        page.drawText(`#${ann.number}`, {
          x: rectX + 10,
          y: rectY + rectHeight - 16,
          font: fontBold,
          size: 8.5,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
      });
    });

    drawCommentSidebar({
      page,
      cardX: pdfCardX + pdfCardWidth + layout.columnGap,
      cardY: pdfCardY,
      cardWidth: layout.commentCardWidth,
      cardHeight: pdfCardHeight,
      comments: pageAnnotations,
    });
  }

  const summaryPageWidth = lastPageWidth;
  const summaryPageHeight = 980;
  const summaryPage = pdfDoc.addPage([summaryPageWidth, summaryPageHeight]);
  summaryPage.drawRectangle({
    x: 0,
    y: 0,
    width: summaryPageWidth,
    height: summaryPageHeight,
    color: asPdfColor(COLOR_BG),
  });

  const summaryMarginX = layout.marginLeft;
  const summaryMarginTop = layout.marginTop;
  const summaryMarginBottom = layout.marginBottom;
  const summaryWidth = summaryPageWidth - summaryMarginX - layout.marginRight;
  const sectionGap = 20;

  let cursorY = summaryPageHeight - summaryMarginTop;

  const drawCard = (height, renderer, options = {}) => {
    const availableHeight = cursorY - summaryMarginBottom;
    const safetyPadding = 12;
    if (availableHeight <= safetyPadding + 40) return null;
    const effectiveHeight = Math.min(height, availableHeight - safetyPadding);
    if (effectiveHeight <= 44) return null;
    const cardBottom = cursorY - effectiveHeight;
    summaryPage.drawRectangle({
      x: summaryMarginX,
      y: cardBottom,
      width: summaryWidth,
      height: effectiveHeight,
      color: asPdfColor(options.background || COLOR_WHITE),
      borderColor: asPdfColor(options.borderColor || COLOR_BORDER),
      borderWidth: options.borderWidth || 1.1,
      borderRadius: 22,
    });
    renderer({
      x: summaryMarginX,
      y: cursorY,
      bottom: cardBottom,
      width: summaryWidth,
    });
    cursorY = cardBottom - sectionGap;
    return effectiveHeight;
  };

  const baseTitle = (text, yOffset = 0, color = COLOR_SLATE_DARK, size = 14) => {
    summaryPage.drawText(text, {
      x: summaryMarginX + 20,
      y: cursorY - 28 - yOffset,
      font: fontBold,
      size,
      color: asPdfColor(color),
    });
  };

  drawCard(140, ({ x, y, bottom, width }) => {
    baseTitle('Resumo da nota');
    summaryPage.drawRectangle({
      x: x + 20,
      y: y - 72,
      width: 156,
      height: 60,
      color: asPdfColor(lightenColor(COLOR_ORANGE_ACCENT, 0.82)),
      borderColor: asPdfColor(COLOR_ORANGE_ACCENT),
      borderWidth: 1.2,
      borderRadius: 16,
    });
    summaryPage.drawText('Nota final', {
      x: x + 32,
      y: y - 88,
      font: fontBold,
      size: 10,
      color: asPdfColor(COLOR_ORANGE_DEEP),
    });
    const scoreColor = finalScoreInfo.annulled ? COLOR_RED : COLOR_SLATE_DARK;
    summaryPage.drawText(finalScoreInfo.value, {
      x: x + 32,
      y: y - 106,
      font: fontBold,
      size: 20,
      color: asPdfColor(scoreColor),
    });
    summaryPage.drawText(finalScoreSuffix, {
      x: x + 32 + fontBold.widthOfTextAtSize(finalScoreInfo.value, 20) + 6,
      y: y - 100,
      font: fontRegular,
      size: 11,
      color: asPdfColor(COLOR_MUTED),
    });

    const caption = finalScoreInfo.annulled
      ? 'Redação anulada'
      : finalScoreInfo.caption || (essay?.type === 'PAS' ? 'PAS/UnB' : 'ENEM');
    summaryPage.drawText(caption, {
      x: x + 32,
      y: y - 120,
      font: fontRegular,
      size: 9,
      color: asPdfColor(finalScoreInfo.annulled ? COLOR_RED : COLOR_MUTED),
    });
  });

  const annulReasons = Array.isArray(score?.reasons)
    ? score.reasons.filter((reason) => typeof reason === 'string' && reason.trim().length)
    : [];
  if (score?.otherReason) {
    annulReasons.push(score.otherReason);
  }
  const annulled = Boolean(score?.annulled || annulReasons.length);

  const pasData = score?.type === 'PAS' ? score?.pas || null : null;
  const enemData = score?.type === 'ENEM' ? score?.enem || null : null;

  const pasMacros = pasData
    ? [
        { label: 'Apresentação', range: '0,00 a 0,50', value: pasData.apresentacao },
        { label: 'Conteúdo', range: '0,00 a 4,50', value: pasData.argumentacao },
        { label: 'Gênero textual', range: '0,00 a 2,00', value: pasData.adequacao },
        { label: 'Coesão e coerência', range: '0,00 a 3,00', value: pasData.coesao },
      ]
    : [];

  const pasMicro = pasData
    ? [
        { label: 'TL (linhas)', value: pasData.TL ?? pasData.NL },
        { label: 'NE (erros)', value: pasData.NE },
        { label: 'Desconto', value: pasData.descontoPorErro != null ? pasData.descontoPorErro.toFixed(3) : '—' },
        { label: 'Nota final (NR)', value: pasData.NR },
      ]
    : [];

  const pasErrors = pasData?.erros || {};

  const enemCompetencies = enemData
    ? ENEM_RUBRIC.map((competency, idx) => {
        const selection = enemData.competencies?.[competency.key] || {};
        const levelValue = typeof selection.level === 'number' ? selection.level : enemData.levels?.[idx];
        const levelData = getEnemLevelData(competency.key, levelValue) || competency.levels[0];
        const reasonIds = Array.isArray(selection.reasonIds) ? selection.reasonIds : [];
        const reasonsText = reasonIds
          .map((id) => ENEM_REASON_LABELS[id] || null)
          .filter(Boolean)
          .join(' • ');
        return {
          key: competency.key,
          title: competency.title,
          level: levelData.level,
          points: enemData.points?.[idx] ?? levelData.points ?? 0,
          summary: levelData.summary,
          reasons: reasonsText || 'Sem justificativas selecionadas',
        };
      })
    : [];

  const correctionCardHeight = (() => {
    let base = 160;
    base += Math.max(annulReasons.length, 1) * 18 + 32;
    if (annulled) {
      return base + 70;
    }
    if (pasData) {
      return base + 240;
    }
    if (enemData) {
      return base + enemCompetencies.length * 80 + 60;
    }
    return base + 60;
  })();

  drawCard(correctionCardHeight, ({ x, y, bottom, width }) => {
    baseTitle('Espelho do aluno');
    let sectionY = y - 54;

    summaryPage.drawText('Anulação', {
      x: x + 24,
      y: sectionY,
      font: fontBold,
      size: 11,
      color: asPdfColor(COLOR_SLATE_DARK),
    });
    sectionY -= 16;

    if (annulReasons.length) {
      annulReasons.forEach((reason, idx) => {
        const label = ANNUL_REASON_LABELS[reason] || reason;
        summaryPage.drawText(`• ${label}`, {
          x: x + 30,
          y: sectionY,
          font: fontRegular,
          size: 10,
          color: asPdfColor(COLOR_ORANGE_DEEP),
        });
        sectionY -= 14;
      });
    } else {
      summaryPage.drawText('Nenhum motivo selecionado.', {
        x: x + 30,
        y: sectionY,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_MUTED),
      });
      sectionY -= 18;
    }

    if (annulled) {
      summaryPage.drawRectangle({
        x: x + 20,
        y: sectionY - 50,
        width: width - 40,
        height: 50,
        color: asPdfColor(lightenColor(COLOR_RED, 0.78)),
        borderColor: asPdfColor(COLOR_RED),
        borderWidth: 1.2,
        borderRadius: 14,
      });
      summaryPage.drawText('Redação anulada. A nota final será 0 e o espelho completo ficará oculto para o aluno.', {
        x: x + 30,
        y: sectionY - 30,
        font: fontRegular,
        size: 10,
        color: asPdfColor(COLOR_RED),
      });
      return;
    }

    if (pasData) {
      sectionY -= 6;
      summaryPage.drawRectangle({
        x: x + 20,
        y: sectionY - 150,
        width: width - 40,
        height: 150,
        color: asPdfColor(lightenColor(COLOR_BLUE, 0.82)),
        borderColor: asPdfColor(COLOR_BLUE),
        borderWidth: 1.2,
        borderRadius: 18,
      });
      summaryPage.drawText('MACROestruturais', {
        x: x + 32,
        y: sectionY - 20,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      let macroY = sectionY - 36;
      pasMacros.forEach((macro) => {
        summaryPage.drawText(macro.label, {
          x: x + 32,
          y: macroY,
          font: fontRegular,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        summaryPage.drawText(macro.range, {
          x: x + width - 170,
          y: macroY,
          font: fontRegular,
          size: 9,
          color: asPdfColor(COLOR_MUTED),
        });
        const valueText = macro.value != null && Number.isFinite(macro.value) ? macro.value.toFixed(2) : '—';
        summaryPage.drawText(valueText, {
          x: x + width - 90,
          y: macroY,
          font: fontBold,
          size: 11,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        macroY -= 20;
      });

      sectionY -= 170;
      summaryPage.drawRectangle({
        x: x + 20,
        y: sectionY - 120,
        width: width - 40,
        height: 120,
        color: asPdfColor(lightenColor(COLOR_PINK, 0.82)),
        borderColor: asPdfColor(COLOR_PINK),
        borderWidth: 1.2,
        borderRadius: 18,
      });
      summaryPage.drawText('MICROestruturais', {
        x: x + 32,
        y: sectionY - 20,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      let microY = sectionY - 40;
      pasMicro.forEach((entry) => {
        const valueText = entry.value != null && Number.isFinite(Number(entry.value))
          ? Number(entry.value).toFixed(entry.label.includes('Desconto') ? 3 : 2)
          : String(entry.value ?? '—');
        summaryPage.drawText(entry.label, {
          x: x + 32,
          y: microY,
          font: fontRegular,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        summaryPage.drawText(valueText, {
          x: x + width - 90,
          y: microY,
          font: fontBold,
          size: 11,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        microY -= 18;
      });
      microY -= 6;
      summaryPage.drawText('Categorias de erro', {
        x: x + 32,
        y: microY,
        font: fontBold,
        size: 10,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      microY -= 16;
      [
        { label: 'Grafia/Acentuação', value: pasErrors.grafia ?? 0 },
        { label: 'Pontuação/Morfossintaxe', value: pasErrors.pontuacao ?? 0 },
        { label: 'Propriedade vocabular', value: pasErrors.propriedade ?? 0 },
      ].forEach((entry) => {
        summaryPage.drawText(entry.label, {
          x: x + 42,
          y: microY,
          font: fontRegular,
          size: 9,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        summaryPage.drawText(String(entry.value ?? 0), {
          x: x + width - 90,
          y: microY,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        microY -= 14;
      });
      return;
    }

    if (enemData) {
      summaryPage.drawText('Resumo das competências', {
        x: x + 24,
        y: sectionY,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      sectionY -= 20;
      enemCompetencies.forEach((comp) => {
        summaryPage.drawRectangle({
          x: x + 20,
          y: sectionY - 68,
          width: width - 40,
          height: 64,
          color: asPdfColor(lightenColor(COLOR_LILAC, 0.86)),
          borderColor: asPdfColor(COLOR_LILAC),
          borderWidth: 1,
          borderRadius: 16,
        });
        summaryPage.drawText(`${comp.key} — ${comp.title}`, {
          x: x + 32,
          y: sectionY - 22,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        summaryPage.drawText(`Nível ${comp.level}`, {
          x: x + width - 140,
          y: sectionY - 22,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        summaryPage.drawText(`${comp.points} pts`, {
          x: x + width - 76,
          y: sectionY - 22,
          font: fontBold,
          size: 10,
          color: asPdfColor(COLOR_SLATE_DARK),
        });
        const summaryLines = wrapText(comp.summary, width - 80, fontRegular, 9);
        let textY = sectionY - 38;
        summaryLines.slice(0, 2).forEach((line) => {
          summaryPage.drawText(line, {
            x: x + 32,
            y: textY,
            font: fontRegular,
            size: 9,
            color: asPdfColor(COLOR_SLATE),
          });
          textY -= 11;
        });
        summaryPage.drawText(comp.reasons, {
          x: x + 32,
          y: textY,
          font: fontRegular,
          size: 8.5,
          color: asPdfColor(COLOR_MUTED),
        });
        sectionY -= 80;
      });
      summaryPage.drawText(`Total ENEM: ${enemData.total ?? 0} pts`, {
        x: x + 24,
        y: sectionY - 6,
        font: fontBold,
        size: 11,
        color: asPdfColor(COLOR_SLATE_DARK),
      });
      return;
    }

    summaryPage.drawText('Sem dados de espelho disponíveis.', {
      x: x + 24,
      y: sectionY,
      font: fontRegular,
      size: 10,
      color: asPdfColor(COLOR_MUTED),
    });
  });

  if (overflowComments.length) {
    const overflowHeight = 80 + overflowComments.length * 52;
    drawCard(overflowHeight, ({ x, y, width }) => {
      baseTitle('Comentários (continuação)');
      let commentY = y - 48;
      overflowComments.forEach((item) => {
        if (commentY < summaryMarginBottom + 70) return;
        const bgColor = lightenColor(item.color, 0.82);
        summaryPage.drawRectangle({
          x: x + 20,
          y: commentY - 46,
          width: width - 40,
          height: 42,
          color: asPdfColor(bgColor),
          borderColor: asPdfColor(item.color),
          borderWidth: 1,
          borderRadius: 14,
        });
        summaryPage.drawText(item.heading, {
          x: x + 32,
          y: commentY - 16,
          font: fontBold,
          size: 9,
          color: asPdfColor(COLOR_MUTED),
        });
        const lines = wrapText(item.comment, width - 120, fontRegular, 9);
        summaryPage.drawText(lines[0] || 'Sem comentário.', {
          x: x + 32,
          y: commentY - 30,
          font: fontRegular,
          size: 9,
          color: asPdfColor(COLOR_SLATE),
        });
        commentY -= 52;
      });
    }, { borderColor: lightenColor(COLOR_ORANGE_ACCENT, 0.4), borderWidth: 1.05 });
  }

  const observationReasons = [];
  if (Array.isArray(score?.reasons)) {
    score.reasons.forEach((reason) => {
      const label = ANNUL_REASON_LABELS[reason] || reason;
      observationReasons.push(label);
    });
  }
  if (score?.otherReason) {
    observationReasons.push(score.otherReason);
  }

  const observationsHeight = Math.max(110, 60 + observationReasons.length * 16);
  drawCard(observationsHeight, ({ x, y, width }) => {
    baseTitle(annulled ? 'Motivos da anulação' : 'Observações');
    let lineY = y - 48;
    if (!observationReasons.length) {
      summaryPage.drawText(annulled ? 'Nenhum motivo informado.' : 'Sem observações adicionais.', {
        x: x + 28,
        y: lineY,
        font: fontRegular,
        size: 11,
        color: asPdfColor(COLOR_MUTED),
      });
      return;
    }
    observationReasons.forEach((entry) => {
      const lines = wrapText(`• ${entry}`, width - 56, fontRegular, 10);
      lines.forEach((line) => {
        summaryPage.drawText(line, {
          x: x + 28,
          y: lineY,
          font: fontRegular,
          size: 10,
          color: asPdfColor(COLOR_SLATE),
        });
        lineY -= 12;
      });
      lineY -= 4;
    });
  }, { borderColor: lightenColor(COLOR_ORANGE_ACCENT, 0.4), borderWidth: 1.05 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generateCorrectedEssayPdf,
};
