const request = require('supertest');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../app');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Essay = require('../models/Essay');

describe('Essay file streaming', () => {
  let studentToken;
  let essayId;
  let server;
  let fileUrl;
  let pdfBuffer;

  beforeEach(async () => {
    const cls = await Class.create({ series: 1, letter: 'A', discipline: 'Port', teachers: [] });
    const student = await Student.create({
      name: 'Aluno',
      email: `aluno${Date.now()}@ex.com`,
      passwordHash: await bcrypt.hash('123456', 10),
      class: cls._id,
    });
    studentToken = jwt.sign({ id: student._id }, process.env.JWT_SECRET);

    pdfBuffer = Buffer.from('%PDF-1.4 test\n');
    server = http.createServer((req, res) => {
      const total = pdfBuffer.length;
      const range = req.headers.range;
      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : total - 1;
        res.writeHead(206, {
          'Content-Type': 'application/pdf',
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
        });
        if (req.method !== 'HEAD') res.end(pdfBuffer.slice(start, end + 1));
        else res.end();
      } else {
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Accept-Ranges': 'bytes',
          'Content-Length': total,
        });
        if (req.method !== 'HEAD') res.end(pdfBuffer);
        else res.end();
      }
    }).listen(0);
    const { port } = server.address();
    fileUrl = `http://127.0.0.1:${port}/file.pdf`;

    const createRes = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('type', 'ENEM')
      .field('bimester', '1')
      .field('customTheme', 'Tema')
      .attach('file', Buffer.from('pdf'), 'file.pdf');
    essayId = createRes.body._id;
    await Essay.findByIdAndUpdate(essayId, { $set: { originalUrl: fileUrl } });
  });

  afterEach(() => {
    if (server) server.close();
  });

  it('HEAD /essays/:id/file returns 200 with Accept-Ranges header', async () => {
    const res = await request(app)
      .head(`/essays/${essayId}/file`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
  });

  it('GET /essays/:id/file with Range returns 206 and Content-Range', async () => {
    const res = await request(app)
      .get(`/essays/${essayId}/file`)
      .set('Authorization', `Bearer ${studentToken}`)
      .set('Range', 'bytes=0-0');
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-0/${pdfBuffer.length}`);
  });
});

