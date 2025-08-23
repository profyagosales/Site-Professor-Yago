const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../app');
const Teacher = require('../models/Teacher');

describe('Auth routes', () => {
  it('registers a teacher', async () => {
    const res = await request(app).post('/auth/register-teacher').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: '123456',
      phone: '12345',
      subjects: ['Math']
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();

    const teacher = await Teacher.findOne({ email: 'john@example.com' });
    expect(teacher).not.toBeNull();
  });

  it('logs in a student with email and password', async () => {
    const classId = new mongoose.Types.ObjectId().toString();
    const email = `${Date.now()}@example.com`;
    const password = 'secret123';
    await request(app)
      .post('/auth/register-student')
      .send({
        class: classId,
        name: 'Student',
        email,
        rollNumber: 1,
        password,
      });
    const res = await request(app)
      .post('/auth/login-student')
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.student.email).toBe(email);
  });
});
