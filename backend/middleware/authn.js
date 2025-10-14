const { readToken, decodeUser, attachUser } = require('./auth');

function readSession(req, _res, next) {
  try {
    const token = readToken(req);
    if (!token) {
      req.sessionUser = null;
      return next();
    }
    const user = decodeUser(token);
    req.sessionUser = user || null;
    if (user) attachUser(req, user);
  } catch {
    req.sessionUser = null;
  }
  return next();
}

module.exports = { readSession };
