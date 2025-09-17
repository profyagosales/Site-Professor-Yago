#!/usr/bin/env node
/**
 * Cria (ou atualiza) um professor específico com email e senha fornecidos via env ou hardcoded para setup rápido.
 * Uso:
 *   EMAIL=prof.yago.red@gmail.com PASSWORD=TR24339es node scripts/createSpecificTeacher.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');

async function run() {
  const email = process.env.EMAIL || 'prof.yago.red@gmail.com';
  const password = process.env.PASSWORD || 'TR24339es';
  const name = process.env.NAME || 'Professor Yago Sales';

  console.log('[seed-teacher] Iniciando com', { email, name, mongo: config.mongoUri ? 'ok' : 'faltando' });
  if (!config.mongoUri) {
    console.error('[seed-teacher] Mongo URI não configurada. Aborte.');
    process.exit(1);
  }
  await mongoose.connect(config.mongoUri);
  const passwordHash = await bcrypt.hash(password, 10);
  let user = await User.findOne({ email, role: 'teacher' });
  if (user) {
    user.name = name;
    user.passwordHash = passwordHash;
    await user.save();
    console.log('[seed-teacher] Professor atualizado:', user._id.toString());
  } else {
    user = await User.create({ email, name, role: 'teacher', passwordHash });
    console.log('[seed-teacher] Professor criado:', user._id.toString());
  }
  await mongoose.disconnect();
  console.log('[seed-teacher] Concluído');
}

run().catch(err => { console.error('[seed-teacher] Erro', err); process.exit(1); });
