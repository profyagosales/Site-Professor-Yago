const request = require('supertest');
const { app } = require('../app');

describe('OMR routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/omr/grade');
    expect(res.status).toBe(401);
  });
});
