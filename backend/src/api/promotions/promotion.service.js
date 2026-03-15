const promotionRepository = require('./promotion.repository');
const foodRepository = require('../foods/food.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function invalidatePromotionCaches(promotionId = null) {
  const tags = [
    cacheTags.HOME,
    cacheTags.PROMOTION_LIST,
    cacheTags.PROMOTION_DISCOUNTED,
    cacheTags.PROMOTION_DETAIL,
    cacheTags.FOODS_LIST,
    cacheTags.FOOD_DETAIL,
    cacheTags.FEATURED_FOODS,
    cacheTags.BEST_SELLING,
  ];

  if (promotionId) {
    tags.push(buildCacheKey(cacheTags.PROMOTION_DETAIL, Number(promotionId)));
  }

  apiCache.deleteByTags(tags);
}

const getAllPromotions = async () => {
  const cacheKey = buildCacheKey('promotions', 'list');

  return apiCache.getOrSet(
    cacheKey,
    async () => {
      const promotions = await promotionRepository.findAllPromotions();

      // Format dates and calculate status
      return promotions.map((promo) => {
        const now = new Date();
        const isActive = promo.TrangThai === 'Active'
          && new Date(promo.KMBatDau) <= now
          && new Date(promo.KMKetThuc) >= now;

        return {
          ...promo,
          isCurrentlyActive: isActive,
          totalFoods: promo._count?.MonAn_KhuyenMai || 0,
        };
      });
    },
    {
      ttlMs: cacheTtls.PROMOTIONS,
      tags: [cacheTags.PROMOTION_LIST],
    }
  );
};

const getDiscountedFoods = async () => {
  const cacheKey = buildCacheKey('promotions', 'discounted-foods');

  return apiCache.getOrSet(
    cacheKey,
    async () => {
      const result = await promotionRepository.findDiscountedFoods();

      // Return array with MaMonAn and MaKhuyenMai only
      return result.map((item) => ({
        MaMonAn: item.MaMonAn,
        MaKhuyenMai: item.MaKhuyenMai,
      }));
    },
    {
      ttlMs: cacheTtls.PROMOTIONS,
      tags: [cacheTags.PROMOTION_DISCOUNTED],
    }
  );
};

const getPromotionById = async (id) => {
  const normalizedId = Number(id);
  const cacheKey = buildCacheKey('promotions', 'detail', normalizedId);
  const detailTag = buildCacheKey(cacheTags.PROMOTION_DETAIL, normalizedId);

  return apiCache.getOrSet(
    cacheKey,
    async () => {
      const promotion = await promotionRepository.findPromotionById(id);
      if (!promotion) {
        const e = new Error('Không tìm thấy khuyến mãi');
        e.status = 404;
        throw e;
      }

      const now = new Date();
      const isActive = promotion.TrangThai === 'Active'
        && new Date(promotion.KMBatDau) <= now
        && new Date(promotion.KMKetThuc) >= now;

      return {
        ...promotion,
        isCurrentlyActive: isActive,
        totalFoods: promotion._count?.MonAn_KhuyenMai || 0,
        foods: promotion.MonAn_KhuyenMai.map((mk) => mk.MonAn),
      };
    },
    {
      ttlMs: cacheTtls.PROMOTIONS,
      tags: [cacheTags.PROMOTION_DETAIL, detailTag],
    }
  );
};

const createPromotion = async (data) => {
  // Validation
  if (!data.TenKhuyenMai || !data.TenKhuyenMai.trim()) {
    const e = new Error('Tên khuyến mãi là bắt buộc');
    e.status = 400;
    throw e;
  }
  if (!data.KMLoai || !['PERCENT', 'AMOUNT'].includes(data.KMLoai)) {
    const e = new Error('Loại khuyến mãi không hợp lệ');
    e.status = 400;
    throw e;
  }
  if (!data.KMGiaTri || Number(data.KMGiaTri) <= 0) {
    const e = new Error('Giá trị khuyến mãi phải lớn hơn 0');
    e.status = 400;
    throw e;
  }

  // Validate percentage 0-100
  if (data.KMLoai === 'PERCENT') {
    const value = Number(data.KMGiaTri);
    if (value > 100) {
      const e = new Error('Phần trăm giảm phải từ 0-100');
      e.status = 400;
      throw e;
    }
  }

  // Validate amount max 100 million
  if (data.KMLoai === 'AMOUNT') {
    const value = Number(data.KMGiaTri);
    if (value > 100000000) {
      const e = new Error('Số tiền giảm tối đa 100 triệu');
      e.status = 400;
      throw e;
    }
  }

  // Validate date range
  if (data.KMBatDau && data.KMKetThuc) {
    const startDate = new Date(data.KMBatDau);
    const endDate = new Date(data.KMKetThuc);
    if (endDate <= startDate) {
      const e = new Error('Ngày kết thúc phải sau ngày bắt đầu');
      e.status = 400;
      throw e;
    }
  }

  const promotion = await promotionRepository.createPromotion(data);
  const now = new Date();
  const isActive = promotion.TrangThai === 'Active' 
    && new Date(promotion.KMBatDau) <= now 
    && new Date(promotion.KMKetThuc) >= now;

  const response = {
    ...promotion,
    isCurrentlyActive: isActive,
    totalFoods: promotion._count?.MonAn_KhuyenMai || 0,
  };

  invalidatePromotionCaches(promotion?.MaKhuyenMai);
  return response;
};

const updatePromotion = async (id, data) => {
  const existing = await promotionRepository.findPromotionById(id);
  if (!existing) {
    const e = new Error('Không tìm thấy khuyến mãi');
    e.status = 404;
    throw e;
  }

  // Validation
  if (!data.TenKhuyenMai || !data.TenKhuyenMai.trim()) {
    const e = new Error('Tên khuyến mãi là bắt buộc');
    e.status = 400;
    throw e;
  }
  if (!data.KMLoai || !['PERCENT', 'AMOUNT'].includes(data.KMLoai)) {
    const e = new Error('Loại khuyến mãi không hợp lệ');
    e.status = 400;
    throw e;
  }
  if (!data.KMGiaTri || Number(data.KMGiaTri) <= 0) {
    const e = new Error('Giá trị khuyến mãi phải lớn hơn 0');
    e.status = 400;
    throw e;
  }

  // Validate percentage 0-100
  if (data.KMLoai === 'PERCENT') {
    const value = Number(data.KMGiaTri);
    if (value > 100) {
      const e = new Error('Phần trăm giảm phải từ 0-100');
      e.status = 400;
      throw e;
    }
  }

  // Validate amount max 100 million
  if (data.KMLoai === 'AMOUNT') {
    const value = Number(data.KMGiaTri);
    if (value > 100000000) {
      const e = new Error('Số tiền giảm tối đa 100 triệu');
      e.status = 400;
      throw e;
    }
  }

  // Validate date range
  if (data.KMBatDau && data.KMKetThuc) {
    const startDate = new Date(data.KMBatDau);
    const endDate = new Date(data.KMKetThuc);
    if (endDate <= startDate) {
      const e = new Error('Ngày kết thúc phải sau ngày bắt đầu');
      e.status = 400;
      throw e;
    }
  }

  const promotion = await promotionRepository.updatePromotion(id, data);
  const now = new Date();
  const isActive = promotion.TrangThai === 'Active' 
    && new Date(promotion.KMBatDau) <= now 
    && new Date(promotion.KMKetThuc) >= now;

  const response = {
    ...promotion,
    isCurrentlyActive: isActive,
    totalFoods: promotion._count?.MonAn_KhuyenMai || 0,
  };

  invalidatePromotionCaches(promotion?.MaKhuyenMai || id);
  return response;
};

const togglePromotionStatus = async (id, newStatus) => {
  if (!newStatus || !['Active', 'Inactive'].includes(newStatus)) {
    const e = new Error('Trạng thái không hợp lệ');
    e.status = 400;
    throw e;
  }

  const existing = await promotionRepository.findPromotionById(id);
  if (!existing) {
    const e = new Error('Không tìm thấy khuyến mãi');
    e.status = 404;
    throw e;
  }

  const promotion = await promotionRepository.updatePromotionStatus(id, newStatus);
  const now = new Date();
  const isActive = promotion.TrangThai === 'Active' 
    && new Date(promotion.KMBatDau) <= now 
    && new Date(promotion.KMKetThuc) >= now;

  const response = {
    ...promotion,
    isCurrentlyActive: isActive,
    totalFoods: promotion._count?.MonAn_KhuyenMai || 0,
  };

  invalidatePromotionCaches(promotion?.MaKhuyenMai || id);
  return response;
};

const updatePromotionFoods = async (promotionId, foodIds) => {
  const promotion = await promotionRepository.findPromotionById(promotionId);
  if (!promotion) {
    const e = new Error('Không tìm thấy khuyến mãi');
    e.status = 404;
    throw e;
  }

  // Validation for AMOUNT type
  if ((promotion.KMLoai === 'AMOUNT' || promotion.KMLoai === 'SOTIEN') && foodIds && foodIds.length > 0) {
    const discountAmount = Number(promotion.KMGiaTri);
    
    // Validate each food
    for (const foodId of foodIds) {
      const food = await foodRepository.findFoodById(foodId);
      if (!food) continue;
      
      // Check active variants
      if (food.BienTheMonAn && food.BienTheMonAn.length > 0) {
        // Filter only active variants if needed, but findFoodById usually returns active ones or all?
        // findFoodById in food.repository.js returns: BienTheMonAn: { where: { TrangThai: 'Active' } ... }
        // So we are checking against active variants.
        const invalidVariants = food.BienTheMonAn.filter(v => Number(v.GiaBan) <= discountAmount);
        
        if (invalidVariants.length > 0) {
           const e = new Error(`Không thể thêm món "${food.TenMonAn}". Giá giảm (${discountAmount.toLocaleString()}đ) phải nhỏ hơn giá bán của tất cả các biến thể.`);
           e.status = 400;
           throw e;
        }
      }
    }
  }

  await promotionRepository.updatePromotionFoods(promotionId, foodIds);
  invalidatePromotionCaches(promotionId);
  return { success: true, message: 'Cập nhật danh sách món ăn thành công' };
};

const deletePromotion = async (promotionId) => {
  const promotion = await promotionRepository.findPromotionById(promotionId);
  if (!promotion) {
    const e = new Error('Không tìm thấy khuyến mãi');
    e.status = 404;
    throw e;
  }

  // First delete relations, then the promotion itself
  await promotionRepository.deletePromotion(promotionId);
  invalidatePromotionCaches(promotionId);
  return { success: true, message: 'Xóa khuyến mãi thành công' };
};

module.exports = {
  getAllPromotions,
  getDiscountedFoods,
  getPromotionById,
  createPromotion,
  updatePromotion,
  togglePromotionStatus,
  updatePromotionFoods,
  deletePromotion,
};
