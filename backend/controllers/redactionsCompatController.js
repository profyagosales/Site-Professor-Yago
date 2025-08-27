const Essay = require('../models/Essay');
const EssayTheme = require('../models/EssayTheme');
const Student = require('../models/Student');
const Class = require('../models/Class');
const { sendEmail } = require('../services/emailService');
const { renderCorrection } = require('./essaysController');

async function getEssayById(req, res, next) {
  try {
    const { id } = req.params;
  const essay = await Essay.findById(id)
      .populate('studentId', 'name photo rollNumber email')
      .populate('classId', 'series letter discipline');
    if (!essay) return res.status(404).json({ success: false, message: 'Redação não encontrada' });
    // Backfill originalMimeType if absent (best-effort)
    if (!essay.originalMimeType && typeof essay.originalUrl === 'string' && /^https?:\/\//.test(essay.originalUrl)) {
      try {
        const https = require('https');
        const http = require('http');
        await new Promise((resolve) => {
          let done = false;
          const h = essay.originalUrl.startsWith('https') ? https : http;
          const reqHead = h.request(essay.originalUrl, { method: 'HEAD' }, async (resp) => {
            if (done) return; done = true;
            const ct = resp.headers['content-type'];
            if (typeof ct === 'string' && ct) {
              essay.originalMimeType = ct.split(';')[0];
              try { await essay.save(); } catch {}
            }
            resolve();
          });
          reqHead.on('error', () => { if (!done) { done = true; resolve(); } });
          reqHead.setTimeout(1500, () => { try { reqHead.destroy(); } catch {} if (!done) { done = true; resolve(); } });
          reqHead.end();
        });
      } catch {}
    }
    res.json({ success: true, data: essay });
  } catch (e) { next(e); }
}

async function assignEssay(req, res, next) {
  try {
    const { id } = req.params;
    const { classId, studentId } = req.body || {};
    if (!classId || !studentId) return res.status(400).json({ success: false, message: 'classId e studentId são obrigatórios' });
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ success: false, message: 'Redação não encontrada' });
    essay.classId = classId;
    essay.studentId = studentId;
    await essay.save();
    res.json({ success: true, message: 'Redação atribuída', data: essay });
  } catch (e) { next(e); }
}

async function sendCorrectionEmail(req, res, next) {
  try {
    const { id } = req.params;
    const { to } = req.body || {};
    const essay = await Essay.findById(id);
    if (!essay) return res.status(404).json({ success: false, message: 'Redação não encontrada' });
    if (!essay.correctedUrl) {
      // Gera o PDF corrigido primeiro, sem enviar e-mail automático
      let data;
      await renderCorrection({ ...req, body: { ...(req.body || {}), sendEmail: false } }, { json: (d) => { data = d; } });
      if (data && data.correctedUrl) {
        essay.correctedUrl = data.correctedUrl;
        await essay.save();
      } else {
        return res.status(400).json({ success: false, message: 'Não foi possível gerar o PDF corrigido' });
      }
    }
    const student = await Student.findById(essay.studentId);
    const classInfo = await Class.findById(essay.classId);
    const themeName = essay.themeId ? (await EssayTheme.findById(essay.themeId))?.name : essay.customTheme;
    const recipient = to || student?.email;
    if (!recipient) return res.status(400).json({ success: false, message: 'E-mail do aluno não encontrado' });
    const html = `<!DOCTYPE html><p>Olá ${student?.name || ''},</p>
<p>Sua redação foi corrigida.</p>
<p>Turma: ${classInfo?.series || ''}${classInfo?.letter || ''} - ${classInfo?.discipline || ''}</p>
<p>Bimestre: ${essay.bimester}</p>
<p>Tipo: ${essay.type}</p>
<p>Tema: ${themeName || '-'}</p>
<p>Nota: ${essay.rawScore ?? '-'}</p>
<p>Nota bimestral: ${essay.scaledScore ?? '-'}</p>
<p><a href="${essay.correctedUrl}">Baixar correção</a></p>`;
  await sendEmail({ to: recipient, subject: 'Sua redação foi corrigida', html });
    res.json({ success: true, message: 'E-mail enviado' });
  } catch (e) { next(e); }
}

module.exports = { getEssayById, assignEssay, sendCorrectionEmail };
