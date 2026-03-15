const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const bannerController = require('./banner.controller');

router.get('/', bannerController.getBanners);
router.post('/', requireAdmin, bannerController.createBanner);
router.put('/:id', requireAdmin, bannerController.editBanner);
router.delete('/:id', requireAdmin, bannerController.deleteBanner);

module.exports = router;
