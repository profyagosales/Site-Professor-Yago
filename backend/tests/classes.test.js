const request = require('supertest');
const { app } = require('../app');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');

describe('Classes routes', () => {
  let teacherToken;
  const teacherPassword = 'secret123';

  beforeEach(async () => {
    const email = `prof-${Date.now()}@example.com`;
    await Teacher.create({ name: 'Professor Teste', email, password: teacherPassword });
    const login = await request(app).post('/auth/login-teacher').send({ email, password: teacherPassword });
    expect(login.status).toBe(200);
    teacherToken = login.body?.data?.token || login.body?.token;
    expect(typeof teacherToken).toBe('string');
  });

  it('creates a class with schedule', async () => {
    const res = await request(app)
      .post('/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
      series: 1,
      letter: 'A',
      discipline: 'Math',
      schedule: [{ day: 'SEGUNDA', slot: 2 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.series).toBe(1);
    expect(res.body.data.schedule).toHaveLength(1);
    expect(res.body.data.schedule[0]).toMatchObject({
      day: 'MONDAY',
      slot: 2,
      time: '09:00',
    });
    expect(Array.isArray(res.body.data.teachers)).toBe(true);
    expect(res.body.data.teachers.length).toBe(1);

    const cls = await Class.findOne({ series: 1, letter: 'A' });
    expect(cls).not.toBeNull();
    expect(cls.schedule[0]).toMatchObject({
      day: 'MONDAY',
      slot: 2,
      time: '09:00',
    });
    expect(Array.isArray(cls.teachers)).toBe(true);
    expect(cls.teachers.length).toBe(1);
  });

  it('validates schedule data', async () => {
    const res = await request(app)
      .post('/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
      series: 1,
      letter: 'B',
      discipline: 'Science',
      schedule: [{ day: 'x', slot: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it('lists classes', async () => {
    const res = await request(app).get('/classes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
