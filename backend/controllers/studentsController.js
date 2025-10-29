const Student = require('../models/Student');
const Essay = require('../models/Essay');

async function search(req, res) {
  const { q, classId, page = 1, pageSize = 10 } = req.query;
  const filter = {};
  if (classId) filter.class = classId;
  if (q) filter.name = { $regex: q, $options: 'i' };
  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, total] = await Promise.all([
    Student.find(filter).skip(skip).limit(Number(pageSize)).select('name email class photo'),
    Student.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), pageSize: Number(pageSize), total });
}

async function getOne(req, res) {
  const { id } = req.params;
  const student = await Student.findById(id).select('name email class photo');
  if (!student) return res.status(404).json({ message: 'Aluno não encontrado' });
  const totalEssays = await Essay.countDocuments({ studentId: id });
  const graded = await Essay.aggregate([
    { $match: { studentId: student._id, status: 'ready' } },
    { $group: { _id: null, avg: { $avg: '$rawScore' } } },
  ]);
  res.json({
    student,
    stats: {
      totalEssays,
      averageScore: graded[0]?.avg ?? null,
    },
  });
}

async function getEssays(req, res) {
  const { id } = req.params;
  const { status, page = 1, pageSize = 10 } = req.query;
  const filter = { studentId: id };
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
  if (normalizedStatus === 'pending') filter.status = 'pending';
  if (normalizedStatus === 'processing') filter.status = 'processing';
  if (normalizedStatus === 'ready' || normalizedStatus === 'corrected') filter.status = 'ready';
  if (normalizedStatus === 'failed') filter.status = 'failed';
  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, total] = await Promise.all([
    Essay.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(Number(pageSize)),
    Essay.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), pageSize: Number(pageSize), total });
}

module.exports = { search, getOne, getEssays };
