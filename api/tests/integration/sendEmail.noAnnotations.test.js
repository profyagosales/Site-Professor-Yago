const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Essay = require('../../models/Essay');
const ClassModel = require('../../models/Class');
const AnnotationSet = require('../../models/AnnotationSet');

jest.mock('../../services/cloudinaryService', () => ({
  uploadFile: jest.fn(async () => ({ secure_url: 'https://example.com/original.pdf', public_id: 'pid-send-noann' }))
}));

// Mock pdfService para gerar buffer simples
jest.mock('../../services/pdfService', () => ({
  generateCorrectedPdf: jest.fn(async () => Buffer.from('PDF')),
  getPdfPageCount: jest.fn(async () => 1)
}));

// Espionar emailService para confirmar que não é chamado
let emailCalled = false;
jest.mock('../../services/emailService', () => ({
  sendEmailWithPdf: jest.fn(async () => { emailCalled = true; return true; })
}));

function makeToken(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
}

describe('Envio de e-mail sem AnnotationSet válido', () => {
  let teacher, student, teacherToken, studentToken, essayId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    teacher = await User.create({ name:'Prof SE', email:'profSE@test.com', passwordHash:'hash', role:'teacher' });
    const cls = await ClassModel.create({ name:'Turma SE', year:2025, teacherId: teacher._id });
    student = await User.create({ name:'Aluno SE', email:'alunoSE@test.com', passwordHash:'hash', role:'student', classId: cls._id });
    teacherToken = makeToken(teacher);
    studentToken = makeToken(student);
  });

  afterAll(async () => { await mongoose.connection.close(); });

  test('Retorna 400 se não há highlights antes de enviar', async () => {
    // 1. Aluno cria redação
    const createRes = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type:'ENEM', themeText:'Tema Envio Falha', file:{ originalUrl:'https://example.com/file.pdf', mime:'application/pdf' } })
      .expect(201);
    essayId = createRes.body._id;

    // 2. Professor inicia correção
    await request(app)
      .put(`/essays/${essayId}/correction`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ generalComments:'Começando' })
      .expect(200);

    // 3. Professor atribui nota (GRADED)
    await request(app)
      .put(`/essays/${essayId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ c1:200,c2:160,c3:160,c4:120,c5:160 })
      .expect(200);

    // (Não criar AnnotationSet ou criar vazio sem highlights)
    await AnnotationSet.create({ essayId, highlights: [], comments: [] });

    // 4. Envio deve falhar: sem highlights suficientes
    const sendRes = await request(app)
      .post(`/essays/${essayId}/send-email`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ finalComments:'Tentativa sem anotações' })
      .expect(400);
    expect(sendRes.body.message).toMatch(/anotações/i);
    expect(emailCalled).toBe(false);
  });
});
