const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const ClassModel = require('../../models/Class');
const AnnotationSet = require('../../models/AnnotationSet');
const Essay = require('../../models/Essay');

jest.mock('../../services/cloudinaryService', () => ({
  uploadFile: jest.fn(async (data) => ({ secure_url: 'https://example.com/corrected.pdf', public_id: 'pid-failure' }))
}));
jest.mock('../../services/pdfService', () => ({
  generateCorrectedPdf: jest.fn(async () => Buffer.from('PDF')),
  getPdfPageCount: jest.fn(async () => 1)
}));
jest.mock('../../services/emailService', () => ({
  sendEmailWithPdf: jest.fn(async () => { throw new Error('SMTP down'); })
}));

function makeToken(user) { const jwt = require('jsonwebtoken'); return jwt.sign({ sub:user._id, role:user.role }, process.env.JWT_SECRET||'testsecret', { expiresIn:'1h' }); }

describe('Falha no envio de e-mail após geração de PDF', () => {
  let teacher, student, teacherToken, studentToken, essayId;
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    teacher = await User.create({ name:'Prof FE', email:'profFE@test.com', passwordHash:'hash', role:'teacher' });
    const cls = await ClassModel.create({ name:'Turma FE', year:2025, teacherId: teacher._id });
    student = await User.create({ name:'Aluno FE', email:'alunoFE@test.com', passwordHash:'hash', role:'student', classId: cls._id });
    teacherToken = makeToken(teacher); studentToken = makeToken(student);
  });
  afterAll(async () => { await mongoose.connection.close(); });

  test('Retorna 500 e mantém PDF corrigido salvo', async () => {
    // Cria redação
    const createRes = await request(app)
      .post('/essays').set('Authorization', `Bearer ${studentToken}`)
      .send({ type:'ENEM', themeText:'Tema Falha Email', file:{ originalUrl:'https://example.com/file.pdf', mime:'application/pdf' } })
      .expect(201);
    essayId = createRes.body._id;

    // Correção
    await request(app).put(`/essays/${essayId}/correction`).set('Authorization', `Bearer ${teacherToken}`).send({ generalComments:'Iniciando' }).expect(200);
    // Nota
    await request(app).put(`/essays/${essayId}/grade`).set('Authorization', `Bearer ${teacherToken}`).send({ c1:200,c2:160,c3:160,c4:120,c5:160 }).expect(200);
    // AnnotationSet com highlight
    await AnnotationSet.create({ essayId, highlights:[{ page:1, rects:[{ x:5,y:5,w:40,h:10 }], color:'#0f0', category:'grammar', comment:'C', createdBy: teacher._id }], comments:[] });

    // Envio falha
    const failRes = await request(app)
      .post(`/essays/${essayId}/send-email`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ finalComments:'Tentando enviar' })
      .expect(500);
    expect(failRes.body.message).toMatch(/SMTP|falha|erro/i);

    // Verificar que correctedPdfUrl foi persistido apesar da falha de e-mail
    const updated = await Essay.findById(essayId);
    expect(updated.correctedPdfUrl).toBeTruthy();
    // Status deve permanecer GRADED (não transita para SENT pois erro interrompe antes de atualizar envio)
    expect(updated.status).toBe('GRADED');
  });
});
