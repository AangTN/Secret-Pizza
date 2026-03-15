const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const controller = require('./variant.controller');

// GET /api/variants -> all variants (BienTheMonAn)
router.get('/', controller.getAllVariants);

// GET /api/variants/option-prices -> all option prices (TuyChon_Gia)
router.get('/option-prices', controller.getAllOptionPrices);

module.exports = router;
