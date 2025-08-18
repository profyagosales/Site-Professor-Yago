const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function drawDoubleBubble(doc, x, y, number) {
  const digits = String(number).split('');
  digits.forEach((d, idx) => {
    const cx = x + idx * 25;
    doc.circle(cx, y, 10).stroke();
    doc.circle(cx, y, 7).fillAndStroke('black', 'black');
    doc.fillColor('white').fontSize(10).text(d, cx - 3, y - 4);
    doc.fillColor('black');
  });
}

function drawQuestionTable(doc, x, y, questionCount) {
  const options = ['A', 'B', 'C', 'D', 'E'];
  for (let i = 0; i < questionCount; i++) {
    const rowY = y + i * 20;
    doc.text(String(i + 1), x, rowY);
    options.forEach((opt, idx) => {
      const cx = x + 30 + idx * 30;
      doc.circle(cx, rowY + 5, 8).stroke();
      doc.text(opt, cx - 3, rowY + 15, { width: 6 });
    });
  }
}

async function gabaritoPdf({ student, header = {}, evaluation }) {
  const doc = new PDFDocument({ margin: 50 });
  const outputDir = path.join(__dirname, '..', 'gabaritos');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const pdfPath = path.join(outputDir, `${student._id}.pdf`);
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // Logos
  if (header.logos && header.logos.length) {
    header.logos.forEach((logo, idx) => {
      try {
        doc.image(logo, 50 + idx * 60, 40, { width: 50 });
      } catch (err) {
        // ignore missing logo
      }
    });
  }

  // Title
  doc.fontSize(20).text('Gabarito', { align: 'center' });

  // Student info
  let infoY = 100;
  if (student.photo) {
    try {
      const photoPath = path.join(__dirname, '..', 'uploads', student.photo);
      doc.image(photoPath, 50, infoY, { width: 60, height: 60 });
    } catch (err) {
      // ignore
    }
  }
  doc.fontSize(12).text(`Aluno: ${student.name}`, 120, infoY);
  if (student.class) {
    doc.text(
      `Turma: ${student.class.series}${student.class.letter}`,
      120,
      infoY + 15
    );
  }

  // Nota box
  doc.rect(450, infoY, 100, 50).stroke();
  doc.text('Nota', 460, infoY + 20);

  // Double-bubble numbers
  drawDoubleBubble(doc, 50, infoY + 100, student.rollNumber);
  if (student.class) {
    drawDoubleBubble(
      doc,
      200,
      infoY + 100,
      `${student.class.series}${student.class.letter}`
    );
  }

  // Questions table
  drawQuestionTable(doc, 50, infoY + 130, evaluation.numQuestions || 0);

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

module.exports = gabaritoPdf;
