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

router.get('/', async (req, res, next) => {
  try {
    const students = await Student.find().populate('class');
    res.status(200).json({
      success: true,
      message: 'Alunos obtidos com sucesso',
      data: students
    });
  } catch (err) {
    err.status = 500;
    err.message = 'Erro ao buscar alunos';
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).populate('class');
    if (!student) {
      const error = new Error('Aluno não encontrado');
      error.status = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      message: 'Aluno obtido com sucesso',
      data: student
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'ID inválido';
    }
    next(err);
  }
});

router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    const { class: classId, name, email, rollNumber, phone, password } = req.body;
    if (!classId || !name || !email || !rollNumber || !password) {
      const error = new Error('Dados obrigatórios ausentes');
      error.status = 400;
      throw error;
    }
    const studentData = { class: classId, name, email, rollNumber, phone, password };
    if (req.file) studentData.photo = req.file.filename;
    const newStudent = await Student.create(studentData);
    res.status(200).json({
      success: true,
      message: 'Aluno criado com sucesso',
      data: newStudent
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao criar aluno';
    }
    next(err);
  }
});

router.put('/:id', upload.single('photo'), async (req, res, next) => {
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
      const error = new Error('Nenhum dado fornecido para atualização');
      error.status = 400;
      throw error;
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      const error = new Error('Aluno não encontrado');
      error.status = 404;
      throw error;
    }

    if (classId !== undefined) student.class = classId;
    if (name !== undefined) student.name = name;
    if (email !== undefined) student.email = email;
    if (rollNumber !== undefined) student.rollNumber = rollNumber;
    if (phone !== undefined) student.phone = phone;
    if (password !== undefined) student.password = password;
    if (req.file) student.photo = req.file.filename;

    await student.save();
    res.status(200).json({
      success: true,
      message: 'Aluno atualizado com sucesso',
      data: student
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao atualizar aluno';
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    if (!deletedStudent) {
      const error = new Error('Aluno não encontrado');
      error.status = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      message: 'Aluno removido com sucesso',
      data: null
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'ID inválido';
    }
    next(err);
  }
});

module.exports = router;
