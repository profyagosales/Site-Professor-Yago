const Essay = require('../models/Essay');
const { canUserAccessEssay } = require('../services/acl');

async function assertUserCanAccessEssay(user, essayOrId) {
  if (!user) {
    const e = new Error('Unauthorized');
    e.status = 401;
    throw e;
  }

  let essay = essayOrId;
  if (!essay || !essay._id) {
    essay = await Essay.findById(essayOrId).lean();
  }

  if (!essay) {
    const e = new Error('Not found');
    e.status = 404;
    throw e;
  }

  const acl = await canUserAccessEssay(user, essay);
  if (acl.ok) {
    return true;
  }

  const err = new Error('Forbidden');
  err.status = 403;
  err.reason = acl.reason;
  throw err;
}

module.exports = { assertUserCanAccessEssay };