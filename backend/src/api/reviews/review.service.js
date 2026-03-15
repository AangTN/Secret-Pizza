const repo = require('./review.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function invalidateReviewCaches(maMonAn = null) {
  const tags = [
    cacheTags.REVIEWS_BY_FOOD,
    cacheTags.FOOD_DETAIL,
    cacheTags.FOODS_LIST,
    cacheTags.BEST_SELLING,
    cacheTags.HOME,
  ];

  if (maMonAn) {
    tags.push(buildCacheKey(cacheTags.REVIEWS_BY_FOOD, Number(maMonAn)));
    tags.push(buildCacheKey(cacheTags.FOOD_DETAIL, Number(maMonAn)));
  }

  apiCache.deleteByTags(tags);
}

async function createReview(payload) {
  if (!payload) {
    const e = new Error('Thiếu dữ liệu đánh giá');
    e.status = 400;
    throw e;
  }

  const { MaMonAn, MaTaiKhoan, SoSao, NoiDung } = payload;

  // Validate required fields
  if (!MaMonAn || !MaTaiKhoan || !SoSao) {
    const e = new Error('Thiếu thông tin bắt buộc: MaMonAn, MaTaiKhoan, SoSao');
    e.status = 400;
    throw e;
  }

  // Validate SoSao range
  const soSaoNum = Number(SoSao);
  if (!Number.isInteger(soSaoNum) || soSaoNum < 1 || soSaoNum > 5) {
    const e = new Error('Số sao phải là số nguyên từ 1 đến 5');
    e.status = 400;
    throw e;
  }

  // Check if user can review this food
  const reviewCheck = await repo.checkUserCanReview(MaTaiKhoan, MaMonAn);
  if (!reviewCheck.canReview) {
    let errorMessage = 'Không thể đánh giá món ăn này';
    
    switch (reviewCheck.reason) {
      case 'already_reviewed':
        errorMessage = 'Bạn đã đánh giá món ăn này rồi';
        break;
      case 'user_not_found':
        errorMessage = 'Không tìm thấy thông tin người dùng';
        break;
      case 'no_completed_order':
        errorMessage = 'Bạn chỉ có thể đánh giá món ăn sau khi đã nhận được hàng';
        break;
    }
    
    const e = new Error(errorMessage);
    e.status = 400;
    throw e;
  }

  const created = await repo.createReview({
    maMonAn: Number(MaMonAn),
    maTaiKhoan: Number(MaTaiKhoan),
    soSao: soSaoNum,
    noiDung: NoiDung || null,
  });

  invalidateReviewCaches(MaMonAn);
  return created;
}

async function getReviewsByFoodId(maMonAn) {
  if (!maMonAn) {
    const e = new Error('Thiếu MaMonAn');
    e.status = 400;
    throw e;
  }
  const normalizedFoodId = Number(maMonAn);
  const cacheKey = buildCacheKey('reviews', 'food', normalizedFoodId);
  const foodTag = buildCacheKey(cacheTags.REVIEWS_BY_FOOD, normalizedFoodId);

  return apiCache.getOrSet(
    cacheKey,
    () => repo.findReviewsByFoodId(maMonAn),
    {
      ttlMs: cacheTtls.REVIEWS_BY_FOOD,
      tags: [cacheTags.REVIEWS_BY_FOOD, foodTag],
    }
  );
}

async function getAllReviews() {
  return repo.findAllReviews();
}

async function approveReview(maDanhGia) {
  if (!maDanhGia) {
    const e = new Error('Thiếu MaDanhGiaMonAn');
    e.status = 400;
    throw e;
  }
  const updated = await repo.updateReviewStatus(maDanhGia, 'Hiển thị');
  invalidateReviewCaches(updated?.MaMonAn);
  return updated;
}

async function rejectReview(maDanhGia) {
  if (!maDanhGia) {
    const e = new Error('Thiếu MaDanhGiaMonAn');
    e.status = 400;
    throw e;
  }
  const updated = await repo.updateReviewStatus(maDanhGia, 'Ẩn');
  invalidateReviewCaches(updated?.MaMonAn);
  return updated;
}

async function deleteReview(maDanhGia) {
  if (!maDanhGia) {
    const e = new Error('Thiếu MaDanhGiaMonAn');
    e.status = 400;
    throw e;
  }
  const deleted = await repo.deleteReview(maDanhGia);
  invalidateReviewCaches(deleted?.MaMonAn);
  return deleted;
}

module.exports = {
  createReview,
  getReviewsByFoodId,
  getAllReviews,
  approveReview,
  rejectReview,
  deleteReview,
};
