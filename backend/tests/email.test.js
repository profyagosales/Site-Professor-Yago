const request = require('supertest');
const { app } = require('../app');

describe('Email routes', () => {
  it('validates recipients array', async () => {
    const res = await request(app).post('/email/send').send({
      to: 'not-array',
      subject: 'Test',
      html: '<p>Hi</p>'
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});
