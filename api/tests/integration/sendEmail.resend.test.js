const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const ClassModel = require('../../models/Class');
const AnnotationSet = require('../../models/AnnotationSet');
jest.mock('../../services/cloudinaryService', () => ({
  uploadFile: jest.fn(async () => ({ secure_url: 'https://example.com/original.pdf', public_id: 'pid-resend' }))
}));
jest.mock('../../services/pdfService', () => ({
  generateCorrectedPdf: jest.fn(async () => Buffer.from('PDF')),
  getPdfPageCount: jest.fn(async () => 1)
}));
jest.mock('../../services/emailService', () => ({
  sendEmailWithPdf: jest.fn(async () => true)
}));

function makeToken(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
}

describe('Reenvio de e-mail com PDF já gerado', () => {
  let teacher, student, teacherToken, studentToken, essayId;
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    teacher = await User.create({ name:'Prof RE', email:'profRE@test.com', passwordHash:'hash', role:'teacher' });
    const cls = await ClassModel.create({ name:'Turma RE', year:2025, teacherId: teacher._id });
    student = await User.create({ name:'Aluno RE', email:'alunoRE@test.com', passwordHash:'hash', role:'student', classId: cls._id });
    teacherToken = makeToken(teacher); studentToken = makeToken(student);
  });
  afterAll(async () => { await mongoose.connection.close(); });

  test('Segundo envio não regenera PDF', async () => {
    // Aluno cria
    const createRes = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type:'ENEM', themeText:'Tema Reenvio', file:{ originalUrl:'https://example.com/file.pdf', mime:'application/pdf' } })
      .expect(201);
    essayId = createRes.body._id;

    // Correção -> GRADING
    await request(app)
      .put(`/essays/${essayId}/correction`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ generalComments:'Inicial' })
      .expect(200);

    // Nota -> GRADED
    await request(app)
      .put(`/essays/${essayId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ c1:200,c2:160,c3:160,c4:120,c5:160 })
      .expect(200);

    // AnnotationSet com highlight
    await AnnotationSet.create({ essayId, highlights:[{ page:1, rects:[{ x:10,y:10,w:40,h:12 }], color:'#ff0', category:'grammar', comment:'Ok', createdBy: teacher._id }], comments:[] });

    // Primeiro envio
    const firstSend = await request(app)
      .post(`/essays/${essayId}/send-email`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ finalComments:'Primeiro envio' })
      .expect(200);
    expect(firstSend.body.status).toBe('SENT');
  const pdfService = require('../../services/pdfService');
  const emailService = require('../../services/emailService');
  expect(pdfService.generateCorrectedPdf).toHaveBeenCalledTimes(1);
  expect(emailService.sendEmailWithPdf).toHaveBeenCalledTimes(1);

    // Segundo envio
    const secondSend = await request(app)
      .post(`/essays/${essayId}/send-email`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ finalComments:'Segundo envio' })
      .expect(200);
    expect(secondSend.body.status).toBe('SENT');
  const pdfService2 = require('../../services/pdfService');
  const emailService2 = require('../../services/emailService');
  expect(pdfService2.generateCorrectedPdf).toHaveBeenCalledTimes(1); // não regenera
  expect(emailService2.sendEmailWithPdf).toHaveBeenCalledTimes(2); // reenvio
  });
});
