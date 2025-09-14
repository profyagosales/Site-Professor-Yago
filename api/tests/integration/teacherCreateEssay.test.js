const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const { createTeacher, createClass, createStudent, generateToken } = require('../helpers/factories');

jest.mock('../../services/cloudinaryService', () => ({
  uploadFile: jest.fn(async () => ({ secure_url: 'https://example.com/original.pdf', public_id: 'pid-up' }))
}));

jest.mock('../../services/pdfService', () => ({
  getPdfPageCount: jest.fn(async () => 2)
}));

const path = require('path');
const fs = require('fs');

function makeTempPdf() {
  const content = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const p = path.join(__dirname, `tmp_${Date.now()}_t.pdf`);
  fs.writeFileSync(p, content);
  return p;
}

describe('Professor cria redação para aluno', () => {
  let teacher, student, cls, teacherToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    teacher = await createTeacher();
    cls = await createClass(teacher);
    student = await createStudent(cls);
    teacherToken = generateToken(teacher);
  });

  afterAll(async () => { await mongoose.connection.close(); });

  test('criação com upload e tema ID inexistente falha, depois sucesso com temaText', async () => {
    // Primeiro tenta sem arquivo correto (faltará field themeId e sem arquivo? file é obrigatório)
    const pdfPath = makeTempPdf();
    // Tenta com themeId ausente -> espera 400 (controller createEssayForStudent exige themeId)
    await request(app)
      .post(`/essays/student/${student._id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .attach('file', pdfPath)
      .field('type', 'ENEM')
      .expect(400);

    // Agora cria um tema "dummy" rápido via Model (sem rota) para testar caminho válido
    const Theme = require('../../models/Theme');
    const theme = await Theme.create({ title: 'Tema Controller', createdBy: teacher._id });

    const okRes = await request(app)
      .post(`/essays/student/${student._id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .attach('file', pdfPath)
      .field('type', 'ENEM')
      .field('themeId', theme._id.toString())
      .expect(201);
    expect(okRes.body.status).toBe('PENDING');
    expect(okRes.body.file.pages).toBe(2);
    expect(okRes.body.teacherId).toBe(teacher._id.toString());

    fs.unlinkSync(pdfPath);
  });
});
