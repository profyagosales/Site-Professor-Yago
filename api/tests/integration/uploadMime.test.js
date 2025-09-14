const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const { createTeacher, createClass, createStudent, generateToken } = require('../helpers/factories');

// Nota: Rota de criação de redação espera JSON com file.originalUrl e mime (já que upload real é tratado antes).
// Para forçar rejeição de MIME diferente de PDF precisamos exercitar a camada de multer.
// Estratégia: simular multipart/form-data com campo 'file' usando mimetype incorreto via supertest.
// Porém a rota '/essays' já está configurada com pdfUpload (fileFilter) antes de entrar no router.

const path = require('path');
const fs = require('fs');

// Criamos buffers temporários em memória para simular uploads.

function makeTempFile(filename, content) {
  const p = path.join(__dirname, `tmp_${Date.now()}_${filename}`);
  fs.writeFileSync(p, content);
  return p;
}

describe('Upload MIME filter', () => {
  let student, cls, teacher; let studentToken;
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    teacher = await createTeacher();
    cls = await createClass(teacher);
    student = await createStudent(cls);
    studentToken = generateToken(student);
  });

  afterAll(async () => { await mongoose.connection.close(); });

  test('rejeita upload com MIME não PDF', async () => {
    const txtPath = makeTempFile('teste.txt', 'Arquivo texto');
    const res = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', txtPath) // supertest infere mimetype text/plain
      .field('type', 'ENEM')
      .field('themeText', 'Tema inválido upload')
      .expect(400); // agora mapeado para 400 pelo errorHandler
    expect(/pdf/i.test(res.body.message)).toBe(true);
    fs.unlinkSync(txtPath);
  });

  test('aceita criação via JSON com metadata de PDF válido (fluxo real)', async () => {
    // Controller createEssay espera body JSON com file.originalUrl já apontando para storage externo.
    // Simulamos esse cenário sem passar pelo multer.
    const res = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'ENEM',
        themeText: 'Tema PDF',
        file: { originalUrl: 'https://example.com/fake.pdf', mime: 'application/pdf' }
      })
      .expect(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.file.mime).toBe('application/pdf');
  });
});
