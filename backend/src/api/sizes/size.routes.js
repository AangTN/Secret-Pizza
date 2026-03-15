const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const sizeController = require('./size.controller');

// Get all sizes
router.get('/', sizeController.getAllSizes);

module.exports = router;
