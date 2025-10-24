import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import {
  A4,
  MARGIN,
  CONTENT_GAP,
  TITLE_SIZE,
  BODY_SIZE,
  TEXT,
  TEXT_SUBTLE,
  GRAY,
  BG,
  columns8020,
} from '../theme';
import type { EssayPdfData } from '../types';

type Fonts = { regular: PDFFont; bold: PDFFont };

type HeroRenderer = (args: {
  pdfDoc: PDFDocument;
  page: PDFPage;
  fonts: Fonts;
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

const MACRO_ROWS: Array<{ key: keyof EssayPdfData['pas']; label: string; range: string }> = [
  { key: 'apresentacao', label: 'Apresentação (legibilidade, margens, paragrafação)', range: '0,00 – 0,50' },
  { key: 'conteudo', label: 'Consistência da argumentação / Conteúdo', range: '0,00 – 5,00' },
  { key: 'generoTextual', label: 'Adequação ao gênero / tipo textual', range: '0,00 – 2,00' },
  { key: 'coesaoCoerencia', label: 'Coesão e coerência', range: '0,00 – 3,00' },
];

const MICRO_ROWS: Array<{ key: keyof EssayPdfData['pas']['erros']; label: string }> = [
  { key: 'grafiaAcentuacao', label: 'Grafia / Acentuação' },
  { key: 'pontuacaoMorfossintaxe', label: 'Pontuação / Morfossintaxe' },
  { key: 'propriedadeVocabular', label: 'Propriedade vocabular' },
];

export async function renderPasMirrorPage(
  doc: PDFDocument,
  data: EssayPdfData,
  fonts: Fonts,
  renderHeroHeader: HeroRenderer,
  renderCommentsRight?: CommentsRenderer
) {
  if (!data.pas) return;

  const contentBox = { x: MARGIN, w: A4.w - MARGIN * 2 };
  let page = doc.addPage([A4.w, A4.h]);
  let cursor = await renderHeroHeader({ pdfDoc: doc, page, fonts, contentBox, data });

  const contentX = contentBox.x;
  const contentW = contentBox.w;

  const cols = columns8020(contentW);
  const leftX = contentX;
  const leftW = cols.left;
  // Right column (reservado para comentários — continuação)
  const rightX = contentX + cols.left + cols.gap;
  const rightW = cols.right;

  drawBold(page, 'ESPELHO DE CORREÇÃO — PAS/UnB', leftX, cursor, TITLE_SIZE, fonts.bold);
  cursor -= 18;
  drawText(page, 'Aspectos macro e microestruturais', leftX, cursor, BODY_SIZE, fonts.regular, TEXT_SUBTLE);
  cursor -= 14;

  // Preenche a coluna direita com Comentários (continuação), se fornecido
  if (renderCommentsRight) {
    const rightTop = cursor;
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

  const macro = {
    apresentacao: clampNumber(data.pas.apresentacao, 0, 0.5),
    conteudo: clampNumber(data.pas.conteudo, 0, 5),
    generoTextual: clampNumber(data.pas.generoTextual, 0, 2),
    coesaoCoerencia: clampNumber(data.pas.coesaoCoerencia, 0, 3),
  };
  const macroSum = roundDecimals(
    macro.apresentacao + macro.conteudo + macro.generoTextual + macro.coesaoCoerencia,
    2
  );
  cursor = drawMacroTable(page, leftX, cursor, leftW, macro, macroSum, fonts);
  cursor -= CONTENT_GAP;

  const erros = {
    grafiaAcentuacao: clampPositiveInteger(data.pas.erros?.grafiaAcentuacao),
    pontuacaoMorfossintaxe: clampPositiveInteger(data.pas.erros?.pontuacaoMorfossintaxe),
    propriedadeVocabular: clampPositiveInteger(data.pas.erros?.propriedadeVocabular),
  };
  const totalErros = erros.grafiaAcentuacao + erros.pontuacaoMorfossintaxe + erros.propriedadeVocabular;
  const nl = clampNumber(data.pas.nl, 0, 30);
  const discount = nl > 0 ? 2 / nl : 0;
  const nr = roundDecimals(Math.max(0, macroSum - totalErros * discount), 2);

  if (cursor - 200 < MARGIN) {
    page = doc.addPage([A4.w, A4.h]);
    cursor = await renderHeroHeader({ pdfDoc: doc, page, fonts, contentBox, data });
    drawBold(page, 'ESPELHO DE CORREÇÃO — PAS/UnB (continuação)', leftX, cursor, TITLE_SIZE, fonts.bold);
    cursor -= 18;
    drawText(page, 'Aspectos microestruturais', leftX, cursor, BODY_SIZE, fonts.regular, TEXT_SUBTLE);
    cursor -= 14;

    if (renderCommentsRight) {
      const rightTop = cursor;
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

  cursor = drawMicroTable(page, leftX, cursor, leftW, {
    erros,
    totalErros,
    nl,
    discount,
    nc: macroSum,
    nr,
  }, fonts);
}

function drawMacroTable(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  macro: Record<string, number>,
  total: number,
  fonts: Fonts
) {
  const headerHeight = BODY_SIZE + 6;
  const rowHeight = BODY_SIZE + 6;
  let cursor = y;

  drawSectionHeader(page, x, cursor, width, 'Aspectos macroestruturais', fonts);
  cursor -= headerHeight;

  MACRO_ROWS.forEach((row) => {
    cursor -= rowHeight;
    drawRow(
      page,
      x,
      cursor,
      width,
      [
        { text: row.label, widthRatio: 0.6, font: fonts.regular, color: TEXT },
        { text: row.range, widthRatio: 0.2, font: fonts.regular, color: TEXT_SUBTLE, align: 'center' },
        { text: formatScore(macro[row.key] ?? 0, 2), widthRatio: 0.2, font: fonts.bold, color: TEXT, align: 'right' },
      ]
    );
  });

  cursor -= rowHeight;
  drawRow(
    page,
    x,
    cursor,
    width,
    [
      { text: 'Nota conectiva (NC)', widthRatio: 0.8, font: fonts.bold, color: TEXT },
      { text: formatScore(total, 2), widthRatio: 0.2, font: fonts.bold, color: TEXT, align: 'right' },
    ],
    true
  );

  return cursor;
}

function drawMicroTable(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  data: {
    erros: {
      grafiaAcentuacao: number;
      pontuacaoMorfossintaxe: number;
      propriedadeVocabular: number;
    };
    totalErros: number;
    nl: number;
    discount: number;
    nc: number;
    nr: number;
  },
  fonts: Fonts
) {
  const headerHeight = BODY_SIZE + 6;
  const rowHeight = BODY_SIZE + 6;
  let cursor = y;

  drawSectionHeader(page, x, cursor, width, 'Aspectos microestruturais', fonts);
  cursor -= headerHeight;

  MICRO_ROWS.forEach((row) => {
    cursor -= rowHeight;
    const value = data.erros[row.key] ?? 0;
    drawRow(
      page,
      x,
      cursor,
      width,
      [
        { text: row.label, widthRatio: 0.8, font: fonts.regular, color: TEXT },
        { text: `${value}`, widthRatio: 0.2, font: fonts.bold, color: TEXT, align: 'right' },
      ]
    );
  });

  cursor -= rowHeight;
  drawRow(
    page,
    x,
    cursor,
    width,
    [
      { text: 'Total de erros (NE)', widthRatio: 0.8, font: fonts.bold, color: TEXT },
      { text: `${data.totalErros}`, widthRatio: 0.2, font: fonts.bold, color: TEXT, align: 'right' },
    ],
    true
  );

  cursor -= headerHeight;
  drawSectionHeader(page, x, cursor + headerHeight, width, 'Cálculo da nota resultante (NR)', fonts);
  cursor -= rowHeight;
  const formula = `NR = max(0, NC - NE * (2/NL))`;
  drawRow(
    page,
    x,
    cursor,
    width,
    [
      { text: formula, widthRatio: 0.7, font: fonts.regular, color: TEXT },
      {
        text: formatScore(data.nr, 2),
        widthRatio: 0.3,
        font: fonts.bold,
        color: TEXT,
        align: 'right',
      },
    ]
  );

  cursor -= rowHeight;
  const detailText = `NC=${formatScore(data.nc, 2)} · NE=${data.totalErros} · NL=${Math.max(data.nl, 0)} · desconto=${formatScore(
    data.discount,
    3
  )}`;
  drawRow(
    page,
    x,
    cursor,
    width,
    [{ text: detailText, widthRatio: 1, font: fonts.regular, color: TEXT_SUBTLE }]
  );

  return cursor;
}

function drawSectionHeader(page: PDFPage, x: number, y: number, width: number, text: string, fonts: Fonts) {
  page.drawRectangle({
    x,
    y: y - (BODY_SIZE + 6),
    width,
    height: BODY_SIZE + 6,
    color: rgb(245 / 255, 249 / 255, 255 / 255),
    borderColor: colorFromHex(GRAY),
    borderWidth: 1,
  });
  page.drawText(text, {
    x: x + 8,
    y: y - BODY_SIZE - 2,
    size: BODY_SIZE,
    font: fonts.bold,
    color: colorFromHex(TEXT),
  });
}

function drawRow(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  cells: Array<{ text: string; widthRatio: number; font: PDFFont; color: string; align?: 'left' | 'center' | 'right' }>,
  highlight = false
) {
  page.drawRectangle({
    x,
    y,
    width,
    height: BODY_SIZE + 6,
    color: highlight ? colorFromHex('#f3f4f6') : colorFromHex(BG),
    borderColor: colorFromHex(GRAY),
    borderWidth: 1,
  });

  let cursorX = x;
  cells.forEach((cell) => {
    const cellWidth = width * cell.widthRatio;
    const textWidth = cell.font.widthOfTextAtSize(cell.text, BODY_SIZE);
    let textX = cursorX + 8;
    if (cell.align === 'center') {
      textX = cursorX + cellWidth / 2 - textWidth / 2;
    } else if (cell.align === 'right') {
      textX = cursorX + cellWidth - textWidth - 8;
    }
    page.drawText(cell.text, {
      x: textX,
      y: y + 3,
      size: BODY_SIZE,
      font: cell.font,
      color: colorFromHex(cell.color),
    });
    cursorX += cellWidth;
  });
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

function clampNumber(value: number | undefined, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Number(value)));
}

function clampPositiveInteger(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(Number(value)));
}

function roundDecimals(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

function formatScore(value: number, decimals: number) {
  return roundDecimals(value, decimals).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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
