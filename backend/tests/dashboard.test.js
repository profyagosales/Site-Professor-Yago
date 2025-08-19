const request = require('supertest');
const { app } = require('../app');

describe('Dashboard routes', () => {
  it('returns dashboard data', async () => {
    const res = await request(app).get('/dashboard/dashboard/teacher');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('upcomingEvaluations');
    expect(res.body.data).toHaveProperty('classSchedules');
    expect(res.body.data).toHaveProperty('contentProgress');
  });
});
