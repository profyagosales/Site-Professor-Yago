const mongoose = require('mongoose');
const { metrics } = require('../middleware/metrics');
const { getBreakerStateSnapshot } = require('../services/ai/aiProvider');
const AICorrectionSuggestion = require('../models/AICorrectionSuggestion');
let cached = { data: null, ts: 0 };

// Estado do breaker de IA: importamos indiretamente do provider (se exposto)
function getAIBreakerState() {
  try { return getBreakerStateSnapshot(); } catch { return null; }
}

exports.getSystemStatus = async (req, res, next) => {
  try {
    const now = Date.now();
    // Cache leve de 5s para evitar carga em alta frequência
    if (cached.data && (now - cached.ts) < 5000) {
      return res.json({ ...cached.data, cached: true });
    }
    const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    // AI adoption snapshot
    const [totalSuggestions, applied] = await Promise.all([
      AICorrectionSuggestion.countDocuments({}),
      AICorrectionSuggestion.countDocuments({ $or: [ { appliedFeedback: true }, { appliedScores: true } ] })
    ]);
    const adoptionRate = totalSuggestions ? Number((applied / totalSuggestions).toFixed(2)) : null;
    const login = metrics ? {
      teacher: {
        success: metrics.login_teacher_success_total,
        unauthorized: metrics.login_teacher_unauthorized_total,
        unavailable: metrics.login_teacher_unavailable_total
      },
      student: {
        success: metrics.login_student_success_total,
        unauthorized: metrics.login_student_unauthorized_total,
        unavailable: metrics.login_student_unavailable_total
      }
    } : null;
    function rate(o){ if(!o) return null; const tot = o.success+o.unauthorized+o.unavailable; return tot? Number((o.success/tot).toFixed(2)):null; }
    const breaker = getAIBreakerState();
    const retryInMs = (breaker && breaker.open) ? Math.max(breaker.nextTry - now, 0) : 0;
    const payload = {
      ok: true,
      timestamp: new Date().toISOString(),
      dbConnected,
      ai: {
        breaker: breaker ? { open: breaker.open, failures: breaker.failures, nextTry: breaker.nextTry, retryInMs } : null,
        adoption: { total: totalSuggestions, applied, rate: adoptionRate }
      },
      login: login ? {
        teacher: { ...login.teacher, successRate: rate(login.teacher) },
        student: { ...login.student, successRate: rate(login.student) }
      } : null
    };
    cached = { data: payload, ts: now };
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

// Reset manual do breaker (apenas professor autenticado) - uso emergencial
exports.resetAIBreaker = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Apenas professores' });
    }
    const { resetBreakerState } = require('../services/ai/aiProvider');
    const after = resetBreakerState();
    return res.status(200).json({ ok: true, reset: true, breaker: after });
  } catch (err) { next(err); }
};
