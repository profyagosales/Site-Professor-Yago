const { selectUserFromTokens, attachUser } = require('./auth');

function readSession(req, res, next) {
  try {
    const { user } = selectUserFromTokens(req, res);
    req.sessionUser = user || null;
    if (user) attachUser(req, user);
  } catch {
    req.sessionUser = null;
  }
  return next();
}

module.exports = { readSession };
