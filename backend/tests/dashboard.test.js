const request = require('supertest');

// Mock auth middleware to bypass authentication
jest.mock('../middleware/auth', () => () => (req, res, next) => next());

const { app } = require('../app');

describe('Dashboard routes', () => {
  it('GET /dashboard returns success', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

