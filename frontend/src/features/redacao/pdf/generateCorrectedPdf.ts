import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import {
  A4,
  BG,
  CATEGORY,
  GRAY,
  MARGIN,
  ORANGE,
  TEXT,
  TEXT_SUBTLE,
  HEADER_HEIGHT,
  CONTENT_GAP,
  PREVIEW_PADDING,
  TITLE_SIZE,
  BODY_SIZE,
  columns,
} from './theme';
import { renderEnemMirrorPage } from './mirrors/enem';
import { renderPasMirrorPage } from './mirrors/pas';
import type { AnnotationKind, EssayPdfData } from './types';

const HEADER_GAP = CONTENT_GAP;
const BODY_TOP_SPACING = 16;
const PROFESSOR_WIDTH = 160;
const SCORE_WIDTH = 160;
const BADGE_PADDING = 10;
const CARD_PADDING = 12;
const AVATAR_SIZE = 64;
const PREVIEW_GAP = 8;
const COMMENT_TITLE_SIZE = TITLE_SIZE;
const COMMENT_LABEL_SIZE = TITLE_SIZE;
const COMMENT_TEXT_SIZE = BODY_SIZE;
const COMMENT_LINE_GAP = 4;
const COMMENT_CARD_GAP = 8;
const COMMENT_CARD_PADDING = 12;
const COMMENT_BAND_HEIGHT = 22;
const COMMENT_BAND_TEXT_GAP = 6;
const COMMENT_TITLE_TEXT_GAP = 6;
const HIGHLIGHT_FILL_OPACITY = 0.28;
const HIGHLIGHT_BORDER_OPACITY = 0.8;
const HIGHLIGHT_LABEL_SIZE = 20;
const HIGHLIGHT_LABEL_FONT_SIZE = 10;

type PageAnnotation = EssayPdfData['annotations'][number];

type FontPack = {
  regular: PDFFont;
  bold: PDFFont;
};

type DrawContext = {
  page: PDFPage;
  data: EssayPdfData;
  pdfDoc: PDFDocument;
  fonts: FontPack;
};

const COMMENT_TITLES: Record<AnnotationKind, string> = {
  argument: 'Argumentação',
  grammar: 'Ortografia/Gramática',
  cohesion: 'Coesão/Coerência',
  presentation: 'Apresentação',
  general: 'Comentários gerais',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPageAnnotations(data: EssayPdfData, pageNumber: number): PageAnnotation[] {
  if (!Array.isArray(data.annotations)) return [];
  return data.annotations.filter((ann) => ann.page === pageNumber);
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() ?? '')
    .join('');
}

function hexToRgbComponents(hex: string) {
  const sanitized = hex.replace('#', '').trim();
  const normalized = sanitized.length === 3
    ? sanitized
        .split('')
        .map((char) => char + char)
        .join('')
    : sanitized;
  const int = parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return { r, g, b };
}

function colorFromHex(hex: string) {
  const { r, g, b } = hexToRgbComponents(hex);
  return rgb(r / 255, g / 255, b / 255);
}

function mixWithWhite(hex: string, amount = 0.3) {
  const { r, g, b } = hexToRgbComponents(hex);
  const mix = (channel: number) => (channel * amount + 255 * (1 - amount)) / 255;
  return rgb(mix(r), mix(g), mix(b));
}

function truncateText(font: PDFFont, text: string, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = '…';
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, size);
  let current = '';
  for (const char of text) {
    const next = current + char;
    const width = font.widthOfTextAtSize(next, size);
    if (width + ellipsisWidth > maxWidth) break;
    current = next;
  }
  return `${current.trimEnd()}${ellipsis}`;
}

function extractDataUriImage(dataUri: string) {
  const match = dataUri.match(/^data:image\/(png|jpe?g);base64,([\s\S]+)/i);
  if (!match) return null;
  const [, formatRaw, base64] = match;
  const format = formatRaw.toLowerCase();
  const base64Decoder = typeof globalThis.atob === 'function' ? globalThis.atob : null;
  if (!base64Decoder) {
    console.warn('[generateCorrectedPdf] Unable to decode base64 avatar: atob is not available in this environment.');
    return null;
  }
  const binary = base64Decoder(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { format, bytes };
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  if (!text || !text.trim()) return [];
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  paragraphs.forEach((paragraph, index) => {
    const sanitized = paragraph.trim();
    if (!sanitized) {
      if (index < paragraphs.length - 1) lines.push('');
      return;
    }
    const words = sanitized.split(/\s+/);
    let current = '';
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    if (index < paragraphs.length - 1) lines.push('');
  });
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

async function embedImageFromDataUri(pdfDoc: PDFDocument, source: string) {
  const parsed = extractDataUriImage(source);
  if (!parsed) return null;
  try {
    return parsed.format === 'png'
      ? await pdfDoc.embedPng(parsed.bytes)
      : await pdfDoc.embedJpg(parsed.bytes);
  } catch (err) {
    console.warn('[generateCorrectedPdf] Failed to embed image', err);
    return null;
  }
}

async function drawProfessorBadge({ page, data, fonts }: DrawContext, originX: number, originY: number) {
  page.drawRectangle({
    x: originX,
    y: originY,
    width: PROFESSOR_WIDTH,
    height: HEADER_HEIGHT,
    color: colorFromHex(ORANGE),
  });

  const badgeInnerX = originX + BADGE_PADDING;
  const badgeInnerY = originY + BADGE_PADDING;
  const badgeInnerWidth = PROFESSOR_WIDTH - BADGE_PADDING * 2;

  const professorName = data.professor?.name?.trim() || 'Professor Yago Sales';
  const professorInitials = (data.professor?.initials?.trim() || getInitials(professorName) || 'YS').toUpperCase();

  const circleSize = 72;
  const circleCenterX = badgeInnerX + circleSize / 2;
  const circleCenterY = originY + HEADER_HEIGHT - BADGE_PADDING - circleSize / 2;

  page.drawCircle({
    x: circleCenterX,
    y: circleCenterY,
    size: circleSize / 2,
    color: colorFromHex(BG),
  });

  const initialsFontSize = 24;
  const initialsWidth = fonts.bold.widthOfTextAtSize(professorInitials, initialsFontSize);
  const initialsHeight = fonts.bold.heightAtSize(initialsFontSize);

  page.drawText(professorInitials, {
    x: circleCenterX - initialsWidth / 2,
    y: circleCenterY - initialsHeight / 2 + initialsFontSize * 0.1,
    size: initialsFontSize,
    font: fonts.bold,
    color: colorFromHex(ORANGE),
  });

  const nameFontSize = 11;
  const maxWidth = badgeInnerWidth;
  const displayName = truncateText(fonts.bold, professorName, nameFontSize, maxWidth);

  page.drawText(displayName, {
    x: badgeInnerX,
    y: badgeInnerY,
    size: nameFontSize,
    font: fonts.bold,
    color: colorFromHex(BG),
  });
}

async function drawStudentCard(
  context: DrawContext,
  originX: number,
  originY: number,
  width: number,
) {
  const { page, data, pdfDoc, fonts } = context;

  page.drawRectangle({
    x: originX,
    y: originY,
    width,
    height: HEADER_HEIGHT,
    color: colorFromHex(BG),
    borderColor: mixWithWhite(ORANGE, 0.3),
    borderWidth: 1,
  });

  const cardInnerX = originX + CARD_PADDING;
  const cardInnerY = originY + CARD_PADDING;
  const textAreaTop = originY + HEADER_HEIGHT - CARD_PADDING;

  const avatarUrl = data.student.avatarUrl;
  let avatarDrawn = false;
  let textAreaWidth = width - CARD_PADDING * 2;

  if (typeof avatarUrl === 'string' && avatarUrl.startsWith('data:image')) {
    const parsed = extractDataUriImage(avatarUrl);
    if (parsed) {
      try {
        const image = parsed.format === 'png' ? await pdfDoc.embedPng(parsed.bytes) : await pdfDoc.embedJpg(parsed.bytes);
        const avatarX = originX + width - CARD_PADDING - AVATAR_SIZE;
        const avatarY = originY + HEADER_HEIGHT - CARD_PADDING - AVATAR_SIZE;
        page.drawImage(image, {
          x: avatarX,
          y: avatarY,
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
        });
        avatarDrawn = true;
        textAreaWidth = Math.max(textAreaWidth - AVATAR_SIZE - 8, 0);
      } catch (err) {
        console.warn('[generateCorrectedPdf] Failed to embed avatar image', err);
      }
    }
  }

  const textMaxWidth = textAreaWidth;
  const nameSize = 14;
  const bodySize = BODY_SIZE;
  const lineGap = 3;
  let baseline = textAreaTop;

  const studentName = truncateText(fonts.bold, data.student.name || 'Aluno', nameSize, textMaxWidth);

  baseline -= nameSize;
  page.drawText(studentName, {
    x: cardInnerX,
    y: baseline,
    size: nameSize,
    font: fonts.bold,
    color: colorFromHex(TEXT),
  });

  baseline -= lineGap;

  const classLineSource = data.klass?.label?.trim() || '';
  if (classLineSource) {
    const classLine = truncateText(fonts.regular, classLineSource, bodySize, textMaxWidth);
    baseline -= bodySize;
    page.drawText(classLine, {
      x: cardInnerX,
      y: baseline,
      size: bodySize,
      font: fonts.regular,
      color: colorFromHex(TEXT_SUBTLE),
    });
    baseline -= lineGap;
  }

  const deliveredLabel =
    typeof data.deliveredAt === 'string' && data.deliveredAt.trim()
      ? `Entregue em ${data.deliveredAt.trim()}`
      : null;
  const termLineSource = data.termLabel?.trim() || deliveredLabel || '';
  if (termLineSource) {
    const termLine = truncateText(fonts.regular, termLineSource, bodySize, textMaxWidth);
    baseline -= bodySize;
    page.drawText(termLine, {
      x: cardInnerX,
      y: baseline,
      size: bodySize,
      font: fonts.regular,
      color: colorFromHex(TEXT_SUBTLE),
    });
    baseline -= lineGap;
  }

  const themeSource = data.theme?.trim() || 'Tema não informado';
  const themeLine = truncateText(fonts.regular, `Tema: ${themeSource}`, bodySize, textMaxWidth);
  baseline -= bodySize;
  page.drawText(themeLine, {
    x: cardInnerX,
    y: baseline,
    size: bodySize,
    font: fonts.regular,
    color: colorFromHex(TEXT),
  });

  if (!avatarDrawn && typeof avatarUrl === 'string' && avatarUrl && !avatarUrl.startsWith('data:image')) {
    console.warn('[generateCorrectedPdf] Avatar URL must be a data URI to embed in the PDF.');
  }
}

function drawScoreBox({ page, data, fonts }: DrawContext, originX: number, originY: number) {
  page.drawRectangle({
    x: originX,
    y: originY,
    width: SCORE_WIDTH,
    height: HEADER_HEIGHT,
    color: colorFromHex(GRAY),
  });

  const padding = 12;
  const smallLabelSize = BODY_SIZE;
  const scoreSize = 36;
  const subtitleSize = 12;
  const contentTop = originY + HEADER_HEIGHT - padding;

  let baseline = contentTop;
  baseline -= smallLabelSize;
  page.drawText('Nota final', {
    x: originX + padding,
    y: baseline,
    size: smallLabelSize,
    font: fonts.regular,
    color: colorFromHex(TEXT_SUBTLE),
  });

  baseline -= 6;
  baseline -= scoreSize;
  const scoreText = data.finalScore && data.finalScore.trim() ? data.finalScore.trim() : '-';
  page.drawText(scoreText, {
    x: originX + padding,
    y: baseline,
    size: scoreSize,
    font: fonts.bold,
    color: colorFromHex(TEXT),
  });

  const modelLabel = (data.model || '').toString().toUpperCase() || '-';
  page.drawText(modelLabel, {
    x: originX + padding,
    y: originY + padding,
    size: subtitleSize,
    font: fonts.regular,
    color: colorFromHex(TEXT_SUBTLE),
  });
}

function getAnnotationLabel(kind: AnnotationKind) {
  return COMMENT_TITLES[kind] ?? COMMENT_TITLES.general;
}

async function drawDocumentPreview(
  context: DrawContext,
  originX: number,
  top: number,
  bottom: number,
  maxWidth: number,
  annotations: PageAnnotation[],
) {
  const { data, pdfDoc, page, fonts } = context;
  const availableHeight = top - bottom;
  if (availableHeight <= PREVIEW_PADDING * 2) return;

  const innerMaxWidth = Math.max(0, maxWidth - PREVIEW_PADDING * 2);
  const innerMaxHeight = Math.max(0, availableHeight - PREVIEW_PADDING * 2);
  if (innerMaxWidth <= 0 || innerMaxHeight <= 0) return;

  page.drawRectangle({
    x: originX,
    y: bottom,
    width: maxWidth,
    height: availableHeight,
    color: colorFromHex(BG),
    borderColor: colorFromHex(GRAY),
    borderWidth: 1,
  });

  let embeddedImage: any = null;
  let imgWidth = 0;
  let imgHeight = 0;
  let placeholderText: string | null = null;

  if (Array.isArray(data.pagesPng) && typeof data.pagesPng[0] === 'string' && data.pagesPng[0]) {
    const source = data.pagesPng[0]!;
    if (source.startsWith('data:image')) {
      const image = await embedImageFromDataUri(pdfDoc, source);
      if (image && image.width && image.height) {
        embeddedImage = image;
        imgWidth = image.width;
        imgHeight = image.height;
      } else {
        placeholderText = 'Pré-visualização indisponível';
      }
    } else {
      console.warn('[generateCorrectedPdf] Expected pagesPng[0] as data URI (image/png).');
      placeholderText = 'Pré-visualização indisponível';
    }
  } else {
    placeholderText = 'PDF não disponível';
  }

  if (!embeddedImage || !imgWidth || !imgHeight) {
    const label = placeholderText ?? 'Pré-visualização indisponível';
    const textWidth = fonts.bold.widthOfTextAtSize(label, COMMENT_TITLE_SIZE);
    const textHeight = fonts.bold.heightAtSize(COMMENT_TITLE_SIZE);
    const caretY = bottom + availableHeight / 2 - textHeight / 2;
    const caretX = originX + maxWidth / 2 - textWidth / 2;
    page.drawText(label, {
      x: caretX,
      y: caretY,
      size: COMMENT_TITLE_SIZE,
      font: fonts.bold,
      color: colorFromHex(TEXT_SUBTLE),
    });
    return;
  }

  const innerAvailableHeight = Math.max(0, availableHeight - PREVIEW_PADDING * 2);
  const scale = Math.min(innerMaxWidth / imgWidth, innerAvailableHeight / imgHeight);
  if (!Number.isFinite(scale) || scale <= 0) {
    const label = 'Pré-visualização indisponível';
    const textWidth = fonts.bold.widthOfTextAtSize(label, COMMENT_TITLE_SIZE);
    const textHeight = fonts.bold.heightAtSize(COMMENT_TITLE_SIZE);
    const caretY = bottom + availableHeight / 2 - textHeight / 2;
    const caretX = originX + maxWidth / 2 - textWidth / 2;
    page.drawText(label, {
      x: caretX,
      y: caretY,
      size: COMMENT_TITLE_SIZE,
      font: fonts.bold,
      color: colorFromHex(TEXT_SUBTLE),
    });
    return;
  }

  const targetWidth = imgWidth * scale;
  const targetHeight = imgHeight * scale;
  const imageX =
    originX + PREVIEW_PADDING + Math.max(0, (innerMaxWidth - targetWidth) / 2);
  const imageY =
    bottom + PREVIEW_PADDING + Math.max(0, (innerAvailableHeight - targetHeight) / 2);

  page.drawImage(embeddedImage, {
    x: imageX,
    y: imageY,
    width: targetWidth,
    height: targetHeight,
  });

  const imageOverlayLeft = imageX;
  const imageOverlayBottom = imageY;
  const imageOverlayTop = imageY + targetHeight;
  const imageOverlayRight = imageX + targetWidth;
  annotations.forEach((annotation, index) => {
    const baseColorHex = CATEGORY[annotation.kind] ?? CATEGORY.general;
    const baseColor = colorFromHex(baseColorHex);
    const normX = clamp(annotation.x, 0, 1);
    const normY = clamp(annotation.y, 0, 1);
    const maxWidthNorm = 1 - normX;
    const maxHeightNorm = 1 - normY;
    const normWidth = clamp(annotation.width, 0, maxWidthNorm);
    const normHeight = clamp(annotation.height, 0, maxHeightNorm);
    if (normWidth <= 0 || normHeight <= 0) return;

    const rectWidth = normWidth * targetWidth;
    const rectHeight = normHeight * targetHeight;
    if (rectWidth <= 0 || rectHeight <= 0) return;

    const rectX = imageX + normX * targetWidth;
    const rectTop = imageOverlayTop - normY * targetHeight;
    const rectY = rectTop - rectHeight;

    if (rectY >= imageOverlayTop || rectX >= imageOverlayRight) return;
    const clippedX = clamp(rectX, imageOverlayLeft, imageOverlayRight);
    const clippedY = clamp(rectY, imageOverlayBottom, imageOverlayTop);
    const clippedWidth = clamp(rectX + rectWidth, imageOverlayLeft, imageOverlayRight) - clippedX;
    const clippedHeight = clamp(rectY + rectHeight, imageOverlayBottom, imageOverlayTop) - clippedY;
    if (clippedWidth <= 0 || clippedHeight <= 0) return;

    page.drawRectangle({
      x: clippedX,
      y: clippedY,
      width: clippedWidth,
      height: clippedHeight,
      color: baseColor,
      opacity: HIGHLIGHT_FILL_OPACITY,
      borderColor: baseColor,
      borderWidth: 1,
      borderOpacity: HIGHLIGHT_BORDER_OPACITY,
    });

    const labelWidth = Math.min(HIGHLIGHT_LABEL_SIZE, clippedWidth);
    const labelHeight = Math.min(HIGHLIGHT_LABEL_SIZE, clippedHeight);
    if (labelWidth > 0 && labelHeight > 0) {
      const labelX = clippedX;
      const labelY = clippedY + clippedHeight - labelHeight;
      const labelText = `#${index + 1}`;
      page.drawRectangle({
        x: labelX,
        y: labelY,
        width: labelWidth,
        height: labelHeight,
        color: baseColor,
        opacity: Math.min(1, HIGHLIGHT_BORDER_OPACITY + 0.1),
        borderColor: baseColor,
        borderWidth: 0,
      });

      const textWidth = fonts.bold.widthOfTextAtSize(labelText, HIGHLIGHT_LABEL_FONT_SIZE);
      const textHeight = fonts.bold.heightAtSize(HIGHLIGHT_LABEL_FONT_SIZE);
      const textX = labelX + Math.max((labelWidth - textWidth) / 2, 2);
      const textY = labelY + Math.max((labelHeight - textHeight) / 2, 1);
      page.drawText(labelText, {
        x: textX,
        y: textY,
        size: HIGHLIGHT_LABEL_FONT_SIZE,
        font: fonts.bold,
        color: colorFromHex(TEXT),
      });
    }
  });
}

function drawCommentsColumn(
  context: DrawContext,
  originX: number,
  top: number,
  bottom: number,
  width: number,
  annotations: PageAnnotation[],
  startIndex: number,
): number {
  const { page, fonts } = context;
  let cursor = top;

  if (width <= 0 || cursor <= bottom) return startIndex;

  if (annotations.length <= startIndex) {
    if (startIndex === 0) {
      const baseline = Math.max(bottom, cursor - COMMENT_TEXT_SIZE);
      page.drawText('Sem comentários nesta página.', {
        x: originX,
        y: baseline,
        size: COMMENT_TEXT_SIZE,
        font: fonts.regular,
        color: colorFromHex(TEXT_SUBTLE),
      });
    }
    return annotations.length;
  }

  const innerWidth = Math.max(8, width - COMMENT_CARD_PADDING * 2);
  const bandNumberSize = 10;
  let index = startIndex;
  let drewAny = false;

  while (index < annotations.length) {
    const annotation = annotations[index];
    const numberLabel = `#${index + 1}`;
    const kind = annotation.kind;
    const title = getAnnotationLabel(kind);
    const baseColor = CATEGORY[kind] ?? CATEGORY.general;
    const bandColor = mixWithWhite(baseColor, 0.3);
    const textLinesRaw = wrapText(fonts.regular, annotation.text || '', COMMENT_TEXT_SIZE, innerWidth);
    const textLines = textLinesRaw.length > 0 ? textLinesRaw : ['Sem comentário.'];
    const textBlockHeight =
      textLines.length * COMMENT_TEXT_SIZE +
      Math.max(0, textLines.length - 1) * COMMENT_LINE_GAP;
    const cardHeight =
      COMMENT_BAND_HEIGHT +
      COMMENT_BAND_TEXT_GAP +
      COMMENT_LABEL_SIZE +
      COMMENT_TITLE_TEXT_GAP +
      textBlockHeight +
      COMMENT_CARD_PADDING;

    if (cursor - cardHeight < bottom) {
      if (drewAny) {
        break;
      }
    }

    const cardTop = cursor;
    const cardBottom = Math.max(bottom, cardTop - cardHeight);

    page.drawRectangle({
      x: originX,
      y: cardBottom,
      width,
      height: cardTop - cardBottom,
      color: colorFromHex(BG),
      borderColor: colorFromHex(GRAY),
      borderWidth: 1,
    });

    page.drawRectangle({
      x: originX,
      y: cardTop - COMMENT_BAND_HEIGHT,
      width,
      height: COMMENT_BAND_HEIGHT,
      color: bandColor,
    });

    const numberBaseline =
      cardTop - COMMENT_BAND_HEIGHT + (COMMENT_BAND_HEIGHT - bandNumberSize) / 2;
    page.drawText(numberLabel, {
      x: originX + COMMENT_CARD_PADDING,
      y: numberBaseline,
      size: bandNumberSize,
      font: fonts.bold,
      color: colorFromHex(TEXT),
    });

    const innerX = originX + COMMENT_CARD_PADDING;
    let textCursor = cardTop - COMMENT_BAND_HEIGHT - COMMENT_BAND_TEXT_GAP;

    textCursor -= COMMENT_LABEL_SIZE;
    page.drawText(title, {
      x: innerX,
      y: textCursor,
      size: COMMENT_LABEL_SIZE,
      font: fonts.bold,
      color: colorFromHex(TEXT),
    });

    textCursor -= COMMENT_TITLE_TEXT_GAP;

    for (let lineIndex = 0; lineIndex < textLines.length; lineIndex += 1) {
      const line = textLines[lineIndex];
      textCursor -= COMMENT_TEXT_SIZE;
      if (textCursor < bottom) {
        break;
      }
      if (line.trim()) {
        page.drawText(line, {
          x: innerX,
          y: textCursor,
          size: COMMENT_TEXT_SIZE,
          font: fonts.regular,
          color: colorFromHex(TEXT),
        });
      }
      if (lineIndex < textLines.length - 1) {
        textCursor -= COMMENT_LINE_GAP;
      }
    }

    cursor = cardBottom - COMMENT_CARD_GAP;
    index += 1;
    drewAny = true;

    if (cursor <= bottom) break;
  }

  return index;
}

async function drawBody(
  context: DrawContext,
  headerBottomY: number,
  annotations: PageAnnotation[],
): Promise<number> {
  const { page, fonts } = context;
  const { width: pageWidth } = page.getSize();
  const top = headerBottomY - BODY_TOP_SPACING;
  const bottom = MARGIN;
  if (top <= bottom) return 0;

  const contentWidth = pageWidth - MARGIN * 2;
  const { left: leftWidth, right: rightWidth } = columns(contentWidth);
  const leftX = MARGIN;
  const rightX = leftX + leftWidth + CONTENT_GAP;

  let leftCursor = top;
  leftCursor -= TITLE_SIZE;
  page.drawText('Documento do aluno', {
    x: leftX,
    y: leftCursor,
    size: TITLE_SIZE,
    font: fonts.bold,
    color: colorFromHex(TEXT),
  });

  const previewTop = leftCursor - PREVIEW_GAP;
  await drawDocumentPreview(context, leftX, previewTop, bottom, leftWidth, annotations);

  let rightCursor = top;
  rightCursor -= COMMENT_TITLE_SIZE;
  page.drawText('Comentários', {
    x: rightX,
    y: rightCursor,
    size: COMMENT_TITLE_SIZE,
    font: fonts.bold,
    color: colorFromHex(TEXT),
  });
  rightCursor -= PREVIEW_GAP;
  return drawCommentsColumn(context, rightX, rightCursor, bottom, rightWidth, annotations, 0);
}

async function drawCommentsContinuation(
  context: DrawContext,
  headerBottomY: number,
  annotations: PageAnnotation[],
  startIndex: number,
): Promise<number> {
  const { page, fonts } = context;
  const { width: pageWidth } = page.getSize();
  const top = headerBottomY - BODY_TOP_SPACING;
  const bottom = MARGIN;
  if (top <= bottom) return startIndex;

  const contentWidth = pageWidth - MARGIN * 2;
  const { left: leftWidth, right: rightWidth } = columns(contentWidth);
  const rightX = MARGIN + leftWidth + CONTENT_GAP;

  let cursor = top;
  cursor -= COMMENT_TITLE_SIZE;
  page.drawText('Comentários (continuação)', {
    x: rightX,
    y: cursor,
    size: COMMENT_TITLE_SIZE,
    font: fonts.bold,
    color: colorFromHex(TEXT),
  });
  cursor -= PREVIEW_GAP;

  return drawCommentsColumn(context, rightX, cursor, bottom, rightWidth, annotations, startIndex);
}

async function drawHeader(context: DrawContext): Promise<number> {
  const { page } = context;
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const headerOriginY = pageHeight - MARGIN - HEADER_HEIGHT;

  const studentWidth =
    pageWidth - MARGIN * 2 - PROFESSOR_WIDTH - SCORE_WIDTH - HEADER_GAP * 2;

  drawProfessorBadge(context, MARGIN, headerOriginY);
  await drawStudentCard(context, MARGIN + PROFESSOR_WIDTH + HEADER_GAP, headerOriginY, studentWidth);
  drawScoreBox(context, pageWidth - MARGIN - SCORE_WIDTH, headerOriginY);

  return headerOriginY;
}

export async function generateCorrectedPdf(data: EssayPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fonts: FontPack = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const pageAnnotations = getPageAnnotations(data, 1);
  const page = pdfDoc.addPage([A4.w, A4.h]);
  const headerBottomY = await drawHeader({ page, data, pdfDoc, fonts });
  let consumed = await drawBody({ page, data, pdfDoc, fonts }, headerBottomY, pageAnnotations);

  if (data.model === 'ENEM') {
    renderEnemMirrorPage(pdfDoc, data, fonts);
  } else if (data.model === 'PAS/UnB') {
    renderPasMirrorPage(pdfDoc, data, fonts);
  }

  while (consumed < pageAnnotations.length) {
    const continuationPage = pdfDoc.addPage([A4.w, A4.h]);
    const continuationHeaderBottom = await drawHeader({
      page: continuationPage,
      data,
      pdfDoc,
      fonts,
    });
    const next = await drawCommentsContinuation(
      { page: continuationPage, data, pdfDoc, fonts },
      continuationHeaderBottom,
      pageAnnotations,
      consumed,
    );
    if (next <= consumed) {
      console.warn('[generateCorrectedPdf] Unable to paginate all comments.');
      break;
    }
    consumed = next;
  }

  return pdfDoc.save();
}
