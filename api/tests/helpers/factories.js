const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const ClassModel = require('../../models/Class');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_tests';

async function createTeacher(overrides = {}) {
  const teacher = await User.create({
    name: overrides.name || 'Professor Teste',
    email: overrides.email || `teacher_${Date.now()}_${Math.random()}@test.com`,
    passwordHash: '$2a$10$Qj0fZavr3A6l0uYg5OtTSud0Jx8N3E5sVhXlBx/6CkXbkqVKgf/m6', // hash de 'senha123'
    role: 'teacher',
    ...overrides
  });
  return teacher;
}

async function createClass(teacher, overrides = {}) {
  const cls = await ClassModel.create({
    name: overrides.name || `Turma ${Math.floor(Math.random()*10000)}`,
    year: overrides.year || new Date().getFullYear(),
    teacherId: teacher._id,
    school: overrides.school || 'Escola Teste',
    ...overrides
  });
  return cls;
}

async function createStudent(cls, overrides = {}) {
  const student = await User.create({
    name: overrides.name || 'Aluno Teste',
    email: overrides.email || `student_${Date.now()}_${Math.random()}@test.com`,
    passwordHash: '$2a$10$Qj0fZavr3A6l0uYg5OtTSud0Jx8N3E5sVhXlBx/6CkXbkqVKgf/m6',
    role: 'student',
    classId: cls._id,
    ...overrides
  });
  return student;
}

function generateToken(user, expiresIn = '1h') {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn });
}

module.exports = { createTeacher, createClass, createStudent, generateToken };
