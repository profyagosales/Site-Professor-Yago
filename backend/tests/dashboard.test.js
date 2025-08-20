const request = require('supertest');
const { app } = require('../app');

describe('Dashboard routes', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/auth/register-teacher').send({
      name: 'Teacher',
      email: 'teacher@example.com',
      password: '123456',
      phone: '12345',
      subjects: ['Math']
    });
    token = res.body.data.token;
  });

  it('returns dashboard data for teacher', async () => {
    const res = await request(app)
      .get('/dashboard/teacher')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Dashboard do professor');
    expect(res.body.data).toHaveProperty('upcomingEvaluations');
    expect(res.body.data).toHaveProperty('schedule');
    expect(res.body.data).toHaveProperty('contentProgress');
  });
});
