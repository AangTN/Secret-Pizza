const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const giftController = require('./gift.controller');
const uploadGift = require('../../middleware/uploadGift');


// Admin routes
router.get('/', giftController.getActiveGifts);
router.post('/', requireAdmin, uploadGift.single('file'), giftController.addGift); // Add new gift
router.put('/', requireAdmin, uploadGift.single('file'), giftController.updateGift); // Update gift (cannot update TenQuaTang, CapDo)
router.delete('/', requireAdmin, giftController.deleteGift); // Soft delete gift

module.exports = router;
