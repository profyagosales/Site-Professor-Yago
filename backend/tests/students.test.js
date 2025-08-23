const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../app');

const registerTeacher = async () => {
  const res = await request(app)
    .post('/auth/register-teacher')
    .send({
      name: 'Teacher',
      email: `${Date.now()}@example.com`,
      password: 'secret',
    });
  return res.body.data.token;
};

describe('Class students routes', () => {
  it('lists students for a class', async () => {
    const token = await registerTeacher();
    const classId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('creates a student in class', async () => {
    const token = await registerTeacher();
    const classRes = await request(app).post('/classes').send({
      series: 1,
      letter: 'A',
      discipline: 'Math',
    });
    const classId = classRes.body.data._id;
    const res = await request(app)
      .post(`/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .field('number', '1')
      .field('name', 'Alice')
      .field('email', `${Date.now()}@example.com`)
      .field('password', 'secret');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Alice');
  });

  it('returns 410 for deprecated /students route', async () => {
    const token = await registerTeacher();
    const res = await request(app)
      .get('/students')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
  });
});

