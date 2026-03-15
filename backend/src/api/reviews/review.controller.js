const service = require('./review.service');

async function createReview(req, res) {
  try {
    const review = await service.createReview(req.body);
    res.status(201).json({
      message: 'Đánh giá của bạn đã được gửi và đang chờ duyệt',
      data: review,
    });
  } catch (err) {
    console.error('createReview error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function getReviewsByFoodId(req, res) {
  try {
    const maMonAn = Number(req.params.foodId);
    if (!maMonAn) {
      return res.status(400).json({ message: 'foodId không hợp lệ' });
    }
    const reviews = await service.getReviewsByFoodId(maMonAn);
    res.status(200).json({ data: reviews });
  } catch (err) {
    console.error('getReviewsByFoodId error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function getAllReviews(req, res) {
  try {
    const reviews = await service.getAllReviews();
    res.status(200).json({ data: reviews });
  } catch (err) {
    console.error('getAllReviews error:', err);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
}

async function approveReview(req, res) {
  try {
    const maDanhGia = Number(req.params.id);
    if (!maDanhGia) {
      return res.status(400).json({ message: 'id không hợp lệ' });
    }
    await service.approveReview(maDanhGia);
    res.status(200).json({ message: 'Đã duyệt đánh giá' });
  } catch (err) {
    console.error('approveReview error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function rejectReview(req, res) {
  try {
    const maDanhGia = Number(req.params.id);
    if (!maDanhGia) {
      return res.status(400).json({ message: 'id không hợp lệ' });
    }
    await service.rejectReview(maDanhGia);
    res.status(200).json({ message: 'Đã từ chối đánh giá' });
  } catch (err) {
    console.error('rejectReview error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function deleteReview(req, res) {
  try {
    const maDanhGia = Number(req.params.id);
    if (!maDanhGia) {
      return res.status(400).json({ message: 'id không hợp lệ' });
    }
    await service.deleteReview(maDanhGia);
    res.status(200).json({ message: 'Đã xóa đánh giá' });
  } catch (err) {
    console.error('deleteReview error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

module.exports = {
  createReview,
  getReviewsByFoodId,
  getAllReviews,
  approveReview,
  rejectReview,
  deleteReview,
};
