const express = require('express');
const controller = require('./payment.controller');

const router = express.Router();

// VNPay return URL
router.get('/vnpay-return', controller.vnpayReturn);

// Create VNPay payment URL for existing order
router.post('/create-payment-url', controller.createPaymentUrl);

module.exports = router;
