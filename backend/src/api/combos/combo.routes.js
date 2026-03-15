const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const comboController = require('./combo.controller');
const uploadCombo = require('../../middleware/uploadCombo');

// Danh sách combo Active
router.get('/', comboController.getCombos);

// Admin: combos by statuses (default Active,Inactive)
router.get('/admin', requireAdmin, comboController.getCombosAdmin);

// Chi tiết combo theo id (đủ thông tin liên quan)
router.get('/:id', comboController.getComboById);

// Thêm combo mới (with image upload to AnhCombo folder)
router.post('/', requireAdmin, uploadCombo.single('hinhAnhFile'), comboController.createCombo);

// Cập nhật combo (không sửa tên, xóa chi tiết cũ và thêm mới)
router.put('/:id', requireAdmin, uploadCombo.single('hinhAnhFile'), comboController.updateCombo);

// Cập nhật trạng thái combo (Active/Inactive)
router.patch('/:id/status', requireAdmin, comboController.updateComboStatus);

// Xóa combo (chuyển sang Deleted và xóa chi tiết)
router.delete('/:id', requireAdmin, comboController.deleteCombo);

module.exports = router;