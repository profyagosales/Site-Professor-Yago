const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Essay = require('../../models/Essay');
const ClassModel = require('../../models/Class');
const jwt = require('jsonwebtoken');

function makeToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
}

describe('IA Correction Suggestion Endpoint', () => {
  let teacher, student, teacherToken, studentToken, essay;

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
    teacherToken = makeToken(teacher);
    studentToken = makeToken(student);
    essay = await Essay.create({
      studentId: student._id,
      teacherId: teacher._id,
      type: 'ENEM',
      themeText: 'Impactos da tecnologia na educação',
      status: 'PENDING',
      file: { originalUrl: 'https://example.com/file.pdf', mime:'application/pdf' }
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('flag off retorna 403', async () => {
    delete process.env.ENABLE_AI_CORRECTION;
    const res = await request(app)
      .post('/ai/correction-suggestion')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ essayId: essay._id });
    expect(res.status).toBe(403);
  });

  test('flag on retorna sugestão', async () => {
    process.env.ENABLE_AI_CORRECTION = 'true';
    const res = await request(app)
      .post('/ai/correction-suggestion')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ essayId: essay._id });
    expect(res.status).toBe(200);
    expect(res.body.sections).toBeDefined();
    expect(res.body.sections.generalFeedback).toContain('Análise gerada');
  });

  test('limite de tamanho rawText (413)', async () => {
    process.env.ENABLE_AI_CORRECTION = 'true';
    const big = 'a'.repeat(12001);
    const res = await request(app)
      .post('/ai/correction-suggestion')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ essayId: essay._id, rawText: big });
    expect(res.status).toBe(413);
  });

});
