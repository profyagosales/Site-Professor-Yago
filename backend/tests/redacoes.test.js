const request = require('supertest');
const { app } = require('../app');

describe('Redacoes routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/redacoes/professor');
    expect(res.status).toBe(401);
  });
});
