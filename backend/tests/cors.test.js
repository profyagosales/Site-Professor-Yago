const request = require('supertest');
const { app } = require('../app');

describe('CORS configuration', () => {
  const allowedOrigin = 'http://localhost:5173';

  it('responds to preflight requests from allowed origins', async () => {
    const res = await request(app)
      .options('/')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('blocks requests from disallowed origins', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://example.com');

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/origem não permitida/);
  });
});

