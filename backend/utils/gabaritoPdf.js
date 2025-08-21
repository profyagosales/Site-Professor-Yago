const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function buildGabaritoPDF({ logoLeft, logoRight, schoolName, discipline, teacher }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 retrato
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  async function embedImg(file) {
    if (!file || !file.buffer) return null;
    const buf = file.buffer;
    const mime = (file.mimetype || '').toLowerCase();
    try {
      if (mime.includes('png')) return await pdfDoc.embedPng(buf);
      if (mime.includes('jpg') || mime.includes('jpeg')) return await pdfDoc.embedJpg(buf);
      return await pdfDoc.embedJpg(buf);
    } catch (e) {
      return null;
    }
  }

  const left = await embedImg(logoLeft);
  const right = await embedImg(logoRight);

  const margin = 40;
  const top = 800;

  if (left) {
    const scale = 60 / left.height;
    page.drawImage(left, { x: margin, y: top - left.height * scale, width: left.width * scale, height: left.height * scale });
  }
  if (right) {
    const scale = 60 / right.height;
    const w = right.width * scale;
    page.drawImage(right, { x: 595 - margin - w, y: top - right.height * scale, width: w, height: right.height * scale });
  }

  page.drawText(schoolName || '', { x: margin, y: top - 80, size: 16, font, color: rgb(0, 0, 0) });
  page.drawText(discipline || '', { x: margin, y: top - 105, size: 12, font });
  page.drawText(teacher || '', { x: margin, y: top - 125, size: 12, font });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { buildGabaritoPDF };
