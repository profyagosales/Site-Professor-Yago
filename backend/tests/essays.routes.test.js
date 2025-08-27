jest.mock('../services/emailService', () => ({ sendEmail: jest.fn().mockResolvedValue() }));
jest.mock('../services/gradesIntegration', () => ({ recordEssayScore: jest.fn().mockResolvedValue() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../app');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const { sendEmail } = require('../services/emailService');
const { recordEssayScore } = require('../services/gradesIntegration');

let teacherToken;
let studentToken;
let classId;

beforeEach(async () => {
  const teacher = await Teacher.create({ name: 'Prof', email: 'prof@example.com', password: '123456' });
  const classDoc = await Class.create({ series: 1, letter: 'A', discipline: 'Port', teachers: [teacher._id] });
  const student = await Student.create({
    name: 'Aluno',
    email: 'aluno@example.com',
    passwordHash: await bcrypt.hash('123456', 10),
    class: classDoc._id,
  });
  teacherToken = jwt.sign({ id: teacher._id }, process.env.JWT_SECRET);
  studentToken = jwt.sign({ id: student._id }, process.env.JWT_SECRET);
  classId = classDoc._id;
  sendEmail.mockClear();
  recordEssayScore.mockClear();
});

describe('Essays flow', () => {
  it('creates theme and essay, annotations, grades', async () => {
    // create theme
    const themeRes = await request(app)
      .post('/essays/themes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Tema ENEM', type: 'ENEM' });
    expect(themeRes.status).toBe(201);
    expect(themeRes.body.type).toBe('ENEM');
    const themeId = themeRes.body._id;

    // create ENEM essay
    const enemEssayRes = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('type', 'ENEM')
      .field('bimester', '1')
      .field('customTheme', 'Livre')
      .attach('file', Buffer.from('pdf'), 'file.pdf');
    expect(enemEssayRes.status).toBe(201);
    expect(enemEssayRes.body.status).toBe('PENDING');
    const enemEssayId = enemEssayRes.body._id;

    // create PAS essay
    const pasEssayRes = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('type', 'PAS')
      .field('bimester', '1')
      .field('customTheme', 'Tema PAS')
      .attach('file', Buffer.from('pdf'), 'file.pdf');
    const pasEssayId = pasEssayRes.body._id;

    // annotations with 3 greens
    const annotations = [
      { color: 'green', label: 'a', comment: 'c' },
      { color: 'green', label: 'a', comment: 'c' },
      { color: 'green', label: 'a', comment: 'c' },
      { color: 'yellow', label: 'a', comment: 'c' },
      { color: 'blue', label: 'a', comment: 'c' }
    ];
    const annRes = await request(app)
      .patch(`/essays/${pasEssayId}/annotations`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ annotations });
    expect(annRes.status).toBe(200);
    expect(annRes.body.pasBreakdown.NE).toBe(3);

    // grade ENEM essay
    const gradeEnem = await request(app)
      .patch(`/essays/${enemEssayId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        bimestreWeight: 1,
        enemCompetencies: { c1: 200, c2: 160, c3: 160, c4: 160, c5: 120 }
      });
    expect(gradeEnem.body.rawScore).toBe(800);
    expect(gradeEnem.body.scaledScore).toBe(0.8);
    expect(recordEssayScore).toHaveBeenCalledWith(expect.objectContaining({ points: 0.8, maxPoints: 1 }));

    // grade PAS essay
    const gradePas = await request(app)
      .patch(`/essays/${pasEssayId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        bimestreWeight: 1.5,
        pasBreakdown: { NC: 7.5, NE: 0, NL: 30 }
      });
    expect(gradePas.body.rawScore).toBe(7.3);
    expect(gradePas.body.scaledScore).toBe(1.1);

    // annulment
    const annulEssayRes = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('type', 'ENEM')
      .field('bimester', '1')
      .field('customTheme', 'Anular')
      .attach('file', Buffer.from('pdf'), 'file.pdf');
    const annulId = annulEssayRes.body._id;
    const annulGrade = await request(app)
      .patch(`/essays/${annulId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ bimestreWeight: 2, annulmentReason: 'IDENTIFICACAO' });
    expect(annulGrade.body.rawScore).toBe(0);
    expect(annulGrade.body.scaledScore).toBe(0);
  });

  it('updates and returns richAnnotations', async () => {
    // cria redação rápida
    const resCreate = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('type', 'PAS')
      .field('bimester', '1')
      .field('customTheme', 'Tema Rich')
      .attach('file', Buffer.from('pdf'), 'file.pdf');
    expect(resCreate.statusCode).toBe(201);
    const id = resCreate.body._id;

    const rich = [
      { id: '1', page: 1, type: 'highlight', rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }], opacity: 0.3, color: '#ffff00', createdAt: new Date().toISOString() },
      { id: '2', page: 2, type: 'comment', at: { x: 0.5, y: 0.5 }, text: 'ok', createdAt: new Date().toISOString() }
    ];
    const resPatch = await request(app)
      .patch(`/essays/${id}/annotations`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ annotations: [], richAnnotations: rich });
    expect(resPatch.statusCode).toBe(200);
    expect(Array.isArray(resPatch.body.richAnnotations)).toBe(true);
    expect(resPatch.body.richAnnotations.length).toBe(2);

    const resGet = await request(app)
      .get(`/redacoes/${id}`)
      .set('Authorization', `Bearer ${teacherToken}`);
  expect(resGet.statusCode).toBe(200);
  expect(Array.isArray(resGet.body?.data?.richAnnotations)).toBe(true);
  });
});
