const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const { listVouchers, getVoucher, createVoucher, updateVoucher, toggleVoucherStatus, giftVoucher } = require('./voucher.controller');

router.get('/', listVouchers);
router.get('/:code', getVoucher);
router.post('/', requireAdmin, createVoucher);
router.post('/gift', requireAdmin, giftVoucher);
router.put('/:code', requireAdmin, updateVoucher);
router.patch('/:code/status', requireAdmin, toggleVoucherStatus);

module.exports = router;
