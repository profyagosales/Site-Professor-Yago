const PDFDocument = require('pdfkit');

function scoreColor(score) {
  if (score >= 160) return '#2E8B57'; // green
  if (score >= 80) return '#DAA520'; // gold
  return '#DC143C'; // red
}

function generateCorrectionPdf({
  tipo,
  NC,
  NE,
  NL,
  finalScore,
  competencias = [],
  generalComment,
  anulacao
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(18).text('Folha de Corre\u00e7\u00e3o', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('black');
    doc.text(`Tipo: ${tipo}`);
    doc.text(`Nota final: ${finalScore}`);

    if (tipo === 'PAS/UnB') {
      doc.text(`NC: ${NC}`);
      doc.text(`NE: ${NE}`);
      doc.text(`NL: ${NL}`);
      if (generalComment) {
        doc.moveDown().text('Coment\u00e1rios:');
        doc.text(generalComment);
      }
    } else if (tipo === 'ENEM') {
      if (anulacao) {
        doc.moveDown();
        doc.fillColor('red').fontSize(14).text(`Reda\u00e7\u00e3o anulada: ${anulacao}`, {
          underline: true
        });
        doc.fillColor('black');
      }

      competencias.forEach((comp, index) => {
        const pontuacao = comp.pontuacao || 0;
        const comentario = comp.comentario || '';
        doc.moveDown();
        doc.fontSize(12).text(`Compet\u00eancia ${index + 1}: ${pontuacao}`);

        const barX = doc.page.margins.left;
        const barY = doc.y;
        const barWidth = (pontuacao / 200) * 200;
        doc.rect(barX, barY, 200, 10).stroke();
        doc.fillColor(scoreColor(pontuacao)).rect(barX, barY, barWidth, 10).fill();
        doc.fillColor('black');
        doc.moveDown(1.5);
        if (comentario) {
          doc.fontSize(10).text(comentario);
        }
      });
    }

    doc.end();
  });
}

const { PDFDocument: PDFLibDocument, rgb, StandardFonts } = require('pdf-lib');

async function renderEssayCorrectionPdf({ essay, student, classInfo, themeName, thumbnailsCount = 2 }) {
  const existingBytes = await fetch(essay.originalUrl).then((r) => r.arrayBuffer());
  const origPdf = await PDFLibDocument.load(existingBytes);
  const pdfDoc = await PDFLibDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  const pageCount = origPdf.getPageCount();
  const count = Math.max(1, Math.min(2, thumbnailsCount || 2));
  const showIndexes = Array.from({ length: count }, (_, i) => i).filter((i) => i < pageCount);
  const copied = await pdfDoc.copyPages(origPdf, showIndexes);
  const firstPage = pdfDoc.addPage([pageWidth, pageHeight]);
  // Escolha um width menor para permitir até 2 miniaturas empilhadas
  const targetWidth = 260;
  const thumbLeftX = 30;
  const thumbsMeta = [];
  let cursorY = pageHeight - 30; // topo utilizável
  for (let i = 0; i < copied.length; i++) {
    const p = copied[i];
    const origIndex = showIndexes[i];
    const scale = targetWidth / p.getWidth();
    const targetHeight = p.getHeight() * scale;
    const thumbY = cursorY - targetHeight;
    firstPage.drawPage(p, {
      x: thumbLeftX,
      y: thumbY,
      width: targetWidth,
      height: targetHeight
    });
    thumbsMeta.push({ pageIndex: origIndex, x: thumbLeftX, y: thumbY, width: targetWidth, height: targetHeight, scale });
    cursorY = thumbY - 10; // espaço entre miniaturas
  }

  const colors = {
    green: rgb(0, 0.8, 0),
    yellow: rgb(1, 1, 0),
    pink: rgb(1, 0.75, 0.8),
    blue: rgb(0, 0, 1),
    orange: rgb(1, 0.65, 0)
  };

  (essay.annotations || []).forEach((ann, index) => {
    const { bbox } = ann;
    if (!bbox) return;
    const meta = thumbsMeta.find((t) => t.pageIndex === bbox.page);
    if (!meta) return; // não exibimos miniatura desta página na folha 1
    const rectX = meta.x + bbox.x * meta.scale;
    const rectW = bbox.w * meta.scale;
    const rectH = bbox.h * meta.scale;
    const rectY = meta.y + (meta.height - (bbox.y + bbox.h) * meta.scale);
    const color = colors[ann.color] || rgb(1, 0, 0);
    firstPage.drawRectangle({
      x: rectX,
      y: rectY,
      width: rectW,
      height: rectH,
      borderColor: color,
      borderWidth: 1
    });
    firstPage.drawText(String(index + 1), {
      x: rectX + rectW + 2,
      y: rectY + rectH - 12,
      size: 12,
      font
    });
  });

  // Desenhar richAnnotations (highlight/box/strike/pen/comment) nas miniaturas
  const rich = essay.richAnnotations || [];
  rich.forEach((a, idx) => {
    const pageIdx = (a.page || 1) - 1;
    const meta = thumbsMeta.find((t) => t.pageIndex === pageIdx);
    if (!meta) return;
    const col = (a.color && /^#/.test(a.color)) ? a.color : undefined;
    const edge = 1;
    if (a.type === 'highlight' && Array.isArray(a.rects)) {
      a.rects.forEach((r) => {
        const x = meta.x + r.x * meta.scale;
        const w = r.w * meta.scale;
        const h = r.h * meta.scale;
        const y = meta.y + (meta.height - (r.y + r.h) * meta.scale);
        firstPage.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(1, 0.9, 0.3), borderWidth: edge });
      });
    }
    if (a.type === 'box' && a.rect) {
      const r = a.rect;
      const x = meta.x + r.x * meta.scale;
      const w = r.w * meta.scale;
      const h = r.h * meta.scale;
      const y = meta.y + (meta.height - (r.y + r.h) * meta.scale);
      firstPage.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.2, 0.5, 1), borderWidth: edge });
    }
    if (a.type === 'strike' && a.from && a.to) {
      const x1 = meta.x + a.from.x * meta.scale;
      const y1 = meta.y + (meta.height - a.from.y * meta.scale);
      const x2 = meta.x + a.to.x * meta.scale;
      const y2 = meta.y + (meta.height - a.to.y * meta.scale);
      firstPage.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1, color: rgb(1, 0, 0) });
    }
    if (a.type === 'pen' && Array.isArray(a.points) && a.points.length > 1) {
      for (let i = 1; i < a.points.length; i++) {
        const p1 = a.points[i - 1];
        const p2 = a.points[i];
        const x1 = meta.x + p1.x * meta.scale;
        const y1 = meta.y + (meta.height - p1.y * meta.scale);
        const x2 = meta.x + p2.x * meta.scale;
        const y2 = meta.y + (meta.height - p2.y * meta.scale);
        firstPage.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: (a.width || 2) * 0.5, color: rgb(1, 0, 0) });
      }
    }
    if (a.type === 'comment' && a.at) {
      const x = meta.x + a.at.x * meta.scale;
      const y = meta.y + (meta.height - a.at.y * meta.scale);
      firstPage.drawText('✦', { x, y, size: 10, font, color: rgb(0.95, 0.8, 0.2) });
    }
  });

  // Nota sobre páginas
  let commentY = pageHeight - 50;
  const commentX = thumbLeftX + targetWidth + 15;
  firstPage.drawText('Obs.: anotações em outras páginas indicadas como [pN].', {
    x: commentX,
    y: commentY,
    size: 10,
    font
  });
  commentY -= 16;
  if (pageCount > showIndexes.length) {
    const remaining = pageCount - showIndexes.length;
    firstPage.drawText(`Outras páginas (${remaining}) disponíveis no resumo da p.2.`, {
      x: commentX,
      y: commentY,
      size: 10,
      font
    });
    commentY -= 16;
  }
  (essay.annotations || []).forEach((ann, index) => {
    const p = (ann.bbox && Number.isInteger(ann.bbox.page)) ? `[p${ann.bbox.page + 1}] ` : '';
    const lbl = ann.label ? `[${ann.label}] ` : '';
    const cm = ann.comment || '';
    const text = `${index + 1}. ${p}${lbl}${cm}`;
    firstPage.drawText(text, {
      x: commentX,
      y: commentY,
      size: 10,
      font,
      maxWidth: pageWidth - commentX - 20
    });
    commentY -= 12;
  });

  const secondPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 50;
  const header = [
    `Aluno: ${student.name}`,
    `Turma: ${classInfo.series}${classInfo.letter}`,
    `Bimestre: ${essay.bimester}`,
    `Tipo: ${essay.type}`,
    `Tema: ${themeName}`,
    `Data: ${new Date().toLocaleDateString('pt-BR')}`
  ];
  header.forEach((line) => {
    secondPage.drawText(line, { x: 50, y, size: 12, font });
    y -= 14;
  });

  if (essay.annulmentReason) {
    y -= 20;
    secondPage.drawText('Formas elementares de anulação:', { x: 50, y, size: 12, font });
    y -= 14;
    secondPage.drawText(`- ${essay.annulmentReason}`, { x: 60, y, size: 12, font });
    y -= 14;
    secondPage.drawText('Nota: 0', { x: 50, y, size: 12, font });
    y -= 14;
  } else if (essay.type === 'ENEM') {
    y -= 20;
    secondPage.drawText('Competências:', { x: 50, y, size: 12, font });
    y -= 14;
    for (let i = 1; i <= 5; i++) {
      const val = essay.enemCompetencies?.[`c${i}`] || 0;
      secondPage.drawText(`C${i}: ${val}`, { x: 60, y, size: 12, font });
      y -= 14;
    }
    y -= 10;
    secondPage.drawText(`Total: ${essay.rawScore || 0}/1000`, { x: 50, y, size: 12, font });
    y -= 14;
    secondPage.drawText(`Peso no bimestre: ${essay.bimestreWeight}`, { x: 50, y, size: 12, font });
    y -= 14;
    secondPage.drawText(`Nota bimestral aplicada: ${essay.scaledScore}`, {
      x: 50,
      y,
      size: 12,
      font
    });
    y -= 14;
  } else {
    y -= 20;
    const NC = essay.pasBreakdown?.NC || 0;
    const NE = essay.pasBreakdown?.NE || 0;
    const NL = essay.pasBreakdown?.NL || 1;
    const NR = essay.rawScore || 0;
    secondPage.drawText(`NC: ${NC}`, { x: 50, y, size: 12, font });
    y -= 14;
    secondPage.drawText(`NE: ${NE}`, { x: 50, y, size: 12, font });
    y -= 14;
    secondPage.drawText(`NL: ${NL}`, { x: 50, y, size: 12, font });
    y -= 14;
    secondPage.drawText(
      `NR = NC - (2 × NE) / NL = ${NC} - (2 × ${NE}) / ${NL} = ${NR}`,
      { x: 50, y, size: 12, font }
    );
    y -= 14;
    secondPage.drawText(`Resultado final: ${NR}`, { x: 50, y, size: 12, font });
    y -= 14;
    secondPage.drawText(`Peso no bimestre: ${essay.bimestreWeight}`, { x: 50, y, size: 12, font });
    y -= 14;
    secondPage.drawText(`Nota bimestral aplicada: ${essay.scaledScore}`, {
      x: 50,
      y,
      size: 12,
      font
    });
    y -= 14;
  }

  if (essay.comments) {
    y -= 20;
    secondPage.drawText('Comentários gerais:', { x: 50, y, size: 12, font });
    y -= 14;
    essay.comments.split('\n').forEach((line) => {
      secondPage.drawText(line, { x: 50, y, size: 12, font });
      y -= 14;
    });
  }

  // Resumo de anotações por página
  const anns = essay.annotations || [];
  if (anns.length) {
    y -= 20;
    secondPage.drawText('Anotações (por página):', { x: 50, y, size: 12, font });
    y -= 14;
    const byPage = {};
    anns.forEach((a, idx) => {
      const p = (a.bbox && Number.isInteger(a.bbox.page)) ? a.bbox.page + 1 : 1;
      if (!byPage[p]) byPage[p] = [];
      byPage[p].push({ idx: idx + 1, label: a.label, comment: a.comment });
    });
    Object.keys(byPage).sort((a,b)=>Number(a)-Number(b)).forEach((pStr) => {
      const p = Number(pStr);
      secondPage.drawText(`Página ${p}:`, { x: 50, y, size: 12, font });
      y -= 14;
      byPage[p].forEach((it) => {
        const line = `${it.idx}. ${it.label ? `[${it.label}] ` : ''}${it.comment || ''}`;
        secondPage.drawText(line, { x: 60, y, size: 12, font });
        y -= 14;
      });
    });
  }

  // Resumo de richAnnotations por página
  const rAnns = essay.richAnnotations || [];
  if (rAnns.length) {
    y -= 20;
    secondPage.drawText('Anotações ricas (por página):', { x: 50, y, size: 12, font });
    y -= 14;
    const byPage = {};
    rAnns.forEach((a, idx) => {
      const p = Number(a.page || 1);
      if (!byPage[p]) byPage[p] = [];
      const label = a.type;
      const comment = a.type === 'comment' ? (a.text || '') : '';
      byPage[p].push({ idx: idx + 1, label, comment });
    });
    Object.keys(byPage).sort((a,b)=>Number(a)-Number(b)).forEach((pStr) => {
      const p = Number(pStr);
      secondPage.drawText(`Página ${p}:`, { x: 50, y, size: 12, font });
      y -= 14;
      byPage[p].forEach((it) => {
        const line = `${it.idx}. [${it.label}] ${it.comment || ''}`;
        secondPage.drawText(line, { x: 60, y, size: 12, font });
        y -= 14;
      });
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { generateCorrectionPdf, renderEssayCorrectionPdf };
