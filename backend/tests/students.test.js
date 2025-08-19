const request = require('supertest');
const { app } = require('../app');

describe('Students routes', () => {
  it('lists students', async () => {
    const res = await request(app).get('/students');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
