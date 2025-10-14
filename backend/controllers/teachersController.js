const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const { uploadSingleBuffer } = require('../utils/uploadHelpers');

function normalizeTeacher(doc) {
  if (!doc) return null;
  const teacher = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(teacher._id),
    name: teacher.name || '',
    email: teacher.email || '',
    phone: teacher.phone || null,
    photoUrl: teacher.photoUrl || null,
    role: teacher.role || 'teacher',
    createdAt: teacher.createdAt || null,
    updatedAt: teacher.updatedAt || null,
  };
}

function buildSearchFilter(query) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (!trimmed) return {};
  const safe = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    $or: [
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
    ],
  };
}

exports.list = async (req, res, next) => {
  try {
    const { query = '' } = req.query;
    const filter = buildSearchFilter(query);
    const teachers = await Teacher.find(filter).sort({ name: 1 }).lean();
    const data = teachers.map((teacher) => normalizeTeacher(teacher));
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

async function upsertPhoto(req) {
  const file = req.file;
  const incomingUrl = typeof req.body?.photoUrl === 'string' ? req.body.photoUrl.trim() : '';
  if (file) {
    const path = `teachers/photos/${Date.now()}`;
    return uploadSingleBuffer(file.buffer, path, file.mimetype);
  }
  if (incomingUrl) {
    return incomingUrl;
  }
  return null;
}

exports.create = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body || {};
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!trimmedName || !trimmedEmail || !rawPassword) {
      return res.status(400).json({ success: false, message: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const teacher = new Teacher({
      name: trimmedName,
      email: trimmedEmail.toLowerCase(),
      password: rawPassword,
      phone: typeof phone === 'string' && phone.trim() ? phone.trim() : undefined,
      role: 'teacher',
    });

    const photoUrl = await upsertPhoto(req);
    if (photoUrl) {
      teacher.photoUrl = photoUrl;
    }

    await teacher.save();

    return res.status(201).json({ success: true, data: normalizeTeacher(teacher) });
  } catch (err) {
    if (err?.message && /Upload de imagens indisponível/i.test(err.message)) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err && err.code === 11000) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado.' });
    }
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador inválido.' });
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Professor não encontrado.' });
    }

    const payload = req.body || {};
    if (typeof payload.name === 'string') {
      const nextName = payload.name.trim();
      if (!nextName) {
        return res.status(400).json({ success: false, message: 'Nome não pode ser vazio.' });
      }
      teacher.name = nextName;
    }
    if (typeof payload.email === 'string') {
      const nextEmail = payload.email.trim();
      if (!nextEmail) {
        return res.status(400).json({ success: false, message: 'E-mail não pode ser vazio.' });
      }
      teacher.email = nextEmail.toLowerCase();
    }
    if (typeof payload.phone === 'string') {
      teacher.phone = payload.phone.trim() || undefined;
    }
    if (payload.phone === null) {
      teacher.phone = undefined;
    }
    if (typeof payload.password === 'string' && payload.password.trim()) {
      teacher.password = payload.password.trim();
    }

    const photoUrl = await upsertPhoto(req);
    if (photoUrl) {
      teacher.photoUrl = photoUrl;
    }
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'removePhoto')) {
      const shouldRemove = payload.removePhoto === true || payload.removePhoto === 'true';
      if (shouldRemove) {
        teacher.photoUrl = undefined;
      }
    }

    await teacher.save();

    return res.json({ success: true, data: normalizeTeacher(teacher) });
  } catch (err) {
    if (err?.message && /Upload de imagens indisponível/i.test(err.message)) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err && err.code === 11000) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado.' });
    }
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador inválido.' });
    }

    const teacher = await Teacher.findByIdAndDelete(id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Professor não encontrado.' });
    }

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
};
