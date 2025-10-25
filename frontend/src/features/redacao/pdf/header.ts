import { PDFDocument, PDFPage, PDFFont } from 'pdf-lib';
import { EssayPdfData } from './types';
import {
  MARGIN,
  HERO,
  BRAND,
  SCORE,
  BRAND_COLORS,
  PDF_FONT,
  TEXT,
  TEXT_SUBTLE,
  colorFromHex,
} from './theme';

/**
 * Mesmo contrato usado pelos espelhos (ENEM/PAS) e pelo gerador principal.
 * Retorna o novo cursor Y (topo do conteúdo) após desenhar o cabeçalho.
 */
export type HeroRenderer = (args: {
  pdfDoc: PDFDocument;
  page: PDFPage;
  fonts: { regular: PDFFont; bold: PDFFont };
  contentBox: { x: number; y: number; w: number; h: number };
  data: EssayPdfData;
}) => Promise<number>;

/** Carrega PNG público da pasta /public para embutir no PDF */
async function loadPublicPng(pdfDoc: PDFDocument, path: string) {
  try {
    const res = await fetch(path, { credentials: 'include' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return await pdfDoc.embedPng(buf);
  } catch {
    return null;
  }
}

/** Converte data:uri -> bytes */
function dataUriToBytes(uri: string): Uint8Array {
  const base64 = uri.split(',')[1] ?? '';
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Rasteriza um SVG público para PNG (bytes) em runtime (navegador) */
async function rasterizeSvgToPngBytes(svgUrl: string, targetWidth = 96): Promise<Uint8Array | null> {
  try {
    const res = await fetch(svgUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const objUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
      img.src = objUrl;
      const el = await loaded;

      const ratio = el.naturalHeight && el.naturalWidth ? el.naturalHeight / el.naturalWidth : 1;
      const w = targetWidth;
      const h = Math.max(1, Math.round(w * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(el, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/png');
      return dataUriToBytes(dataUrl);
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  } catch {
    return null;
  }
}

/** Mede e corta o texto para caber em uma largura */
function fitLine(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (!text) return '';
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = '…';
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const slice = text.slice(0, mid) + ellipsis;
    if (font.widthOfTextAtSize(slice, size) <= maxWidth) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return text.slice(0, Math.max(0, low - 1)) + ellipsis;
}

/** Desenha um cartão simples (fundo + borda leve) */
function drawCard(page: PDFPage, x: number, yTop: number, w: number, h: number, fill: string, stroke?: string) {
  page.drawRectangle({
    x,
    y: yTop - h,
    width: w,
    height: h,
    color: colorFromHex(fill),
    borderColor: stroke ? colorFromHex(stroke) : undefined,
    borderWidth: stroke ? 1 : 0,
  });
}

/** Formata pontuação final a partir do payload */
function resolveScoreText(data: EssayPdfData) {
  // Primeiro tenta um display pronto
  const display = (data as any)?.score?.display || (data as any)?.score?.text;
  if (display) return String(display);

  // ENEM: inteiro 0..1000 (se disponível)
  if (data.model === 'ENEM') {
    const total = Number((data as any)?.enem?.total ?? (data as any)?.score?.value ?? 0);
    return String(Math.max(0, Math.round(total)));
  }

  // PAS/UnB: 1 casa e vírgula
  const nr = Number((data as any)?.pas?.nr ?? (data as any)?.score?.value ?? 0);
  const fixed = Math.max(0, Math.round(nr * 10) / 10).toFixed(1).replace('.', ',');
  return fixed;
}

/** Compact orange hero like the dashboard card */
export const renderHeroHeader: HeroRenderer = async ({
  pdfDoc,
  page,
  fonts,
  contentBox,
  data,
}) => {
  const { regular, bold } = fonts;
  const x0 = contentBox.x;
  const w0 = contentBox.w;
  const top = contentBox.y;

  const H = HERO.HEIGHT ?? 72; // altura alvo (~ metade do antigo)
  const PAD = HERO.PAD ?? 8;

  // Fundo laranja do hero
  drawCard(page, x0, top, w0, H, BRAND_COLORS.orange500 ?? '#f97316', BRAND_COLORS.orange300 ?? '#fdba74');

  // Layout interno: [brand 64] [info flex] [score 150..180 + actions inline? (apenas score no PDF)]
  const brandW = 64;
  const gap = 10;
  const scoreW = 160;

  // BRAND mark: prioriza rasterizar o SVG público `/logo.svg`; se falhar, usa fallback PNG
  let markImg = null;
  try {
    const svgBytes = await rasterizeSvgToPngBytes('/logo.svg', 96);
    if (svgBytes) {
      markImg = await pdfDoc.embedPng(svgBytes);
    }
  } catch {
    markImg = null;
  }
  if (!markImg) {
    markImg = await loadPublicPng(pdfDoc, BRAND.FALLBACK_URL || '/pdf/brand-mark.png');
  }
  if (markImg) {
    const imgSize = 40;
    const imgX = x0 + PAD + (brandW - imgSize) / 2;
    const imgY = top - PAD - imgSize;
    page.drawRectangle({
      x: x0 + PAD + (brandW - 46) / 2,
      y: top - PAD - 46,
      width: 46,
      height: 46,
      color: colorFromHex('#ffffff'),
    });
    page.drawImage(markImg, {
      x: imgX,
      y: imgY,
      width: imgSize,
      height: imgSize,
    });
    // “Professor Yago Sales”
    const brandText = 'Professor Yago Sales';
    const tSize = 8;
    const tWidth = brandW - 2;
    const line = fitLine(brandText, regular, tSize, tWidth);
    page.drawText(line, {
      x: x0 + PAD + (brandW - regular.widthOfTextAtSize(line, tSize)) / 2,
      y: top - PAD - 52,
      size: tSize,
      font: regular,
      color: colorFromHex('#ffffffcc'),
    });
  }

  // STUDENT info (meio)
  const infoX = x0 + PAD + brandW + gap;
  const infoW = w0 - (brandW + gap + scoreW + PAD * 2);
  const name = (data.student?.name || 'Aluno(a) não informado(a)') as string;
  const classLabel = (data.student as any)?.classLabel || (data.student as any)?.className || 'Turma —';
  const term = (data.student as any)?.term || (data as any)?.term || '';
  const discipline = (data as any)?.discipline || '';
  const theme = (data as any)?.theme || 'Tema não informado';
  const model = data.model === 'ENEM' ? 'ENEM' : 'PAS/UnB';

  const nameLine = fitLine(name, bold, PDF_FONT.MD, infoW);
  page.drawText(nameLine, {
    x: infoX,
    y: top - PAD - 16,
    size: PDF_FONT.MD,
    font: bold,
    color: colorFromHex('#ffffff'),
  });

  const metaLine = [classLabel, discipline, term ? `${term}º bimestre` : '']
    .filter(Boolean)
    .join(' • ');
  const metaLineF = fitLine(metaLine, regular, 8, infoW);
  page.drawText(metaLineF, {
    x: infoX,
    y: top - PAD - 30,
    size: 8,
    font: regular,
    color: colorFromHex('#ffffffde'),
  });

  const themeLine = fitLine(`Tema: ${theme}`, regular, 8, infoW);
  page.drawText(themeLine, {
    x: infoX,
    y: top - PAD - 42,
    size: 8,
    font: regular,
    color: colorFromHex('#ffffffde'),
  });

  // SCORE card (direita)
  const sX = x0 + w0 - PAD - scoreW;
  const sY = top - PAD;
  const sW = scoreW;
  const sH = 56;

  drawCard(page, sX, sY, sW, sH, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.25)');

  const scoreLabel = 'Nota final';
  const scoreText = resolveScoreText(data);
  const modelText = model;

  // Rótulo
  page.drawText(scoreLabel.toUpperCase(), {
    x: sX + 10,
    y: sY - 14,
    size: 8,
    font: regular,
    color: colorFromHex('#ffffffd9'),
  });

  // Valor
  page.drawText(String(scoreText), {
    x: sX + 10,
    y: sY - 34,
    size: PDF_FONT.LG + 4, // destaque
    font: bold,
    color: colorFromHex('#ffffff'),
  });

  // Modelo
  page.drawText(modelText, {
    x: sX + 10,
    y: sY - 48,
    size: 8,
    font: bold,
    color: colorFromHex('#ffffffcc'),
  });

  // Retorna o novo cursor (início do conteúdo logo abaixo do hero)
  const contentTop = top - H - 6; // 6pt de respiro
  return contentTop;
};