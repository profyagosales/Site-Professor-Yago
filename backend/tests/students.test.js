const request = require('supertest');
const { app } = require('../app');

describe('Students routes', () => {
  it('lists students', async () => {
    const res = await request(app).get('/students');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
