const request = require('supertest');
const { app } = require('../app');
const mongoose = require('mongoose');
const Essay = require('../models/Essay');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

describe('PDF Health HEAD /api/essays/:id/file', () => {
  let studentToken, otherStudentToken, teacherToken, essayId;

  // IMPORTANTE: a suíte global faz cleanup (deleteMany) após cada teste (setup.js -> afterEach)
  // Portanto precisamos recriar os dados antes de cada caso de teste.
  beforeEach(async () => {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('x', 6);

    const klass = await Class.create({ series: '1', letter: 'A', discipline: 'Port', teachers: [] });
    const student = await Student.create({ name: 'Std 1', email: 's1@test', passwordHash: hash, class: klass._id });
    await Student.create({ name: 'Std 2', email: 's2@test', passwordHash: hash, class: klass._id });
    const teacher = await Teacher.create({ name: 'Teach', email: 't@test', password: 'x' });
    klass.teachers.push(teacher._id); await klass.save();
    const essay = await Essay.create({ studentId: student._id, classId: klass._id, teacherId: teacher._id, type: 'ENEM', bimester: 1, originalUrl: 'https://example.com/fake.pdf' });
    essayId = essay._id;

  const s1 = await request(app).post('/auth/login-student').send({ email: 's1@test', password: 'x' });
    studentToken = s1.body?.data?.token || s1.body?.token;
    // debug
    // eslint-disable-next-line no-console
    console.log('studentToken', studentToken && studentToken.slice(0,20)+'...');
  const s2 = await request(app).post('/auth/login-student').send({ email: 's2@test', password: 'x' });
    otherStudentToken = s2.body?.data?.token || s2.body?.token;
    // eslint-disable-next-line no-console
    console.log('otherStudentToken', otherStudentToken && otherStudentToken.slice(0,20)+'...');
  const t = await request(app).post('/auth/login-teacher').send({ email: 't@test', password: 'x' });
    teacherToken = t.body?.data?.token || t.body?.token;
    // eslint-disable-next-line no-console
    console.log('teacherToken', teacherToken && teacherToken.slice(0,20)+'...');
  });

  it('401 sem login', async () => {
  await request(app).head(`/essays/${essayId}/file`).expect(401);
  });

  it('403 aluno diferente', async () => {
    await request(app)
  .head(`/essays/${essayId}/file`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .expect(403);
  });

  it('204 aluno dono', async () => {
    const r = await request(app)
  .head(`/essays/${essayId}/file`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(204);
    expect(r.headers['content-type']).toMatch(/pdf/);
  });

  it('204 professor da turma', async () => {
    const r = await request(app)
  .head(`/essays/${essayId}/file`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(204);
    expect(r.headers['content-type']).toMatch(/pdf/);
  });
});