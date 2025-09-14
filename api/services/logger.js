const levels = ['debug','info','warn','error'];
// Em ambiente de teste, default para 'error' para reduzir ruído, a menos que explicitamente sobrescrito
const level = process.env.NODE_ENV === 'test'
  ? (process.env.LOG_LEVEL || 'error')
  : (process.env.LOG_LEVEL || 'info');
const levelIndex = levels.indexOf(level) === -1 ? 1 : levels.indexOf(level);

function base(meta = {}) { return { ts: new Date().toISOString(), ...meta }; }
function log(lvl, msg, meta) {
  if (levels.indexOf(lvl) < levelIndex) return;
  const payload = base({ level: lvl, msg, ...meta });
  process.stdout.write(JSON.stringify(payload) + '\n');
}
module.exports = {
  debug: (m, meta={}) => log('debug', m, meta),
  info: (m, meta={}) => log('info', m, meta),
  warn: (m, meta={}) => log('warn', m, meta),
  error: (m, meta={}) => log('error', m, meta)
};
