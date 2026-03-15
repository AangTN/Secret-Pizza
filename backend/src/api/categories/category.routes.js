const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const categoryController = require('./category.controller');

// Get all categories
router.get('/', categoryController.getCategories);

// Create new category
router.post('/', requireAdmin, categoryController.createCategory);

// Update category
router.put('/:id', requireAdmin, categoryController.updateCategory);

// Delete category
router.delete('/:id', requireAdmin, categoryController.deleteCategory);

module.exports = router;
