const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Theme = require('../../models/Theme');
const { createTeacher, generateToken } = require('../helpers/factories');

function bearer(token){ return { Authorization: `Bearer ${token}` }; }

describe('Themes integration', () => {
  let teacher; let token;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    teacher = await createTeacher();
    token = generateToken(teacher);
  });

  afterEach(async () => { await Theme.deleteMany({}); });

  afterAll(async () => { await mongoose.connection.close(); });

  test('cria tema ativo e lista', async () => {
    const createRes = await request(app)
      .post('/themes')
      .set(bearer(token))
      .send({ title: 'Tema 1' })
      .expect(201);
    expect(createRes.body.title).toBe('Tema 1');
    expect(createRes.body.active).toBe(true);

    const listRes = await request(app)
      .get('/themes')
      .set(bearer(token))
      .expect(200);
    expect(Array.isArray(listRes.body.themes)).toBe(true);
    expect(listRes.body.themes.length).toBe(1);
    expect(listRes.body.pagination.total).toBe(1);
  });

  test('arquiva tema e deixa de aparecer em listagem default', async () => {
    const { body: created } = await request(app).post('/themes').set(bearer(token)).send({ title: 'Tema 2' });
    await request(app)
      .post(`/themes/${created._id}/archive`)
      .set(bearer(token))
      .expect(200);

  // Por padrão, rota lista todos (sem filtro). Vamos filtrar explicitamente ativos.
  const listActive = await request(app).get('/themes?active=true').set(bearer(token));
  expect(listActive.body.themes.length).toBe(0);

  const listArchived = await request(app).get('/themes?active=false').set(bearer(token));
  expect(listArchived.body.themes.length).toBe(1);

    const dbTheme = await Theme.findById(created._id);
    expect(dbTheme.active).toBe(false);
  });

  test('falha ao criar sem título', async () => {
    const res = await request(app)
      .post('/themes')
      .set(bearer(token))
      .send({ })
      .expect(400);
    expect(res.body.message).toMatch(/título/i);
  });

  test('requer auth para criar', async () => {
    await request(app)
      .post('/themes')
      .send({ title: 'Sem auth' })
      .expect(401);
  });
});
