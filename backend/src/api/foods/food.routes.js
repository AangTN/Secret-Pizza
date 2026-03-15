const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const foodController = require('./food.controller');
const upload = require('../../middleware/upload');

// Danh sách món ăn (chỉ thông tin bảng MonAn)
router.get('/', foodController.getFoods);

// Admin: Danh sách tất cả món ăn (Active và Ẩn, không bao gồm Deleted)
router.get('/admin/all', requireAdmin, foodController.getFoodsAdmin);

// Top 8 món bán chạy nhất
router.get('/best-selling/top', foodController.getBestSelling);

// Các món ăn được đề xuất
router.get('/featured/all', foodController.getFeaturedFoods);

// Thêm món ăn mới (with image upload)
router.post('/', requireAdmin, upload.single('hinhAnhFile'), foodController.createFood);

// Cập nhật món ăn (with optional image upload)
router.put('/:id', requireAdmin, upload.single('hinhAnhFile'), foodController.updateFood);

// Xóa món ăn (soft delete - set TrangThai = 'Deleted')
router.delete('/:id', requireAdmin, foodController.deleteFood);

// Chi tiết món ăn
router.get('/:id', foodController.getFoodById);

module.exports = router;
