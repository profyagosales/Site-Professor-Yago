#!/usr/bin/env node

const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');

const TEACHER_EMAIL = 'yago@exemplo.com';
const STUDENT_EMAIL = 'vinicius.yago@gmail.com';
const DEFAULT_PASSWORD = '123456';

async function connect() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[seed] MONGO_URI não definido. Abortei o seed.');
    process.exit(1);
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30_000,
  });
}

async function ensureClass() {
  const existing = await Class.findOne({});
  if (existing) {
    return existing;
  }
  const placeholder = new Class({
    name: '1A',
    series: 1,
    letter: 'A',
    discipline: 'Geral',
    subject: 'Geral',
  });
  await placeholder.save();
  return placeholder;
}

async function upsertTeacher() {
  const password = DEFAULT_PASSWORD;
  const passwordHash = await Teacher.hashPassword(password);
  let teacher = await Teacher.findOne({ email: TEACHER_EMAIL }).select('+passwordHash +password');
  if (!teacher) {
    teacher = new Teacher({
      name: 'Professor Seed',
      email: TEACHER_EMAIL,
      passwordHash,
      subjects: ['Seed'],
    });
  } else {
    teacher.passwordHash = passwordHash;
    if (!teacher.name) {
      teacher.name = 'Professor Seed';
    }
    if (!Array.isArray(teacher.subjects) || teacher.subjects.length === 0) {
      teacher.subjects = ['Seed'];
    }
  }
  teacher.password = undefined;
  await teacher.save();
  return teacher;
}

async function upsertStudent(defaultClass) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  let student = await Student.findOne({ email: STUDENT_EMAIL }).select('+passwordHash');
  if (!student) {
    student = new Student({
      name: 'Aluno Seed',
      email: STUDENT_EMAIL,
      class: defaultClass._id,
      passwordHash,
    });
  } else {
    student.passwordHash = passwordHash;
    if (!student.name) {
      student.name = 'Aluno Seed';
    }
    if (!student.class) {
      student.class = defaultClass._id;
    }
  }
  await student.save();
  return student;
}

async function main() {
  try {
    await connect();
    const klass = await ensureClass();
    const teacher = await upsertTeacher();
    const student = await upsertStudent(klass);

    console.log('[seed] teacher', { _id: teacher._id, email: teacher.email });
    console.log('[seed] student', { _id: student._id, email: student.email });
  } catch (err) {
    console.error('[seed] Falha ao executar seedUsers:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();
