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

module.exports = { generateCorrectionPdf };
