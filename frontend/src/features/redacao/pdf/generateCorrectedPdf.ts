import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import type { PDFFont, PDFPage, RGB } from 'pdf-lib';
import {
  A4,
  BG,
  CATEGORY,
  GRAY,
  MARGIN,
  TEXT,
  TEXT_SUBTLE,
  CONTENT_GAP,
  PREVIEW_PADDING,
  TITLE_SIZE,
  BODY_SIZE,
  HERO,
  BRAND,
  AVATAR,
  SCORE,
  BRAND_COLORS,
  PDF_FONT,
  columns,
  columns8020,
} from './theme';
import { renderEnemMirrorPage } from './mirrors/enem';
import { renderPasMirrorPage } from './mirrors/pas';
import type { AnnotationKind, EssayPdfData } from './types';

const PREVIEW_GAP = 8;
const COMMENT_TITLE_SIZE = TITLE_SIZE;
const COMMENT_NUMBER_SIZE = 9;
const COMMENT_CATEGORY_SIZE = PDF_FONT.XS;
const COMMENT_TEXT_SIZE = PDF_FONT.SM;
const COMMENT_LINE_GAP = 3;
const COMMENT_CARD_GAP = 6;
const COMMENT_CARD_PADDING = 10;
const COMMENT_BAND_HEIGHT = 14;
const COMMENT_BAND_TEXT_GAP = 4;
const COMMENT_TITLE_TEXT_GAP = 4;
const HIGHLIGHT_FILL_OPACITY = 0.28;
const HIGHLIGHT_BORDER_OPACITY = 0.8;
const HIGHLIGHT_LABEL_SIZE = 20;
const HIGHLIGHT_LABEL_FONT_SIZE = 10;

type PageAnnotation = EssayPdfData['annotations'][number];

let brandMarkCache: ArrayBuffer | null | undefined;

async function getBrandMarkBytes() {
  if (brandMarkCache !== undefined) return brandMarkCache;
  brandMarkCache = await loadPublicPng('/pdf/brand-mark.png');
  return brandMarkCache;
}

type HeroHeaderArgs = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  fonts: FontPack;
  contentBox: { x: number; w: number };
  data: EssayPdfData;
};

type CommentsRenderer = (
  page: PDFPage,
  top: number,
  bottom: number,
  x: number,
  width: number,
  startIndex: number,
) => number;

async function renderHeroHeader({
  pdfDoc,
  page,
  fonts,
  contentBox,
  data,
}: HeroHeaderArgs): Promise<number> {
  const card = {
    x: contentBox.x,
    y: page.getHeight() - MARGIN - HERO.HEIGHT,
    w: contentBox.w,
    h: HERO.HEIGHT,
  };

  drawRoundedRect(page, {
    x: card.x,
    y: card.y,
    width: card.w,
    height: card.h,
    radius: HERO.RADIUS,
    color: BRAND_COLORS.ORANGE,
  });

  const brandX = card.x + HERO.PAD_X;
  const brandY = card.y + (card.h - BRAND.ICON) / 2;
  const brandBytes = await getBrandMarkBytes();
  if (brandBytes) {
    try {
      const brandImage = await pdfDoc.embedPng(brandBytes);
      drawRoundedRect(page, {
        x: brandX,
        y: brandY,
        width: BRAND.ICON,
        height: BRAND.ICON,
        radius: BRAND.ICON / 2,
        color: rgb(1, 1, 1),
      });
      page.drawImage(brandImage, {
        x: brandX + 5,
        y: brandY + 5,
        width: BRAND.ICON - 10,
        height: BRAND.ICON - 10,
      });
    } catch (err) {
      console.warn('[renderHeroHeader] Failed to embed brand icon', err);
    }
  }

  page.drawText('Professor Yago Sales', {
    x: brandX,
    y: card.y + 6,
    size: PDF_FONT.SM,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });

  const midX = brandX + BRAND.ICON + HERO.GAP;
  const scoreBlockX = card.x + card.w - SCORE.W - HERO.PAD_X;
  const centralWidth = Math.max(0, scoreBlockX - HERO.GAP - midX);

  if (centralWidth > 0) {
    drawRoundedRect(page, {
      x: midX,
      y: card.y + 10,
      width: centralWidth,
      height: card.h - 20,
      radius: 10,
      borderColor: BRAND_COLORS.ORANGE_DARK,
      borderWidth: 0,
    });
  }

  const studentName = ellipsize(data.student?.name ?? 'Aluno', 32);
  const classLabel = ellipsize(data.student?.classLabel ?? data.klass?.label ?? '', 40);
  const bimesterLabel =
    data.student?.bimesterLabel ??
    (data.student?.bimester != null && data.student?.bimester !== ''
      ? `${data.student.bimester}º bimestre`
      : '');
  const themeLabel = ellipsize(data.theme ?? 'Tema não informado', 40);

  const nameY = card.y + card.h - HERO.PAD_Y - PDF_FONT.LG;
  page.drawText(studentName, {
    x: midX + 12,
    y: nameY,
    size: PDF_FONT.LG,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });

  page.drawText(classLabel, {
    x: midX + 12,
    y: nameY - (PDF_FONT.MD + 4),
    size: PDF_FONT.SM,
    font: fonts.regular,
    color: rgb(1, 1, 1),
  });

  if (bimesterLabel) {
    page.drawText(bimesterLabel, {
      x: midX + 12,
      y: nameY - (PDF_FONT.MD + 4) - (PDF_FONT.SM + 4),
      size: PDF_FONT.SM,
      font: fonts.regular,
      color: rgb(1, 1, 1),
    });
  }

  page.drawText(`Tema: ${themeLabel}`, {
    x: midX + 12,
    y: card.y + HERO.PAD_Y,
    size: PDF_FONT.SM,
    font: fonts.regular,
    color: rgb(1, 1, 1),
  });

  const avatarDataUri = data.student?.avatarDataUri;
  if (avatarDataUri && centralWidth > AVATAR.SIZE + 24) {
    const avatarBytes = dataUriToBytes(avatarDataUri);
    if (avatarBytes) {
      try {
        const avatarImage = await pdfDoc.embedPng(avatarBytes);
        const avatarX = Math.min(midX + centralWidth - AVATAR.SIZE - 12, midX + 220);
        const avatarY = card.y + (card.h - AVATAR.SIZE) / 2;
        drawRoundedRect(page, {
          x: avatarX,
          y: avatarY,
          width: AVATAR.SIZE,
          height: AVATAR.SIZE,
          radius: AVATAR.SIZE / 2,
          color: rgb(1, 1, 1),
        });
        page.drawImage(avatarImage, {
          x: avatarX + 2,
          y: avatarY + 2,
          width: AVATAR.SIZE - 4,
          height: AVATAR.SIZE - 4,
        });
      } catch (err) {
        console.warn('[renderHeroHeader] Failed to embed avatar image', err);
      }
    }
  }

  const scoreX = scoreBlockX;
  const scoreY = card.y + (card.h - SCORE.H) / 2;
  drawRoundedRect(page, {
    x: scoreX,
    y: scoreY,
    width: SCORE.W,
    height: SCORE.H,
    radius: SCORE.R,
    color: BRAND_COLORS.CHIP_BG,
    borderColor: BRAND_COLORS.CHIP_BORDER,
    borderWidth: 1,
  });

  const labelY = scoreY + SCORE.H - SCORE.PAD - PDF_FONT.SM;
  page.drawText('Nota final', {
    x: scoreX + SCORE.PAD,
    y: labelY,
    size: PDF_FONT.SM,
    font: fonts.regular,
    color: colorFromHex(TEXT_SUBTLE),
  });

  const scoreStr =
    data.score?.finalFormatted?.trim() ||
    data.finalScore?.trim() ||
    '--';
  const scoreSize = PDF_FONT.LG + 6;
  page.drawText(scoreStr, {
    x: scoreX + SCORE.PAD,
    y: scoreY + SCORE.PAD + 6,
    size: scoreSize,
    font: fonts.bold,
    color: colorFromHex(TEXT),
  });

  const modelLabel = (data.model || '').toString().toUpperCase() || '-';
  const modelWidth = fonts.bold.widthOfTextAtSize(modelLabel, PDF_FONT.SM);
  page.drawText(modelLabel, {
    x: scoreX + SCORE.W - SCORE.PAD - modelWidth,
    y: scoreY + SCORE.PAD + 6,
    size: PDF_FONT.SM,
    font: fonts.bold,
    color: colorFromHex(TEXT_SUBTLE),
  });

  return card.y - CONTENT_GAP;
}

type FontPack = {
  regular: PDFFont;
  bold: PDFFont;
};

async function loadPublicPng(path: string) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function drawRoundedRect(
  page: PDFPage,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    color?: RGB;
    borderColor?: RGB;
    borderWidth?: number;
  }
) {
  const { x, y, width, height, radius, color, borderColor, borderWidth = 0 } = opts;
  const options: Record<string, unknown> = {
    x,
    y,
    width,
    height,
    borderRadius: radius,
  };
  if (color) options.color = color;
  if (borderColor) options.borderColor = borderColor;
  if (borderWidth) options.borderWidth = borderWidth;
  page.drawRectangle(options as any);
}

function ellipsize(text: string, max: number) {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

function dataUriToBytes(uri: string) {
  if (typeof uri !== 'string') return null;
  const match = uri.match(/^data:(?:[^;]+);base64,(.+)$/);
  if (!match) return null;
  const base64 = match[1];
  try {
    if (typeof globalThis.atob === 'function') {
      const binary = globalThis.atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  } catch {
    return null;
  }
}

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
    borderColor: colorFromHex('#E2E8F0'),
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
  let index = startIndex;
  let drewAny = false;

  while (index < annotations.length) {
    const annotation = annotations[index];
    const numberLabel = `#${index + 1}`;
    const kind = annotation.kind;
    const categoryLabel = getAnnotationLabel(kind).toUpperCase();
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
      COMMENT_CATEGORY_SIZE +
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
      cardTop - COMMENT_BAND_HEIGHT + (COMMENT_BAND_HEIGHT - COMMENT_NUMBER_SIZE) / 2;
    page.drawText(numberLabel, {
      x: originX + COMMENT_CARD_PADDING,
      y: numberBaseline,
      size: COMMENT_NUMBER_SIZE,
      font: fonts.bold,
      color: colorFromHex(TEXT),
    });

    const innerX = originX + COMMENT_CARD_PADDING;
    let textCursor = cardTop - COMMENT_BAND_HEIGHT - COMMENT_BAND_TEXT_GAP;

    textCursor -= COMMENT_CATEGORY_SIZE;
    page.drawText(categoryLabel, {
      x: innerX,
      y: textCursor,
      size: COMMENT_CATEGORY_SIZE,
      font: fonts.bold,
      color: colorFromHex(TEXT_SUBTLE),
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
  contentTop: number,
  annotations: PageAnnotation[],
  startIndex: number,
): Promise<number> {
  const { page, fonts } = context;
  const { width: pageWidth } = page.getSize();
  const top = contentTop;
  const bottom = MARGIN;
  if (top <= bottom) return 0;

  const contentWidth = pageWidth - MARGIN * 2;
  const { left: leftWidth, right: rightWidth, gap } = columns8020(contentWidth);
  const leftX = MARGIN;
  const rightX = leftX + leftWidth + gap;

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
  const previewHeight = Math.min(leftWidth / Math.SQRT2, previewTop - bottom);
  const previewBottom = Math.max(bottom, previewTop - previewHeight);
  await drawDocumentPreview(context, leftX, previewTop, previewBottom, leftWidth, annotations);

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
  return drawCommentsColumn(context, rightX, rightCursor, bottom, rightWidth, annotations, startIndex);
}

async function drawCommentsContinuation(
  context: DrawContext,
  contentTop: number,
  annotations: PageAnnotation[],
  startIndex: number,
): Promise<number> {
  const { page, fonts } = context;
  const { width: pageWidth } = page.getSize();
  const top = contentTop;
  const bottom = MARGIN;
  if (top <= bottom) return startIndex;

  const contentWidth = pageWidth - MARGIN * 2;
  const { left: leftWidth, right: rightWidth, gap } = columns8020(contentWidth);
  const rightX = MARGIN + leftWidth + gap;

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

export async function generateCorrectedPdf(data: EssayPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fonts: FontPack = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const pageAnnotations = getPageAnnotations(data, 1);
  const page = pdfDoc.addPage([A4.w, A4.h]);
  const contentBox = { x: MARGIN, w: A4.w - MARGIN * 2 };
  const contentTop = await renderHeroHeader({
    pdfDoc,
    page,
    fonts,
    contentBox,
    data,
  });

  const commentsRenderer: CommentsRenderer = (targetPage, top, bottom, x, width, startIndex) =>
    drawCommentsColumn(
      { page: targetPage, data, pdfDoc, fonts },
      x,
      top,
      bottom,
      width,
      pageAnnotations,
      startIndex,
    );

  let consumed = await drawBody({ page, data, pdfDoc, fonts }, contentTop, pageAnnotations, 0);

  if (data.model === 'ENEM') {
    consumed = await renderEnemMirrorPage(
      pdfDoc,
      data,
      fonts,
      renderHeroHeader,
      commentsRenderer,
      consumed,
    );
  } else if (data.model === 'PAS/UnB') {
    consumed = await renderPasMirrorPage(
      pdfDoc,
      data,
      fonts,
      renderHeroHeader,
      commentsRenderer,
      consumed,
    );
  }

  while (consumed < pageAnnotations.length) {
    const continuationPage = pdfDoc.addPage([A4.w, A4.h]);
    const continuationTop = await renderHeroHeader({
      pdfDoc,
      page: continuationPage,
      fonts,
      contentBox,
      data,
    });
    const next = await drawCommentsContinuation(
      { page: continuationPage, data, pdfDoc, fonts },
      continuationTop,
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
