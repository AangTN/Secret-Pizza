const express = require('express');
const router = express.Router();
const { getShippingQuote } = require('./shipping.controller');

// POST /api/shipping/quote
router.post('/quote', getShippingQuote);

module.exports = router;
