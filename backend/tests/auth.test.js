const request = require('supertest');
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
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();

    const teacher = await Teacher.findOne({ email: 'john@example.com' });
    expect(teacher).not.toBeNull();
  });
});
