const request = require('supertest');
const { app } = require('../app');

describe('Evaluations routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/evaluations').send({});
    expect(res.status).toBe(401);
  });
});
