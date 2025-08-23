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

async function renderEssayCorrectionPdf({ essay, student, classInfo, themeName }) {
  const existingBytes = await fetch(essay.originalUrl).then((r) => r.arrayBuffer());
  const origPdf = await PDFLibDocument.load(existingBytes);
  const pdfDoc = await PDFLibDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  const [origPage] = await pdfDoc.copyPages(origPdf, [0]);
  const firstPage = pdfDoc.addPage([pageWidth, pageHeight]);
  const targetWidth = 350;
  const scale = targetWidth / origPage.getWidth();
  const targetHeight = origPage.getHeight() * scale;
  firstPage.drawPage(origPage, {
    x: 30,
    y: pageHeight - 30 - targetHeight,
    width: targetWidth,
    height: targetHeight
  });

  const colors = {
    green: rgb(0, 0.8, 0),
    yellow: rgb(1, 1, 0),
    pink: rgb(1, 0.75, 0.8),
    blue: rgb(0, 0, 1),
    orange: rgb(1, 0.65, 0)
  };

  (essay.annotations || []).forEach((ann, index) => {
    const { bbox } = ann;
    if (!bbox || bbox.page !== 0) return;
    const rectX = 30 + bbox.x * scale;
    const rectY = pageHeight - 30 - (bbox.y + bbox.h) * scale;
    const rectW = bbox.w * scale;
    const rectH = bbox.h * scale;
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

  let commentY = pageHeight - 50;
  const commentX = 30 + targetWidth + 15;
  (essay.annotations || []).forEach((ann, index) => {
    const text = `${index + 1}. [${ann.label}] ${ann.comment}`;
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

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { generateCorrectionPdf, renderEssayCorrectionPdf };
