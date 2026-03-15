const { requireAdmin } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const promotionController = require('./promotion.controller');

// Lấy tất cả khuyến mãi
router.get('/', promotionController.getAllPromotions);

// Lấy các món ăn đang được giảm giá
router.get('/foods/discounted', promotionController.getDiscountedFoods);

// Lấy khuyến mãi theo ID (bao gồm danh sách món ăn)
router.get('/:id', promotionController.getPromotionById);

// Tạo khuyến mãi mới
router.post('/', requireAdmin, promotionController.createPromotion);

// Cập nhật khuyến mãi
router.put('/:id', requireAdmin, promotionController.updatePromotion);

// Cập nhật trạng thái khuyến mãi
router.patch('/:id/status', requireAdmin, promotionController.togglePromotionStatus);

// Cập nhật danh sách món ăn (xóa hết và thêm lại)
router.put('/:id/foods', requireAdmin, promotionController.updatePromotionFoods);

// Xóa khuyến mãi (xóa liên kết món trước, sau đó xóa khuyến mãi)
router.delete('/:id', requireAdmin, promotionController.deletePromotion);

module.exports = router;
