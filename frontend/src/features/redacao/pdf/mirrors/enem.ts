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
  columnsActionsCenterComments,
  colorFromHex,
  ENEM_COLORS_HEX,
  toRoman,
} from '../theme';
import { buildJustificationFromReasonIds } from '@/features/enem/composerBridge';
import { getComposerForLevel } from '@/features/enem/composerBridge';

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
  color: string; // hex string
  gapAfter?: number;
  indent?: number;
  rich?: { text: string; font: 'regular' | 'bold'; color: string }[]; // optional rich segments for inline highlights
};

function splitWithSpaces(input: string) {
  const parts: string[] = [];
  let acc = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === ' ') {
      if (acc) parts.push(acc);
      parts.push(' ');
      acc = '';
    } else {
      acc += ch;
    }
  }
  if (acc) parts.push(acc);
  return parts;
}

function isUpperToken(token: string) {
  const letters = token.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase();
}

function isConnectorToken(token: string) {
  const t = token.trim();
  if (!t) return false;
  // remove pontuações simples e parênteses laterais, preservando caixa
  const norm = t.replace(/[.,;:!?)]$/, '').replace(/^[(]/, '');
  return norm === 'E' || norm === 'OU' || norm === 'E/OU';
}

function makeRichLine(line: string, strongHex: string, normalHex: string) {
  const segs = splitWithSpaces(line).map((tok) => {
    if (tok.trim().length === 0) return { text: tok, font: 'regular' as const, color: normalHex };
    if (isConnectorToken(tok)) return { text: tok, font: 'bold' as const, color: strongHex };
    if (isUpperToken(tok)) return { text: tok, font: 'bold' as const, color: strongHex };
    return { text: tok, font: 'regular' as const, color: normalHex };
  });
  return segs;
}

function drawActionsRail(
  page: PDFPage,
  x: number,
  yTop: number,
  width: number,
  height: number,
  fonts: { regular: PDFFont; bold: PDFFont }
) {
  if (height <= 24) return;
  const titleSize = BODY_SIZE;
  const labelSize = Math.max(8, BODY_SIZE - 2); // ainda mais compacto para caber no 20%
  let cursorY = yTop;

  // Título do rail
  page.drawText('AÇÕES', {
    x,
    y: cursorY - titleSize,
    size: titleSize,
    font: fonts.bold,
    color: colorFromHex(TEXT_SUBTLE),
  });
  cursorY -= (titleSize + 8);

  const pills = [
    'Voltar',
    'Abrir original',
    'Argumentação',
    'Ortografia/Gramática',
    'Coesão/Coerência',
    'Apresentação',
    'Comentários gerais',
    'Salvar',
    'Gerar PDF corrigido',
  ];

  const padX = 6;
  const padY = 4;
  const gapX = 6;
  const gapY = 6;

  let rowX = x;
  let rowY = cursorY;
  for (const text of pills) {
    const w = fonts.regular.widthOfTextAtSize(text, labelSize) + padX * 2;
    const h = labelSize + padY * 2;
    if (rowX + w > x + width) {
      // quebra de linha
      rowX = x;
      rowY -= (h + gapY);
      if (rowY - h < yTop - height) break; // sem espaço
    }
    // badge
    page.drawRectangle({
      x: rowX,
      y: rowY - h,
      width: w,
      height: h,
      color: colorFromHex(BG),
      borderColor: colorFromHex(GRAY),
      borderWidth: 1,
      borderOpacity: 0.6,
    });
    page.drawText(text, {
      x: rowX + padX,
      y: rowY - h + padY,
      size: labelSize,
      font: fonts.regular,
      color: colorFromHex(TEXT),
    });
    rowX += (w + gapX);
  }
}

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
  const cols3 = columnsActionsCenterComments(contentWidth);
  const actionsX = contentX;            // esquerda
  const actionsW = cols3.left;
  const centerX = contentX + actionsW + cols3.gap; // centro (espelho)
  const centerW = cols3.center;
  const rightX = centerX + centerW + cols3.gap;    // direita (comentários)
  const rightW = cols3.right;

  page.drawText('ESPELHO DE CORREÇÃO — ENEM', {
    x: centerX,
    y,
    size: TITLE_SIZE,
    font: fonts.bold,
    color: colorFromHex(TEXT),
  });
  y -= 18;
  page.drawText('Competências e justificativas da avaliação', {
    x: centerX,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: colorFromHex(TEXT_SUBTLE),
  });
  y -= 14;

  // Coluna direita: Comentários (continuação)
  if (renderCommentsRight) {
    const rightTop = y + 14;
    // Título da coluna de comentários
    page.drawText('COMENTÁRIOS', {
      x: rightX,
      y: rightTop - BODY_SIZE,
      size: BODY_SIZE,
      font: fonts.bold,
      color: colorFromHex(TEXT_SUBTLE),
    });
    const rightY = rightTop - BODY_SIZE - 6;
    const rightHeight = rightY - MARGIN;
    if (rightHeight > 24) {
      renderCommentsRight({ page, x: rightX, yTop: rightY, width: rightW, height: rightHeight, fonts });
    }
  }

  // Coluna esquerda: Ações (badges)
  const leftTop = y + 14;
  const leftHeight = leftTop - MARGIN;
  drawActionsRail(page, actionsX, leftTop, actionsW, leftHeight, fonts);

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

    const key = (`C${index + 1}`) as 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
    const colors = ENEM_COLORS_HEX[key];

    const storedJustification = (() => {
      const source = data.enem?.justifications as unknown;
      if (!source) return undefined;
      if (Array.isArray(source)) {
        const raw = source[index];
        return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
      }
      if (typeof source === 'object' && source !== null) {
        const record = source as Record<string, unknown>;
        const raw = record[key];
        return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
      }
      return undefined;
    })();
    const composedJustification = buildJustificationFromReasonIds(key, level, reasons);
    const justificationText =
      typeof storedJustification === 'string' && storedJustification.trim().length > 0
        ? storedJustification.trim()
        : composedJustification ?? undefined;

    const layout = buildCompetencyLayout(
      centerW,
      index,
      competencyTitles[index] ?? '',
      level,
      points,
      justificationText,
      reasons,
      fonts,
      colors
    );

    if (y - layout.cardHeight < MARGIN + BODY_SIZE * 4) {
      page = doc.addPage([A4.w, A4.h]);
      y = await renderHeroHeader({ pdfDoc: doc, page, fonts, contentBox, data });
      page.drawText('ESPELHO DE CORREÇÃO — ENEM (continuação)', {
        x: centerX,
        y,
        size: TITLE_SIZE,
        font: fonts.bold,
        color: colorFromHex(TEXT),
      });
      y -= 18;
      page.drawText('Competências e justificativas da avaliação', {
        x: centerX,
        y,
        size: BODY_SIZE,
        font: fonts.regular,
        color: colorFromHex(TEXT_SUBTLE),
      });
      y -= 14;

      if (renderCommentsRight) {
        const rightTop = y + 14;
        page.drawText('COMENTÁRIOS', {
          x: rightX,
          y: rightTop - BODY_SIZE,
          size: BODY_SIZE,
          font: fonts.bold,
          color: colorFromHex(TEXT_SUBTLE),
        });
        const rightY = rightTop - BODY_SIZE - 6;
        const rightHeight = rightY - MARGIN;
        if (rightHeight > 24) {
          renderCommentsRight({ page, x: rightX, yTop: rightY, width: rightW, height: rightHeight, fonts });
        }
      }
      const leftTop2 = y + 14;
      const leftHeight2 = leftTop2 - MARGIN;
      drawActionsRail(page, actionsX, leftTop2, actionsW, leftHeight2, fonts);
    }

    y = drawCompetencyCard(page, centerX, y, centerW, layout, fonts, colors);

    if (index < 4) {
      y -= CONTENT_GAP;
    }
  }

  const levelsSafe = Array.isArray(data.enem.levels) ? data.enem.levels : [0, 0, 0, 0, 0];
  const total = levelsSafe.reduce(
    (sum, level) => sum + (POINTS_PER_LEVEL[clampLevel(level)] ?? 0),
    0
  );
  const finalLineHeight = TITLE_SIZE + 6;
  if (y - finalLineHeight < MARGIN) {
    page = doc.addPage([A4.w, A4.h]);
    y = await renderHeroHeader({ pdfDoc: doc, page, fonts, contentBox, data });
    page.drawText('ESPELHO DE CORREÇÃO — ENEM (continuação)', {
      x: centerX,
      y,
      size: TITLE_SIZE,
      font: fonts.bold,
      color: colorFromHex(TEXT),
    });
    y -= 18;
    page.drawText('Competências e justificativas da avaliação', {
      x: centerX,
      y,
      size: BODY_SIZE,
      font: fonts.regular,
      color: colorFromHex(TEXT_SUBTLE),
    });
    y -= 14;

    if (renderCommentsRight) {
      const rightTop = y + 14;
      page.drawText('COMENTÁRIOS', {
        x: rightX,
        y: rightTop - BODY_SIZE,
        size: BODY_SIZE,
        font: fonts.bold,
        color: colorFromHex(TEXT_SUBTLE),
      });
      const rightY = rightTop - BODY_SIZE - 6;
      const rightHeight = rightY - MARGIN;
      if (rightHeight > 24) {
        renderCommentsRight({ page, x: rightX, yTop: rightY, width: rightW, height: rightHeight, fonts });
      }
    }
    const leftTop2 = y + 14;
    const leftHeight2 = leftTop2 - MARGIN;
    drawActionsRail(page, actionsX, leftTop2, actionsW, leftHeight2, fonts);
  }
  drawBold(page, `NOTA FINAL: ${total} / 1000`, centerX, y, TITLE_SIZE, fonts.bold);
}

function buildCompetencyLayout(
  width: number,
  index: number,
  title: string,
  level: number,
  points: number,
  justification: string | undefined,
  reasons: string[],
  fonts: { regular: PDFFont; bold: PDFFont },
  colors: { strong: string; title: string; pastel: string }
) {
  const textWidth = width - CARD_PADDING * 2;
  const operations: Operation[] = [];

  const roman = toRoman(index + 1);
  operations.push({
    text: `Competência ${roman} — ${title}`,
    font: 'bold',
    size: TITLE_SIZE,
    color: colors.title,
    gapAfter: LINE_GAP,
  });

  operations.push({
    text: '',
    font: 'regular',
    size: BODY_SIZE,
    color: TEXT,
    gapAfter: LINE_GAP,
    rich: [
      { text: 'Nível: ', font: 'regular', color: colors.title },
      { text: String(level), font: 'bold', color: colors.strong },
      { text: ' · Pontuação: ', font: 'regular', color: colors.title },
      { text: String(points), font: 'bold', color: colors.strong },
      { text: ' pts', font: 'regular', color: colors.title },
    ],
  });

  const trimmedJustification = justification?.trim();

  if (trimmedJustification) {
    operations.push({
      text: 'Justificativa selecionada:',
      font: 'regular',
      size: BODY_SIZE,
      color: colors.title,
      gapAfter: LINE_GAP,
    });

    let wrapped = wrapText(fonts.regular, trimmedJustification, BODY_SIZE, textWidth - BULLET_INDENT);
    if (wrapped.length > 2) {
      wrapped = wrapped.slice(0, 2);
      const lastIndex = wrapped.length - 1;
      wrapped[lastIndex] = `${wrapped[lastIndex]}…`;
    }
    const richLines = wrapped.length ? wrapped : [''];
    const startIdx = operations.length;
    richLines.forEach((line, idx) => {
      const text = idx === 0 ? `• ${line}` : line;
      const rich = makeRichLine(text, colors.strong, TEXT);
      operations.push({
        text,
        font: 'regular',
        size: BODY_SIZE,
        color: TEXT,
        indent: idx === 0 ? 0 : BULLET_INDENT,
        gapAfter: LINE_GAP,
        rich,
      });
    });
    if (operations.length > 0) {
      operations[operations.length - 1].gapAfter = 0;
    }

    const contentHeight = operations.reduce((sum, op) => sum + op.size + (op.gapAfter ?? 0), 0);
    const cardHeight = CARD_PADDING * 2 + contentHeight;

    return {
      operations,
      cardHeight,
      reasonStartIdx: startIdx,
      reasonCount: richLines.length,
    };
  }

  if (reasons.length > 0) {
    operations.push({
      text: 'Justificativas selecionadas:',
      font: 'regular',
      size: BODY_SIZE,
      color: colors.title,
      gapAfter: LINE_GAP,
    });

    let reasonStartIdx: number | null = null;
    let reasonCount = 0;

    reasons.forEach((reason, reasonIndex) => {
      const cleaned = reason.trim();
      const wrapped = wrapText(fonts.regular, cleaned, BODY_SIZE, textWidth - BULLET_INDENT);
      if (wrapped.length === 0) {
        wrapped.push('');
      }
      wrapped.forEach((line, lineIndex) => {
        const isFirstLine = lineIndex === 0;
        const lineText = isFirstLine ? `• ${line}` : line;
        const rich = makeRichLine(lineText, colors.strong, TEXT);
        if (reasonStartIdx === null) reasonStartIdx = operations.length;
        operations.push({
          text: lineText,
          font: 'regular',
          size: BODY_SIZE,
          color: TEXT,
          indent: isFirstLine ? 0 : BULLET_INDENT,
          gapAfter: LINE_GAP,
          rich,
        });
        reasonCount += 1;
      });
    });

    if (operations.length > 0) {
      operations[operations.length - 1].gapAfter = 0;
    }

    const contentHeight = operations.reduce((sum, op) => sum + op.size + (op.gapAfter ?? 0), 0);
    const cardHeight = CARD_PADDING * 2 + contentHeight;

    return { operations, cardHeight, reasonStartIdx, reasonCount };
  } else {
    operations.push({
      text: 'Sem justificativas selecionadas.',
      font: 'regular',
      size: BODY_SIZE,
      color: TEXT_SUBTLE,
      gapAfter: LINE_GAP,
    });
    if (operations.length > 0) {
      operations[operations.length - 1].gapAfter = 0;
    }
    const contentHeight = operations.reduce((sum, op) => sum + op.size + (op.gapAfter ?? 0), 0);
    const cardHeight = CARD_PADDING * 2 + contentHeight;
    return { operations, cardHeight, reasonStartIdx: null, reasonCount: 0 };
  }
}

function drawCompetencyCard(
  page: PDFPage,
  x: number,
  yTop: number,
  width: number,
  layout: { operations: Operation[]; cardHeight: number; reasonStartIdx: number | null; reasonCount: number },
  fonts: { regular: PDFFont; bold: PDFFont },
  colors?: { strong: string; title: string; pastel: string }
) {
  const { operations, cardHeight } = layout;
  const cardBottom = yTop - cardHeight;

  page.drawRectangle({
    x,
    y: cardBottom,
    width,
    height: cardHeight,
    color: colorFromHex(BG),
    borderColor: colorFromHex(colors?.title ?? GRAY),
    borderWidth: 1,
    borderOpacity: 0.6,
  });

  // Filete vertical à esquerda na cor forte da competência
  page.drawRectangle({
    x,
    y: cardBottom,
    width: 2,
    height: cardHeight,
    color: colorFromHex(colors?.strong ?? GRAY),
    borderWidth: 0,
  });

  // First pass: compute baseline for each op
  const baselines: number[] = [];
  let cursor = yTop - CARD_PADDING;
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    cursor -= op.size;
    baselines[i] = cursor;
    if (op.gapAfter) cursor -= op.gapAfter;
  }

  // Draw pastel background behind reasons block, if any
  if (
    colors && layout.reasonStartIdx !== null && layout.reasonCount > 0 &&
    layout.reasonStartIdx >= 0 && layout.reasonStartIdx < operations.length
  ) {
    const start = layout.reasonStartIdx;
    const end = start + layout.reasonCount - 1;
    const topY = baselines[start] + operations[start].size + 2;
    const bottomY = baselines[end] - 2;
    const rectHeight = Math.max(0, topY - bottomY);
    if (rectHeight > 0) {
      page.drawRectangle({
        x: x + CARD_PADDING,
        y: bottomY,
        width: width - CARD_PADDING * 2,
        height: rectHeight,
        color: colorFromHex(colors.pastel),
        borderColor: colorFromHex(colors.pastel),
        borderWidth: 0,
      });
    }
  }

  // Second pass: draw text (supporting rich segments)
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const baseY = baselines[i];
    let penX = x + CARD_PADDING + (op.indent ?? 0);
    if (op.rich && op.rich.length > 0) {
      for (const seg of op.rich) {
        page.drawText(seg.text, {
          x: penX,
          y: baseY,
          size: op.size,
          font: seg.font === 'bold' ? fonts.bold : fonts.regular,
          color: colorFromHex(seg.color),
        });
        const w = (seg.font === 'bold' ? fonts.bold : fonts.regular).widthOfTextAtSize(seg.text, op.size);
        penX += w;
      }
    } else {
      page.drawText(op.text, {
        x: penX,
        y: baseY,
        size: op.size,
        font: op.font === 'bold' ? fonts.bold : fonts.regular,
        color: colorFromHex(op.color),
      });
    }
  }

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
