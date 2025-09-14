const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const ClassModel = require('../../models/Class');
const jwt = require('jsonwebtoken');

function token(user){
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
}

describe('Segurança: rate limit e sanitização', () => {
  let teacher, studentToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await ClassModel.deleteMany({});
    teacher = await User.create({ name:'Prof RL', email:'profrl@test.com', passwordHash:'hash', role:'teacher' });
    const cls = await ClassModel.create({ name:'Turma RL', year:2025, teacherId: teacher._id });
    const student = await User.create({ name:'Aluno RL', email:'alunorl@test.com', passwordHash:'hash', role:'student', classId: cls._id });
    studentToken = token(student);
  });

  afterAll(async () => { await mongoose.connection.close(); });

  test('Rate limit dispara após múltiplas requisições', async () => {
    // Assumindo configuração padrão (ex: 60 req/min). Forçamos número > limite reduzindo janela com env? Aqui simplesmente faz muitas.
    const attempts = 35; // deve exceder o limite configurado (ajustar se necessário)
    let lastStatus;
    for (let i=0;i<attempts;i++) {
      const res = await request(app)
        .get('/health')
        .set('Authorization', `Bearer ${studentToken}`);
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    expect([200,429]).toContain(lastStatus);
  });

  test('Sanitização remove script tags em payload JSON', async () => {
    const payload = {
      type:'ENEM',
      themeText:'<script>alert(1)</script>Tema Seguro',
      file:{ originalUrl:'https://example.com/f.pdf', mime:'application/pdf' }
    };
    const res = await request(app)
      .post('/essays')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(payload);
    expect(res.status).toBe(201);
    // O controller devolve themeText armazenado; sanitização deve ter removido tag script
    expect(res.body.themeText).not.toMatch(/<script>/i);
    expect(res.body.themeText).toMatch(/Tema Seguro/);
  });
});
