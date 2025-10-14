const { readToken, decodeUser, attachUser } = require('./auth');
const { maybeRefreshSession } = require('../utils/sessionToken');

function readSession(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) {
      req.sessionUser = null;
      return next();
    }
    let user = decodeUser(token);
    if (user) {
      const refreshedToken = maybeRefreshSession(req, res, user);
      if (refreshedToken) {
        user = decodeUser(refreshedToken) || user;
      }
    }
    req.sessionUser = user || null;
    if (user) attachUser(req, user);
  } catch {
    req.sessionUser = null;
  }
  return next();
}

module.exports = { readSession };
