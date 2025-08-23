const request = require('supertest');
const { app } = require('../app');
const Class = require('../models/Class');

describe('Classes routes', () => {
  it('creates a class with schedule', async () => {
    const res = await request(app).post('/classes').send({
      series: 1,
      letter: 'A',
      discipline: 'Math',
      schedule: [{ day: 'SEGUNDA', slot: 2 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.series).toBe(1);
    expect(res.body.data.schedule).toHaveLength(1);

    const cls = await Class.findOne({ series: 1, letter: 'A' });
    expect(cls).not.toBeNull();
    expect(cls.schedule[0]).toMatchObject({ day: 'SEGUNDA', slot: 2 });
  });

  it('validates schedule data', async () => {
    const res = await request(app).post('/classes').send({
      series: 1,
      letter: 'B',
      discipline: 'Science',
      schedule: [{ day: 'x', slot: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it('lists classes', async () => {
    const res = await request(app).get('/classes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
