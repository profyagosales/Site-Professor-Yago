const request = require('supertest');
const { app } = require('../app');

describe('Essays routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/essays');
    expect(res.status).toBe(401);
  });
});
