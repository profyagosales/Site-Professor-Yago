const fs = require('fs');
const path = require('path');
const { generateCorrectedEssayPdf } = require('../backend/services/pdf');

async function run() {
  const brandPath = path.resolve(__dirname, '../backend/assets/brand-mark.png');
  let data = null;
  try {
    data = fs.readFileSync(brandPath);
  } catch (err) {
    console.error('Não encontrou brand-mark.png em backend/assets; usando placeholder');
  }

  // Start a tiny HTTP server to serve the image so fetchRemoteBytes can retrieve it
  const http = require('http');
  const server = http.createServer((req, res) => {
    if (!data) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(data);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const dataUrl = `http://127.0.0.1:${port}/brand.png`;

  const essay = {
    originalUrl: dataUrl,
    originalMimeType: 'image/png',
    type: 'ENEM',
    subject: 'Português',
    bimestre: 1,
    theme: 'Tema de teste',
    submittedAt: new Date().toISOString(),
  };

  const annotations = [
    { page: 1, number: 1, category: 'argumentacao', rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }], comment: 'Bom início.' },
    { page: 1, number: 2, category: 'coesao', rects: [{ x: 0.15, y: 0.5, w: 0.4, h: 0.1 }], comment: 'Conectar ideias.' },
  ];

  const score = {
    type: 'ENEM',
    enem: {
      total: 560,
      points: [100, 120, 110, 90, 140],
      levels: [3,2,4,1,5],
      competencies: {},
    },
  };

  const student = { name: 'Aluno de Teste', photo: null };
  const classInfo = { name: '3º A', students: [{ name: 'Aluno de Teste', number: 1, grades: [8.5, 7.0] }], bimesters: [1,2] };

  try {
    const pdfBuffer = await generateCorrectedEssayPdf({ essay, annotations, score, student, classInfo });
    const out = '/tmp/test-corrected.pdf';
    fs.writeFileSync(out, pdfBuffer);
    console.log('PDF gerado em', out);
      server.close();
  } catch (err) {
    console.error('Falha ao gerar PDF de teste:', err);
    server.close();
  }
}

run();
