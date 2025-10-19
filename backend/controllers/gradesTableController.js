const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const GradeActivity = require('../models/GradeActivity');
const StudentActivityGrade = require('../models/StudentActivityGrade');
const Student = require('../models/Student');
const Class = require('../models/Class');
const { resolveClassAccess } = require('../services/acl');

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

async function ensureClassAccess(classId, req) {
  const access = await resolveClassAccess(classId, req.user);
  if (!access.ok) {
    const error = new Error('Acesso restrito aos professores da turma.');
    error.status = access.reason === 'class-not-found' ? 404 : 403;
    throw error;
  }
  return access.classRef;
}

function parseYear(raw) {
  const now = new Date();
  const fallback = now.getFullYear();
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 2000 || parsed > 3000) {
    const error = new Error('Ano inválido.');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function parseBimesters(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return [1];
  }
  const tokens = Array.isArray(raw) ? raw : String(raw).split(',');
  const set = new Set();
  tokens.forEach((token) => {
    const trimmed = String(token).trim();
    if (!trimmed) return;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 4) {
      set.add(parsed);
    }
  });
  if (!set.size) {
    const error = new Error('Parâmetro de bimestres inválido.');
    error.status = 400;
    throw error;
  }
  return Array.from(set).sort((a, b) => a - b);
}

function sanitizeActivity(doc) {
  return {
    id: String(doc._id),
    classId: String(doc.classId),
    year: doc.year,
    bimester: doc.bimester,
    label: doc.label,
    value: Number(doc.value ?? 0),
    order: Number(doc.order ?? 0),
    active: Boolean(doc.active),
  };
}

async function loadTableData({ classId, year, bimesters }) {
  const [classDoc, students, activities] = await Promise.all([
    Class.findById(classId).select('name series letter discipline subject').lean(),
    Student.find({ class: classId }).select('_id name rollNumber').sort({ name: 1 }).lean(),
    GradeActivity.find({
      classId,
      year,
      bimester: { $in: bimesters },
      active: true,
    })
      .sort({ bimester: 1, order: 1, label: 1 })
      .lean(),
  ]);

  if (!classDoc) {
    const error = new Error('Turma não encontrada.');
    error.status = 404;
    throw error;
  }

  const activityIds = activities.map((activity) => activity._id);
  const grades = activityIds.length
    ? await StudentActivityGrade.find({
        classId,
        activityId: { $in: activityIds },
      })
        .select('studentId activityId points')
        .lean()
    : [];

  const gradeMap = new Map();
  grades.forEach((grade) => {
    const studentKey = String(grade.studentId);
    const activityKey = String(grade.activityId);
    const points = Number(grade.points ?? 0);
    if (!gradeMap.has(studentKey)) {
      gradeMap.set(studentKey, new Map());
    }
    gradeMap.get(studentKey).set(activityKey, points);
  });

  return {
    classDoc,
    students,
    activities: activities.map(sanitizeActivity),
    gradeMap,
  };
}

function buildDetailColumns(activities, bimester) {
  const columns = activities.map((activity) => ({
    key: `activity_${activity.id}`,
    title: activity.label,
    width: 120,
    meta: {
      type: 'activity',
      activityId: activity.id,
      bimester: activity.bimester,
      value: activity.value,
    },
  }));
  columns.push({
    key: `bimesterTotal_${bimester}`,
    title: 'Total do bimestre',
    width: 140,
    meta: {
      type: 'bimesterTotal',
      bimester,
    },
  });
  return columns;
}

function buildSummaryColumns(bimesters) {
  const columns = bimesters.map((bimester) => ({
    key: `bimester_${bimester}`,
    title: `${bimester}º bimestre`,
    width: 140,
    meta: {
      type: 'bimester',
      bimester,
    },
  }));
  columns.push({
    key: 'selectedSum',
    title: 'Soma selecionados',
    width: 160,
    meta: {
      type: 'selectedSum',
    },
  });
  return columns;
}

function buildRows({ students, activities, gradeMap, bimesters, mode }) {
  const rows = [];

  const activitiesByBimester = new Map();
  activities.forEach((activity) => {
    const list = activitiesByBimester.get(activity.bimester) || [];
    list.push(activity);
    activitiesByBimester.set(activity.bimester, list);
  });

  students.forEach((student) => {
    const studentKey = String(student._id);
    const studentGrades = gradeMap.get(studentKey) || new Map();
    const values = {};

    if (mode === 'detail') {
      const targetBimester = bimesters[0];
      const activitiesForBimester = activitiesByBimester.get(targetBimester) || [];
      let total = 0;
      activitiesForBimester.forEach((activity) => {
        const key = `activity_${activity.id}`;
        const points = Number(studentGrades.get(activity.id) ?? 0);
        values[key] = Number(points.toFixed(2));
        total += points;
      });
      values[`bimesterTotal_${targetBimester}`] = Number(total.toFixed(2));
    } else {
      let sumSelected = 0;
      bimesters.forEach((bimester) => {
        const activitiesForBimester = activitiesByBimester.get(bimester) || [];
        const total = activitiesForBimester.reduce((acc, activity) => {
          const points = Number(studentGrades.get(activity.id) ?? 0);
          return acc + points;
        }, 0);
        const key = `bimester_${bimester}`;
        values[key] = Number(total.toFixed(2));
        sumSelected += total;
      });
      values.selectedSum = Number(sumSelected.toFixed(2));
    }

    rows.push({
      studentId: studentKey,
      studentName: student.name,
      values,
    });
  });

  return rows;
}

function summarizeClass(classDoc) {
  if (!classDoc) return { name: 'Turma' };
  const name =
    classDoc.name ||
    [
      classDoc.series ? `${classDoc.series}º${classDoc.letter ?? ''}`.trim() : '',
      classDoc.discipline || classDoc.subject || '',
    ]
      .filter(Boolean)
      .join(' • ');
  return {
    id: String(classDoc._id),
    name: name || 'Turma',
  };
}

async function buildGradesTablePayload({ classId, year, bimesters }) {
  const { classDoc, students, activities, gradeMap } = await loadTableData({
    classId,
    year,
    bimesters,
  });

  const mode = bimesters.length === 1 ? 'detail' : 'summary';
  const columns =
    mode === 'detail'
      ? buildDetailColumns(
          activities.filter((activity) => activity.bimester === bimesters[0]),
          bimesters[0]
        )
      : buildSummaryColumns(bimesters);
  const rows = buildRows({
    students,
    activities,
    gradeMap,
    bimesters,
    mode,
  });

  return {
    classInfo: summarizeClass(classDoc),
    table: {
      columns,
      rows,
      meta: {
        year,
        bimesters,
        mode,
      },
    },
  };
}

exports.getGradesTable = async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    if (!classId) {
      const error = new Error('classId inválido.');
      error.status = 400;
      throw error;
    }
    await ensureClassAccess(classId, req);
    const year = parseYear(req.query.year);
    const bimesters = parseBimesters(req.query.bimesters);

    const payload = await buildGradesTablePayload({ classId, year, bimesters });

    res.json({
      success: true,
      data: payload.table,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao carregar tabela de notas.';
    }
    next(err);
  }
};

function renderHeader(doc, { classInfo, meta, page }) {
  const now = new Date();
  const headerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.fontSize(16).font('Helvetica-Bold').text(classInfo.name || 'Turma', {
    width: headerWidth,
  });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica');
  const leftText = `Ano letivo: ${meta.year}\nModo: ${meta.mode === 'detail' ? 'Detalhado' : 'Resumo'}\nBimestres: ${meta.bimesters.join(', ')}`;
  const rightText = `Emitido em: ${now.toLocaleDateString('pt-BR')}\nPágina ${page}`;
  const splitX = doc.page.margins.left + headerWidth * 0.6;
  const originalY = doc.y;
  doc.text(leftText, doc.page.margins.left, originalY, { width: headerWidth * 0.6 });
  doc.text(rightText, splitX, originalY, { width: headerWidth * 0.4, align: 'right' });
  const afterY = Math.max(doc.y, originalY + 36);
  doc.y = afterY + 6;
}

function drawTable(doc, table) {
  const gradeColumns = table.columns;
  const studentColumnWidth = 220;
  const availableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right - studentColumnWidth;
  const gradeColumnWidth =
    gradeColumns.length > 0 ? availableWidth / gradeColumns.length : availableWidth;
  const rowHeight = 24;
  let page = 1;
  let bottomLimit = doc.page.height - doc.page.margins.bottom - rowHeight;

  const refreshBottomLimit = () => {
    bottomLimit = doc.page.height - doc.page.margins.bottom - rowHeight;
  };

  const drawHeaderRow = () => {
    let x = doc.page.margins.left;
    doc.font('Helvetica-Bold').fontSize(11);
    doc.rect(x, doc.y, studentColumnWidth, rowHeight).fillAndStroke('#f1f5f9', '#cbd5f5');
    doc.fillColor('#0f172a').text('Aluno', x + 6, doc.y + 6, {
      width: studentColumnWidth - 12,
    });
    x += studentColumnWidth;
    gradeColumns.forEach((column) => {
      doc.rect(x, doc.y, gradeColumnWidth, rowHeight).fillAndStroke('#f1f5f9', '#cbd5f5');
      doc.fillColor('#0f172a').text(column.title, x + 6, doc.y + 6, {
        width: gradeColumnWidth - 12,
        align: 'center',
      });
      x += gradeColumnWidth;
    });
    doc.fillColor('#0f172a');
    doc.y += rowHeight;
  };

  const drawRow = (row) => {
    let x = doc.page.margins.left;
    doc.font('Helvetica').fontSize(10);
    doc.rect(x, doc.y, studentColumnWidth, rowHeight).stroke('#cbd5f5');
    doc.text(row.studentName, x + 6, doc.y + 6, {
      width: studentColumnWidth - 12,
    });
    x += studentColumnWidth;
    gradeColumns.forEach((column) => {
      doc.rect(x, doc.y, gradeColumnWidth, rowHeight).stroke('#e2e8f0');
      const value = row.values[column.key];
      const display =
        value === null || value === undefined ? '—' : Number(value).toFixed(2).replace('.', ',');
      doc.text(display, x, doc.y + 6, {
        width: gradeColumnWidth,
        align: 'center',
      });
      x += gradeColumnWidth;
    });
    doc.y += rowHeight;
  };

  drawHeaderRow();

  table.rows.forEach((row, index) => {
    if (doc.y > bottomLimit) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: doc.options.margin || 36 });
      page += 1;
      renderHeader(doc, { classInfo: table.classInfo, meta: table.meta, page });
      refreshBottomLimit();
      drawHeaderRow();
    }
    drawRow(row);
    if (index === table.rows.length - 1) {
      doc.moveDown(1);
    }
  });
}

exports.exportGradesTablePdf = async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    if (!classId) {
      const error = new Error('classId inválido.');
      error.status = 400;
      throw error;
    }
    await ensureClassAccess(classId, req);
    const year = parseYear(req.query.year);
    const bimesters = parseBimesters(req.query.bimesters);

    const payload = await buildGradesTablePayload({ classId, year, bimesters });
    const table = {
      ...payload.table,
      classInfo: payload.classInfo,
    };

    res.set('Content-Type', 'application/pdf');

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    doc.pipe(res);
    renderHeader(doc, {
      classInfo: table.classInfo,
      meta: table.meta,
      page: 1,
    });
    drawTable(doc, table);
    doc.end();
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao exportar tabela de notas.';
    }
    if (!res.headersSent) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};
