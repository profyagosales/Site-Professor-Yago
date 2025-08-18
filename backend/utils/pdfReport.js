const PDFDocument = require('pdfkit');

function drawLogo(doc) {
  // Simple geometric logo resembling the site logo
  doc.save();
  doc.fillColor('#f97316');
  // Draw top diamond
  doc.moveTo(50, 50).lineTo(60, 35).lineTo(70, 50).lineTo(60, 65).closePath().fill();
  // Draw base
  doc.moveTo(55, 70).lineTo(55, 90).lineTo(65, 95).lineTo(65, 75).closePath().stroke('#f97316');
  doc.restore();
  doc.fillColor('#f97316').fontSize(20).text('Professor Yago', 80, 45);
}

function pdfReport(className, students) {
  const doc = new PDFDocument({ margin: 50 });
  drawLogo(doc);

  doc.moveDown();
  doc.fontSize(16).fillColor('black').text(`Relatório de Notas - ${className}`, {
    align: 'center',
  });
  doc.moveDown();

  const startX = 50;
  const startY = 130;
  const columnWidths = [200, 70, 70, 70, 70, 70];
  const headers = ['Aluno', '1º Bim', '2º Bim', '3º Bim', '4º Bim', 'Média'];

  doc.fontSize(12);
  headers.forEach((h, i) => {
    const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(h, x, startY, {
      width: columnWidths[i],
      align: i === 0 ? 'left' : 'center',
    });
  });

  let y = startY + 20;
  students.forEach((s) => {
    const row = [
      s.name,
      s.bimesters[0] !== undefined ? s.bimesters[0] : '-',
      s.bimesters[1] !== undefined ? s.bimesters[1] : '-',
      s.bimesters[2] !== undefined ? s.bimesters[2] : '-',
      s.bimesters[3] !== undefined ? s.bimesters[3] : '-',
      s.average !== undefined ? s.average.toFixed(2) : '-',
    ];

    row.forEach((text, i) => {
      const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
      const align = i === 0 ? 'left' : 'center';
      doc.text(text, x, y, {
        width: columnWidths[i],
        align,
      });
    });
    y += 20;
  });

  return doc;
}

module.exports = pdfReport;
