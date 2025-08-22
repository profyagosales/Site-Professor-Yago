const request = require('supertest');
const { app } = require('../app');

describe('Notifications routes', () => {
  it('validates notification data', async () => {
    const res = await request(app).post('/notifications').send({
      message: '',
      sendAt: 'invalid',
      classIds: [],
      emails: []
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});
