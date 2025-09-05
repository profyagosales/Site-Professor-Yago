const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

// Importar modelos
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Evaluation = require('../models/Evaluation');
const Gabarito = require('../models/Gabarito');
const Essay = require('../models/Essay');
const EssayTheme = require('../models/EssayTheme');
const Announcement = require('../models/Announcement');
const Content = require('../models/Content');
const CadernoCheck = require('../models/CadernoCheck');

// Configuração do banco
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/site-professor-yago-dev';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

async function clearDatabase() {
  console.log('🧹 Limpando banco de dados...');
  
  await Teacher.deleteMany({});
  await Class.deleteMany({});
  await Student.deleteMany({});
  await Evaluation.deleteMany({});
  await Gabarito.deleteMany({});
  await Essay.deleteMany({});
  await EssayTheme.deleteMany({});
  await Announcement.deleteMany({});
  await Content.deleteMany({});
  await CadernoCheck.deleteMany({});
  
  console.log('✅ Banco limpo');
}

async function createTeacher() {
  console.log('👨‍🏫 Criando professor...');
  
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const teacher = new Teacher({
    name: 'Professor Yago Sales',
    email: 'professor@yagosales.com',
    password: hashedPassword,
    role: 'teacher',
    isActive: true
  });
  
  await teacher.save();
  console.log('✅ Professor criado:', teacher.email);
  return teacher;
}

async function createClasses(teacherId) {
  console.log('🏫 Criando turmas...');
  
  const classes = [
    {
      series: 3,
      letter: 'A',
      discipline: 'Redação',
      teacherId,
      studentCount: 5
    },
    {
      series: 3,
      letter: 'B',
      discipline: 'Literatura',
      teacherId,
      studentCount: 4
    }
  ];
  
  const createdClasses = [];
  for (const classData of classes) {
    const classObj = new Class(classData);
    await classObj.save();
    createdClasses.push(classObj);
    console.log(`✅ Turma criada: ${classObj.series}º ${classObj.letter} - ${classObj.discipline}`);
  }
  
  return createdClasses;
}

async function createStudents(classes) {
  console.log('👨‍🎓 Criando alunos...');
  
  const students = [
    { name: 'Ana Silva', email: 'ana.silva@email.com' },
    { name: 'Bruno Santos', email: 'bruno.santos@email.com' },
    { name: 'Carlos Oliveira', email: 'carlos.oliveira@email.com' },
    { name: 'Diana Costa', email: 'diana.costa@email.com' },
    { name: 'Eduardo Lima', email: 'eduardo.lima@email.com' },
    { name: 'Fernanda Rocha', email: 'fernanda.rocha@email.com' },
    { name: 'Gabriel Alves', email: 'gabriel.alves@email.com' },
    { name: 'Helena Pereira', email: 'helena.pereira@email.com' },
    { name: 'Igor Martins', email: 'igor.martins@email.com' },
    { name: 'Julia Ferreira', email: 'julia.ferreira@email.com' }
  ];
  
  const createdStudents = [];
  for (let i = 0; i < students.length; i++) {
    const studentData = students[i];
    const classIndex = i < 5 ? 0 : 1; // Primeiros 5 na turma A, outros na B
    
    const student = new Student({
      ...studentData,
      class: classes[classIndex]._id,
      passwordHash: await bcrypt.hash('123456', 10)
    });
    
    await student.save();
    createdStudents.push(student);
    console.log(`✅ Aluno criado: ${student.name} (${classes[classIndex].series}º ${classes[classIndex].letter})`);
  }
  
  return createdStudents;
}

async function createEvaluations(classes) {
  console.log('📝 Criando avaliações...');
  
  const evaluations = [
    {
      name: 'Prova Objetiva - 1º Bimestre',
      value: 10.0,
      bimester: 1,
      kind: 'objective',
      classes: [{
        classId: classes[0]._id,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias no futuro
      }]
    }
  ];
  
  const createdEvaluations = [];
  for (const evalData of evaluations) {
    const evaluation = new Evaluation(evalData);
    await evaluation.save();
    createdEvaluations.push(evaluation);
    console.log(`✅ Avaliação criada: ${evaluation.name}`);
  }
  
  return createdEvaluations;
}

async function createGabaritos() {
  console.log('📋 Pulando criação de gabaritos (requer campos obrigatórios)...');
  return [];
}

async function createEssayThemes() {
  console.log('📚 Criando temas de redação...');
  
  const themes = [
    {
      name: 'Desafios da educação no Brasil contemporâneo',
      type: 'ENEM',
      isActive: true
    },
    {
      name: 'O papel da tecnologia na sociedade moderna',
      type: 'ENEM',
      isActive: true
    },
    {
      name: 'Sustentabilidade e meio ambiente',
      type: 'PAS',
      isActive: true
    }
  ];
  
  const createdThemes = [];
  for (const themeData of themes) {
    const theme = new EssayTheme(themeData);
    await theme.save();
    createdThemes.push(theme);
    console.log(`✅ Tema criado: ${theme.name}`);
  }
  
  return createdThemes;
}

async function createEssays(students, themes) {
  console.log('📄 Criando redações...');
  
  const essays = [
    {
      studentId: students[0]._id,
      classId: students[0].class,
      type: 'ENEM',
      themeId: themes[0]._id,
      bimester: 1,
      originalUrl: 'https://example.com/redacao1.pdf',
      status: 'PENDING'
    },
    {
      studentId: students[1]._id,
      classId: students[1].class,
      type: 'ENEM',
      themeId: themes[1]._id,
      bimester: 1,
      originalUrl: 'https://example.com/redacao2.pdf',
      correctedUrl: 'https://example.com/redacao2_corrigida.pdf',
      status: 'GRADED',
      rawScore: 8.5,
      scaledScore: 8.5,
      comments: 'Boa estrutura, mas precisa melhorar a argumentação.'
    }
  ];
  
  const createdEssays = [];
  for (const essayData of essays) {
    const essay = new Essay(essayData);
    await essay.save();
    createdEssays.push(essay);
    console.log(`✅ Redação criada: ${essay.status} - ${students.find(s => s._id.equals(essay.studentId))?.name}`);
  }
  
  return createdEssays;
}

async function createAnnouncements(teacherId, classes) {
  console.log('📢 Criando avisos...');
  
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const announcements = [
    {
      title: 'Aviso Imediato',
      message: 'Lembrem-se de trazer o material para a próxima aula.',
      teacherId,
      classIds: [classes[0]._id],
      publishAt: now,
      status: 'published',
      priority: 'normal'
    },
    {
      title: 'Prova Agendada',
      message: 'A prova do 1º bimestre será na próxima semana. Estudem!',
      teacherId,
      classIds: [classes[0]._id, classes[1]._id],
      publishAt: tomorrow,
      status: 'scheduled',
      priority: 'high'
    },
    {
      title: 'Feriado',
      message: 'Não haverá aula na próxima sexta-feira devido ao feriado.',
      teacherId,
      classIds: [classes[0]._id, classes[1]._id],
      publishAt: nextWeek,
      status: 'scheduled',
      priority: 'normal'
    }
  ];
  
  const createdAnnouncements = [];
  for (const announcementData of announcements) {
    const announcement = new Announcement(announcementData);
    await announcement.save();
    createdAnnouncements.push(announcement);
    console.log(`✅ Aviso criado: ${announcement.title} (${announcement.status})`);
  }
  
  return createdAnnouncements;
}

async function createContents(classes, teacherId) {
  console.log('📖 Criando conteúdos...');
  
  const now = new Date();
  const futureDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  const contents = [
    {
      title: 'Introdução à Redação Dissertativa',
      description: 'Conceitos básicos e estrutura do texto dissertativo',
      classId: classes[0]._id,
      teacher: teacherId,
      bimester: 1,
      date: futureDate
    },
    {
      title: 'Literatura Brasileira - Romantismo',
      description: 'Características e principais autores do período romântico',
      classId: classes[1]._id,
      teacher: teacherId,
      bimester: 1,
      date: futureDate
    }
  ];
  
  const createdContents = [];
  for (const contentData of contents) {
    const content = new Content(contentData);
    await content.save();
    createdContents.push(content);
    console.log(`✅ Conteúdo criado: ${content.title}`);
  }
  
  return createdContents;
}

async function createDiaryEntries(students, classes) {
  console.log('📅 Criando registros de caderno...');
  
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  const dates = [twoDaysAgo, yesterday, today];
  
  for (const date of dates) {
    for (const student of students) {
      const entry = new CadernoCheck({
        class: student.class,
        date: date,
        title: `Aula sobre ${date === today ? 'redação dissertativa' : 'literatura brasileira'}`,
        term: 1,
        presentStudentIds: Math.random() > 0.2 ? [student._id] : [] // 80% de presença
      });
      
      await entry.save();
    }
    console.log(`✅ Registros de caderno criados para ${date.toISOString().split('T')[0]}`);
  }
}

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de desenvolvimento...');
    
    await connectDB();
    await clearDatabase();
    
    const teacher = await createTeacher();
    const classes = await createClasses(teacher._id);
    const students = await createStudents(classes);
    const evaluations = await createEvaluations(classes);
    const gabaritos = await createGabaritos();
    const themes = await createEssayThemes();
    const essays = await createEssays(students, themes);
    const announcements = await createAnnouncements(teacher._id, classes);
    const contents = await createContents(classes, teacher._id);
    await createDiaryEntries(students, classes);
    
    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('\n📊 Resumo dos dados criados:');
    console.log(`👨‍🏫 Professor: ${teacher.email} (senha: 123456)`);
    console.log(`🏫 Turmas: ${classes.length}`);
    console.log(`👨‍🎓 Alunos: ${students.length}`);
    console.log(`📝 Avaliações: ${evaluations.length}`);
    console.log(`📋 Gabaritos: ${gabaritos.length}`);
    console.log(`📚 Temas: ${themes.length}`);
    console.log(`📄 Redações: ${essays.length}`);
    console.log(`📢 Avisos: ${announcements.length}`);
    console.log(`📖 Conteúdos: ${contents.length}`);
    console.log('\n🔑 Credenciais de teste:');
    console.log('Professor: professor@yagosales.com / 123456');
    console.log('Alunos: [nome]@email.com / 123456');
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
