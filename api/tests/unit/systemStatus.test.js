const request = require('supertest');
const express = require('express');

// Mock models
jest.mock('../../models/AICorrectionSuggestion', () => ({
  countDocuments: jest.fn(async (q)=> {
    if (q && q.$or) return 5; // applied
    return 10; // total
  })
}));

// Mock mongoose connection state
jest.mock('mongoose', () => ({
  connection: { readyState: 1 }
}));

const { getSystemStatus } = require('../../controllers/systemController');

function buildApp(user){
  const app = express();
  app.get('/health/system/status', (req,res,next)=> {
    req.user = user; // injeta user
    return getSystemStatus(req,res,next);
  });
  return app;
}

describe('GET /health/system/status', () => {
  test('retorna snapshot básico com adoção e breaker', async () => {
    const app = buildApp({ role: 'teacher', _id: 't1' });
    const res = await request(app).get('/health/system/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dbConnected', true);
    expect(res.body.ai).toBeDefined();
    expect(res.body.ai.adoption.total).toBe(10);
    expect(res.body.ai.adoption.applied).toBe(5);
    expect(res.body.ai.adoption.rate).toBe(0.5);
  });
});
