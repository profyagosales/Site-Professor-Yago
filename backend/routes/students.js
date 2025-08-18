const express = require('express');
const multer = require('multer');
const path = require('path');
const Student = require('../models/Student');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const students = await Student.find().populate('class');
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('class');
    if (!student) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { class: classId, name, email, rollNumber, phone, password } = req.body;
    if (!classId || !name || !email || !rollNumber || !password) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    }
    const studentData = { class: classId, name, email, rollNumber, phone, password };
    if (req.file) studentData.photo = req.file.filename;
    const newStudent = await Student.create(studentData);
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar aluno' });
  }
});

router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { class: classId, name, email, rollNumber, phone, password } = req.body;
    if (
      classId === undefined &&
      name === undefined &&
      email === undefined &&
      rollNumber === undefined &&
      phone === undefined &&
      password === undefined &&
      !req.file
    ) {
      return res.status(400).json({ error: 'Nenhum dado fornecido para atualização' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Aluno não encontrado' });

    if (classId !== undefined) student.class = classId;
    if (name !== undefined) student.name = name;
    if (email !== undefined) student.email = email;
    if (rollNumber !== undefined) student.rollNumber = rollNumber;
    if (phone !== undefined) student.phone = phone;
    if (password !== undefined) student.password = password;
    if (req.file) student.photo = req.file.filename;

    await student.save();
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar aluno' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    if (!deletedStudent) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.json({ message: 'Aluno removido' });
  } catch (err) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

module.exports = router;
