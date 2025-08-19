const request = require('supertest');
const { app } = require('../app');

describe('Caderno routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/caderno').send({});
    expect(res.status).toBe(401);
  });
});
