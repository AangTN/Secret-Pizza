const { requireAdmin, requireAuth } = require('../../middleware/auth.middleware');
const express = require('express');
const controller = require('./user.controller');

const router = express.Router();

// GET /api/users/admin/all-accounts - Lấy tất cả tài khoản với thống kê đơn hàng
router.get('/admin/all-accounts', requireAdmin, controller.getAllAccounts);

// GET /api/users/:id - Lấy thông tin người dùng
router.get('/:id', controller.getUserProfile);

// POST /api/users - Tạo người dùng mới
router.post('/', requireAdmin, controller.createUser);

// PUT /api/users - Cập nhật thông tin người dùng
router.put('/', controller.updateUserProfile);

// POST /api/users/:id/block - Khóa tài khoản
router.post('/:id/block', requireAdmin, controller.blockUser);

// POST /api/users/:id/unblock - Mở khóa tài khoản
router.post('/:id/unblock', requireAdmin, controller.unblockUser);

// PUT /api/users/:id/role - Cập nhật vai trò người dùng
router.put('/:id/role', requireAdmin, controller.updateUserRole);

module.exports = router;
