const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const { getCrusts, createCrust } = require('./crust.controller');

router.get('/', getCrusts);
router.post('/', requireAdmin, createCrust);

module.exports = router;
