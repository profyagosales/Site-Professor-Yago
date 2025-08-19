const request = require('supertest');
const { app } = require('../app');

describe('Dashboard routes', () => {
  it('returns dashboard data', async () => {
    const res = await request(app).get('/dashboard/dashboard/teacher');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('upcomingEvaluations');
    expect(res.body).toHaveProperty('classSchedules');
    expect(res.body).toHaveProperty('contentProgress');
  });
});
