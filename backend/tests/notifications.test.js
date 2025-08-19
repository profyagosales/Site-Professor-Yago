const request = require('supertest');
const { app } = require('../app');

describe('Notifications routes', () => {
  it('validates schedule data', async () => {
    const res = await request(app).post('/notifications/schedule').send({
      message: '',
      runAt: 'invalid',
      targets: []
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});
