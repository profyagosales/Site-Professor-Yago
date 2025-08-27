const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../app');
const Class = require('../models/Class');
const Student = require('../models/Student');

const registerTeacher = async () => {
  const res = await request(app)
    .post('/auth/register-teacher')
    .send({ name: 'Teacher Upl', email: `${Date.now()}-upl@example.com`, password: 'secret' });
  return res.body.data.token;
};

describe('Uploads: POST /uploads/essay', () => {
  it('creates essay with direct URL when Cloudinary is not configured', async () => {
    const token = await registerTeacher();
    const cls = await Class.create({ series: 1, letter: 'B', discipline: 'Português' });
    const stu = await Student.create({
      name: 'Aluno Upload',
      email: `${Date.now()}-aluno@example.com`,
      rollNumber: 1,
      password: 'secret',
      class: cls._id,
    });

    const res = await request(app)
      .post('/uploads/essay')
      .set('Authorization', `Bearer ${token}`)
      .field('studentId', String(stu._id))
      .field('classId', String(cls._id))
      .field('topic', 'Tema de Teste')
      .field('type', 'PAS')
      .field('bimester', '1')
      .field('fileUrl', 'https://example.com/arquivo.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeTruthy();
    expect(res.body.data.studentId).toBe(String(stu._id));
    expect(res.body.data.classId).toBe(String(cls._id));
    expect(res.body.data.customTheme).toBe('Tema de Teste');
    expect(res.body.data.originalUrl).toBe('https://example.com/arquivo.pdf');
  });
});
