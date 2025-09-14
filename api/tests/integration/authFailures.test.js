const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const { createTeacher, createClass, createStudent, generateToken } = require('../helpers/factories');

// Utilizamos rota /themes (proteção teacher) e /essays (acessível student para criar) para validar desvios.

describe('Auth middleware falhas', () => {
  let teacher, student, classDoc, teacherToken, studentToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    teacher = await createTeacher();
    classDoc = await createClass(teacher);
    student = await createStudent(classDoc);
    teacherToken = generateToken(teacher);
    studentToken = generateToken(student);
  });

  afterAll(async () => { await mongoose.connection.close(); });

  test('401 sem token', async () => {
    const res = await request(app)
      .post('/themes')
      .send({ title: 'X' })
      .expect(401);
    expect(res.body.message).toMatch(/token/i);
  });

  test('401 token inválido (assinatura corrompida)', async () => {
    const invalid = teacherToken.slice(0,-2) + 'xx';
    const res = await request(app)
      .post('/themes')
      .set('Authorization', `Bearer ${invalid}`)
      .send({ title: 'Y' })
      .expect(401);
    expect(/inválido|invalid/i.test(res.body.message || '')).toBe(true);
  });

  test('401 token expirado', async () => {
    const expired = jwt.sign({ sub: teacher._id, role: teacher.role }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app)
      .post('/themes')
      .set('Authorization', `Bearer ${expired}`)
      .send({ title: 'Z' })
      .expect(401);
    expect(/expirad/i.test(res.body.message)).toBe(true);
  });

  test('403 papel inadequado (student tentando criar tema teacher-only)', async () => {
    const res = await request(app)
      .post('/themes')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Tema proibido' })
      .expect(403);
    expect(/acesso não autorizado/i.test(res.body.message)).toBe(true);
  });
});
