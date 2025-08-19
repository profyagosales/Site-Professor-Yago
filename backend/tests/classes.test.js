const request = require('supertest');
const { app } = require('../app');
const Class = require('../models/Class');

describe('Classes routes', () => {
  it('creates a class', async () => {
    const res = await request(app).post('/classes').send({
      series: 1,
      letter: 'A',
      discipline: 'Math'
    });
    expect(res.status).toBe(201);
    expect(res.body.series).toBe(1);

    const cls = await Class.findOne({ series: 1, letter: 'A' });
    expect(cls).not.toBeNull();
  });

  it('lists classes', async () => {
    const res = await request(app).get('/classes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
