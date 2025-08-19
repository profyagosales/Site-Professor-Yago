const request = require('supertest');
const { app } = require('../app');

describe('Gabaritos routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/gabaritos').send({});
    expect(res.status).toBe(401);
  });
});
