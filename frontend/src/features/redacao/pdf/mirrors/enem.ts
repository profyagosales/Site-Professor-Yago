import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import {
  A4,
  MARGIN,
  CONTENT_GAP,
  TITLE_SIZE,
  BODY_SIZE,
  TEXT,
  TEXT_SUBTLE,
  BG,
  GRAY,
  columns8020,
} from '../theme';
import type { EssayPdfData } from '../types';

type HeroRenderer = (args: {
  pdfDoc: PDFDocument;
  page: PDFPage;
  fonts: { regular: PDFFont; bold: PDFFont };
  contentBox: { x: number; w: number };
  data: EssayPdfData;
}) => Promise<number>;

type CommentsRenderer = (args: {
  page: PDFPage;
  x: number;
  yTop: number;
  width: number;
  height: number;
  fonts: { regular: PDFFont; bold: PDFFont };
}) => void;

const POINTS_PER_LEVEL = [0, 40, 80, 120, 160, 200];
const CARD_PADDING = 12;
const LINE_GAP = 4;
const BULLET_INDENT = 12;

type Operation = {
  text: string;
  font: 'regular' | 'bold';
  size: number;
  color: string;
  gapAfter?: number;
  indent?: number;
};

export async function renderEnemMirrorPage(
  doc: PDFDocument,
  data: EssayPdfData,
  fonts: { regular: PDFFont; bold: PDFFont },
  renderHeroHeader: HeroRenderer,
  renderCommentsRight?: CommentsRenderer
) {
  if (!data.enem) return;

  const contentBox = { x: MARGIN, w: A4.w - MARGIN * 2 };
  let page = doc.addPage([A4.w, A4.h]);
  let y = await renderHeroHeader({ pdfDoc: doc, page, fonts, contentBox, data });
  const contentX = contentBox.x;
  const contentWidth = contentBox.w;
  const cols = columns8020(contentWidth);
  const leftX = contentX;
  const leftW = cols.left;
  // Right column (reserved for Comentários - continuação)
  const rightX = contentX + cols.left + cols.gap;
  const rightW = cols.right;

  page.drawText('ESPELHO DE CORREÇÃO — ENEM', {
    x: leftX,
    y,
    size: TITLE_SIZE,
    font: fonts.bold,
    color: colorFromHex(TEXT),
  });
  y -= 18;
  page.drawText('Competências e justificativas da avaliação', {
    x: leftX,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: colorFromHex(TEXT_SUBTLE),
  });
  y -= 14;

  // Preenche a coluna direita com Comentários (continuação), se fornecido
  if (renderCommentsRight) {
    const rightTop = y;
    const rightHeight = rightTop - MARGIN;
    if (rightHeight > 24) {
      renderCommentsRight({
        page,
        x: rightX,
        yTop: rightTop,
        width: rightW,
        height: rightHeight,
        fonts,
      });
    }
  }

  const competencyTitles = [
    'Domínio da norma padrão da língua portuguesa',
    'Compreensão da proposta de redação e aplicação de conceitos de outras áreas',
    'Organização e defesa de argumentos',
    'Conhecimento dos mecanismos linguísticos para a argumentação (coesão)',
    'Elaboração de proposta de intervenção social para o problema abordado',
  ];

  for (let index = 0; index < 5; index += 1) {
    const level = clampLevel(data.enem.levels?.[index] ?? 0);
    const points = POINTS_PER_LEVEL[level] ?? 0;
    const reasons = Array.isArray(data.enem.reasons?.[index])
      ? data.enem.reasons![index]!.filter((item) => typeof item === 'string' && item.trim().length > 0)
      : [];

    const layout = buildCompetencyLayout(
      leftW,
      index,
      competencyTitles[index] ?? '',
      level,
      points,
      reasons,
      fonts
    );

    if (y - layout.cardHeight < MARGIN + BODY_SIZE * 4) {
      page = doc.addPage([A4.w, A4.h]);
      y = await renderHeroHeader({ pdfDoc: doc, page, fonts, contentBox, data });
      page.drawText('ESPELHO DE CORREÇÃO — ENEM (continuação)', {
        x: leftX,
        y,
        size: TITLE_SIZE,
        font: fonts.bold,
        color: colorFromHex(TEXT),
      });
      y -= 18;
      page.drawText('Competências e justificativas da avaliação', {
        x: leftX,
        y,
        size: BODY_SIZE,
        font: fonts.regular,
        color: colorFromHex(TEXT_SUBTLE),
      });
      y -= 14;

      if (renderCommentsRight) {
        const rightTop = y;
        const rightHeight = rightTop - MARGIN;
        if (rightHeight > 24) {
          renderCommentsRight({
            page,
            x: rightX,
            yTop: rightTop,
            width: rightW,
            height: rightHeight,
            fonts,
          });
        }
      }
    }

    y = drawCompetencyCard(page, leftX, y, leftW, layout, fonts);

    if (index < 4) {
      y -= CONTENT_GAP;
    }
  }

  const total = data.enem.levels.reduce(
    (sum, level) => sum + (POINTS_PER_LEVEL[clampLevel(level)] ?? 0),
    0
  );
  const finalLineHeight = TITLE_SIZE + 6;
  if (y - finalLineHeight < MARGIN) {
    page = doc.addPage([A4.w, A4.h]);
    y = await renderHeroHeader({ pdfDoc: doc, page, fonts, contentBox, data });
    page.drawText('ESPELHO DE CORREÇÃO — ENEM (continuação)', {
      x: leftX,
      y,
      size: TITLE_SIZE,
      font: fonts.bold,
      color: colorFromHex(TEXT),
    });
    y -= 18;
    page.drawText('Competências e justificativas da avaliação', {
      x: leftX,
      y,
      size: BODY_SIZE,
      font: fonts.regular,
      color: colorFromHex(TEXT_SUBTLE),
    });
    y -= 14;

    if (renderCommentsRight) {
      const rightTop = y;
      const rightHeight = rightTop - MARGIN;
      if (rightHeight > 24) {
        renderCommentsRight({
          page,
          x: rightX,
          yTop: rightTop,
          width: rightW,
          height: rightHeight,
          fonts,
        });
      }
    }
  }
  drawBold(page, `NOTA FINAL: ${total} / 1000`, leftX, y, TITLE_SIZE, fonts.bold);
}

function buildCompetencyLayout(
  width: number,
  index: number,
  title: string,
  level: number,
  points: number,
  reasons: string[],
  fonts: { regular: PDFFont; bold: PDFFont }
) {
  const textWidth = width - CARD_PADDING * 2;
  const operations: Operation[] = [];

  operations.push({
    text: `C${index + 1} — ${title}`,
    font: 'bold',
    size: TITLE_SIZE,
    color: TEXT,
    gapAfter: LINE_GAP,
  });

  operations.push({
    text: `Nível: ${level} · Pontuação: ${points} pts`,
    font: 'regular',
    size: BODY_SIZE,
    color: TEXT,
    gapAfter: LINE_GAP,
  });

  if (reasons.length > 0) {
    operations.push({
      text: 'Justificativas selecionadas:',
      font: 'regular',
      size: BODY_SIZE,
      color: TEXT_SUBTLE,
      gapAfter: LINE_GAP,
    });

    reasons.forEach((reason, reasonIndex) => {
      const cleaned = reason.trim();
      const wrapped = wrapText(fonts.regular, cleaned, BODY_SIZE, textWidth - BULLET_INDENT);
      if (wrapped.length === 0) {
        wrapped.push('');
      }
      wrapped.forEach((line, lineIndex) => {
        const isFirstLine = lineIndex === 0;
        operations.push({
          text: isFirstLine ? `• ${line}` : line,
          font: 'regular',
          size: BODY_SIZE,
          color: TEXT,
          indent: isFirstLine ? 0 : BULLET_INDENT,
          gapAfter:
            reasonIndex === reasons.length - 1 && lineIndex === wrapped.length - 1 ? LINE_GAP : LINE_GAP,
        });
      });
    });
  } else {
    operations.push({
      text: 'Sem justificativas selecionadas.',
      font: 'regular',
      size: BODY_SIZE,
      color: TEXT_SUBTLE,
      gapAfter: LINE_GAP,
    });
  }

  if (operations.length > 0) {
    operations[operations.length - 1].gapAfter = 0;
  }

  const contentHeight = operations.reduce((sum, op) => sum + op.size + (op.gapAfter ?? 0), 0);
  const cardHeight = CARD_PADDING * 2 + contentHeight;

  return { operations, cardHeight };
}

function drawCompetencyCard(
  page: PDFPage,
  x: number,
  yTop: number,
  width: number,
  layout: { operations: Operation[]; cardHeight: number },
  fonts: { regular: PDFFont; bold: PDFFont }
) {
  const { operations, cardHeight } = layout;
  const cardBottom = yTop - cardHeight;

  page.drawRectangle({
    x,
    y: cardBottom,
    width,
    height: cardHeight,
    color: colorFromHex(BG),
    borderColor: colorFromHex(GRAY),
    borderWidth: 1,
  });

  let cursor = yTop - CARD_PADDING;
  operations.forEach((op) => {
    cursor -= op.size;
    page.drawText(op.text, {
      x: x + CARD_PADDING + (op.indent ?? 0),
      y: cursor,
      size: op.size,
      font: op.font === 'bold' ? fonts.bold : fonts.regular,
      color: colorFromHex(op.color),
    });
    if (op.gapAfter) cursor -= op.gapAfter;
  });

  return cardBottom;
}

function drawBold(page: PDFPage, text: string, x: number, y: number, size: number, font: PDFFont) {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: colorFromHex(TEXT),
  });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color: string = TEXT
) {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: colorFromHex(color),
  });
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const sanitized = (text ?? '').trim();
  if (!sanitized) return [];
  const words = sanitized.split(/\s+/);
  const lines: string[] = [];
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
  return lines;
}

function clampLevel(level: number) {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(Math.round(level), 5));
}

function colorFromHex(hex: string) {
  const sanitized = hex.replace('#', '').trim();
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((char) => char + char)
          .join('')
      : sanitized.padEnd(6, '0');
  const int = parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return rgb(r / 255, g / 255, b / 255);
}
