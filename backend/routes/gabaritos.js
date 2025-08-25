const express = require('express');
const multer = require('multer');
const authRequired = require('../middleware/auth');
const { buildGabaritoPDF } = require('../utils/gabaritoPdf');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authRequired, upload.fields([{ name: 'logoLeft' }, { name: 'logoRight' }]), async (req, res, next) => {
  try {
    const logoLeft = (req.files?.logoLeft?.[0]) || null;
    const logoRight = (req.files?.logoRight?.[0]) || null;
    const { schoolName, discipline, teacher } = req.body;
    const pdf = await buildGabaritoPDF({ logoLeft, logoRight, schoolName, discipline, teacher });
    res.setHeader('Content-Type', 'application/pdf');
    res.status(200).send(Buffer.from(pdf));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
