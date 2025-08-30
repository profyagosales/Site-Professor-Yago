const request = require('supertest');
const { app } = require('../app');

describe('CORS configuration', () => {
  const allowedOrigin = 'https://professoryagosales.com.br';

  it('responds to preflight requests from allowed origins', async () => {
    const res = await request(app)
      .options('/')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'HEAD')
      .set('Access-Control-Request-Headers', 'Authorization');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-headers']).toMatch(/Authorization/);
  });

  it('blocks requests from disallowed origins', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://example.com');

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/origem não permitida/);
  });
});

