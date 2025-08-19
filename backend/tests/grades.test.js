const request = require('supertest');
const { app } = require('../app');

describe('Grades routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/grades/class/123');
    expect(res.status).toBe(401);
  });
});
