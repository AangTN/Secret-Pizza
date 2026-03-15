const express = require('express');
const controller = require('./review.controller');

const router = express.Router();

// POST /api/reviews - Tạo đánh giá mới
router.post('/', controller.createReview);

// GET /api/reviews - Lấy tất cả đánh giá (cho admin)
router.get('/', controller.getAllReviews);

// GET /api/reviews/food/:foodId - Lấy đánh giá theo món ăn (chỉ hiển thị đã duyệt)
router.get('/food/:foodId', controller.getReviewsByFoodId);

// PUT /api/reviews/:id/approve - Duyệt đánh giá
router.put('/:id/approve', controller.approveReview);

// PUT /api/reviews/:id/reject - Từ chối đánh giá
router.put('/:id/reject', controller.rejectReview);

// DELETE /api/reviews/:id - Xóa đánh giá
router.delete('/:id', controller.deleteReview);

module.exports = router;
