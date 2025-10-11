// node scripts/gen-secret.js
const c = require('crypto');
console.log(c.randomBytes(48).toString('base64'));
