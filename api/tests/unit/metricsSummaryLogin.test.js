const request = require('supertest');
const express = require('express');

// Mock auth middleware to inject teacher user
function mockAuth(req,res,next){ req.user = { role: 'teacher', _id: 't1' }; next(); }

// Mock models used in metricsController
jest.mock('../../models/User', () => ({ countDocuments: jest.fn(async (q)=> q.role==='student'? 3 : 0) }));
jest.mock('../../models/Class', () => ({ countDocuments: jest.fn(async ()=> 2) }));
jest.mock('../../models/Theme', () => ({ countDocuments: jest.fn(async ()=> 4) }));

jest.mock('../../models/Essay', () => ({
  aggregate: jest.fn(async (pipeline)=> {
    // Return empty aggregates for simplicity or based on pipeline
    if (pipeline && pipeline[0] && pipeline[0].$match && pipeline[0].$match.status) {
      return [];
    }
    if (pipeline && pipeline[0] && pipeline[0].$group) {
      return [];
    }
    return [];
  }),
  countDocuments: jest.fn()
}));

jest.mock('../../models/AICorrectionSuggestion', () => ({
  countDocuments: jest.fn(async ()=> 0),
  aggregate: jest.fn(async ()=> []),
  find: jest.fn(()=> ({ sort: ()=> ({ limit: ()=> ({ select: ()=> ({ lean: async ()=> [] }) }) }) }))
}));

// Import after mocks
const metricsController = require('../../controllers/metricsController');
const { metrics } = require('../../middleware/metrics');

function buildApp(){
  const app = express();
  app.use(express.json());
  app.get('/metrics/summary', mockAuth, (req,res,next)=> metricsController.getSummary(req,res,next));
  return app;
}

describe('GET /metrics/summary login block', () => {
  test('inclui bloco login com taxas', async () => {
    metrics.login_teacher_success_total = 5;
    metrics.login_teacher_unauthorized_total = 3;
    metrics.login_teacher_unavailable_total = 2;
    metrics.login_student_success_total = 10;
    metrics.login_student_unauthorized_total = 0;
    metrics.login_student_unavailable_total = 0;
    const app = buildApp();
    const res = await request(app).get('/metrics/summary');
    expect(res.status).toBe(200);
    expect(res.body.login).toBeDefined();
    expect(res.body.login.teacher.total).toBe(10);
    expect(res.body.login.teacher.successRate).toBeCloseTo(0.5, 2);
    expect(res.body.login.student.successRate).toBe(1);
  });
});
