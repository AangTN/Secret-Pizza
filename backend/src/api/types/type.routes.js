const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const typeController = require('./type.controller');

// Get all types
router.get('/', typeController.getTypes);

// Create new type
router.post('/', requireAdmin, typeController.createType);

// Update type
router.put('/:id', requireAdmin, typeController.updateType);

// Delete type
router.delete('/:id', requireAdmin, typeController.deleteType);

module.exports = router;
