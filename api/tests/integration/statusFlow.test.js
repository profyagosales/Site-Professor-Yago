const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Essay = require('../../models/Essay');
const ClassModel = require('../../models/Class');
const jwt = require('jsonwebtoken');

// Mocks de serviços externos
jest.mock('../../services/cloudinaryService', () => ({
  uploadFile: jest.fn(async () => ({ secure_url: 'https://example.com/original.pdf', public_id: 'pid' }))
}));

jest.mock('../../services/emailService', () => ({
  sendEmailWithPdf: jest.fn(async () => true)
}));

jest.mock('../../services/pdfService', () => ({
  generateCorrectedPdf: jest.fn(async () => Buffer.from('PDF')),
  getPdfPageCount: jest.fn(async () => 1)
}));

function makeToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
}

describe('Fluxo de status da redação', () => {
  let teacher, student, teacherToken, studentToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Essay.deleteMany({});
    await ClassModel.deleteMany({});
  teacher = await User.create({ name:'Prof', email:'prof@test.com', passwordHash:'hash', role:'teacher' });
  const cls = await ClassModel.create({ name:'Turma 1', year:2025, teacherId: teacher._id });
  student = await User.create({ name:'Aluno', email:'aluno@test.com', passwordHash:'hash', role:'student', classId: cls._id });
    studentToken = makeToken(student);
    teacherToken = makeToken(teacher);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('PENDING -> GRADING -> GRADED -> SENT', async () => {
    // Aluno cria redação
    const createRes = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'ENEM',
        themeText: 'Tema teste',
        file: { originalUrl: 'https://example.com/file.pdf', mime:'application/pdf' }
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('PENDING');
    const essayId = createRes.body._id;

    // Professor salva rascunho (transição para GRADING)
    const corrRes = await request(app)
      .put(`/essays/${essayId}/correction`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ generalComments: 'Começando correção' });
    expect(corrRes.status).toBe(200);
    expect(corrRes.body.status).toBe('GRADING');

    // Professor atribui nota (transição para GRADED)
    const gradeRes = await request(app)
      .put(`/essays/${essayId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ c1:200,c2:160,c3:160,c4:120,c5:160 });
    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.status).toBe('GRADED');

    // Mock: criar AnnotationSet para permitir envio
    const AnnotationSet = require('../../models/AnnotationSet');
    await AnnotationSet.create({ essayId, highlights:[{ page:1, rects:[{x:10,y:10,w:50,h:20}], color:'#ff0', category:'grammar', comment:'Erro', text:'abc', createdBy: teacher._id }] });

    // Professor envia email (gera PDF se necessário) -> SENT
    const emailRes = await request(app)
      .post(`/essays/${essayId}/send-email`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send();
    expect(emailRes.status).toBe(200);
    expect(emailRes.body.status).toBe('SENT');
  });
});
