const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../app');

const registerTeacher = async () => {
  const res = await request(app)
    .post('/auth/register-teacher')
    .send({
      name: 'Teacher',
      email: `${Date.now()}@example.com`,
      password: 'secret'
    });
  return res.body.data.token;
};

describe('Students routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/students');
    expect(res.status).toBe(401);
  });

  it('validates classId query', async () => {
    const token = await registerTeacher();
    const res = await request(app)
      .get('/students')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('lists students for a class', async () => {
    const token = await registerTeacher();
    const classId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/students?classId=${classId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

