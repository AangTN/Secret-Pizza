const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const optionController = require('./option.controller');

// Get all option types with options and pricing (for public)
router.get('/', optionController.getAllOptions);

// Admin routes
router.get('/admin', requireAdmin, optionController.getAllOptionsAdmin);
router.get('/sizes', optionController.getAllSizes);
router.get('/types', optionController.getAllOptionTypes);
router.get('/:id', optionController.getOptionById);
router.post('/', requireAdmin, optionController.createOption);
router.put('/:id', requireAdmin, optionController.updateOption);
router.delete('/:id', requireAdmin, optionController.deleteOption);

module.exports = router;
