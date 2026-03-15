const repository = require('./gift.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function invalidateGiftCaches() {
  apiCache.deleteByTags([cacheTags.GIFTS, cacheTags.HOME]);
}

/**
 * Get all active gifts
 */
const getActiveGifts = async () => {
  const cacheKey = buildCacheKey('gifts', 'active');
  return apiCache.getOrSet(
    cacheKey,
    () => repository.findActiveGifts(),
    {
      ttlMs: cacheTtls.GIFTS,
      tags: [cacheTags.GIFTS, cacheTags.HOME],
    }
  );
};

/**
 * Get all gifts (for admin)
 */
const getAllGifts = async () => {
  const cacheKey = buildCacheKey('gifts', 'all');
  return apiCache.getOrSet(
    cacheKey,
    () => repository.findAllGifts(),
    {
      ttlMs: cacheTtls.GIFTS,
      tags: [cacheTags.GIFTS],
    }
  );
};

/**
 * Validate percentages total = 100%
 */
const validatePercentages = (percentages) => {
  const total = Object.values(percentages).reduce((sum, val) => sum + parseFloat(val || 0), 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Tổng tỷ lệ xuất hiện phải bằng 100% (hiện tại: ${total.toFixed(2)}%)`);
  }
};

/**
 * Add new gift
 * - Check if CapDo already exists in Active gifts
 * - Update percentages for all Active gifts
 * - Add new gift with specified CapDo
 */
const addGift = async (data) => {
  const { TenQuaTang, MoTa, CapDo, HinhAnh, TrangThai, percentages } = data;

  // Validate percentages
  validatePercentages(percentages);

  // Check if CapDo already exists in Active gifts
  const existingGift = await repository.findGiftByCapDo(CapDo, 'Active');
  if (existingGift) {
    throw new Error(`Độ hiếm "${CapDo}" đã tồn tại trong hệ thống`);
  }

  // Get all active gifts to update their percentages
  const activeGifts = await repository.findActiveGifts();

  const created = await repository.executeTransaction(async (tx) => {
    // Update percentages for existing gifts
    for (const gift of activeGifts) {
      if (percentages[gift.CapDo] !== undefined) {
        await tx.quaTang.update({
          where: { MaQuaTang: gift.MaQuaTang },
          data: { TyLeXuatHien: String(percentages[gift.CapDo]) }
        });
      }
    }

    // Create new gift
    const newGift = await tx.quaTang.create({
      data: {
        TenQuaTang,
        MoTa,
        HinhAnh: HinhAnh || null,
        CapDo,
        TyLeXuatHien: String(percentages[CapDo]),
        TrangThai: TrangThai || 'Active'
      }
    });

    return newGift;
  });

  invalidateGiftCaches();
  return created;
};

/**
 * Update gift
 * - Cannot update TenQuaTang and CapDo
 * - Update percentages for all Active gifts
 */
const updateGift = async (data) => {
  const { MaQuaTang, MoTa, HinhAnh, TrangThai, percentages } = data;

  // Validate percentages
  validatePercentages(percentages);

  // Check if gift exists
  const existingGift = await repository.findGiftById(MaQuaTang);
  if (!existingGift) {
    throw new Error(`Không tìm thấy quà tặng ID: ${MaQuaTang}`);
  }

  // Get all active gifts to update their percentages
  const activeGifts = await repository.findActiveGifts();

  const updated = await repository.executeTransaction(async (tx) => {
    // Update percentages for all active gifts
    for (const gift of activeGifts) {
      if (percentages[gift.CapDo] !== undefined) {
        const updateData = { TyLeXuatHien: String(percentages[gift.CapDo]) };
        
        // Update the target gift's other fields as well
        if (gift.MaQuaTang === MaQuaTang) {
          updateData.MoTa = MoTa;
          if (HinhAnh !== undefined) updateData.HinhAnh = HinhAnh;
          if (TrangThai !== undefined) updateData.TrangThai = TrangThai;
        }

        await tx.quaTang.update({
          where: { MaQuaTang: gift.MaQuaTang },
          data: updateData
        });
      }
    }

    // Return updated gift
    return await tx.quaTang.findUnique({
      where: { MaQuaTang }
    });
  });

  invalidateGiftCaches();
  return updated;
};

/**
 * Delete gift (soft delete)
 * - Set TrangThai to 'Deleted'
 * - Update percentages for remaining Active gifts
 */
const deleteGift = async (data) => {
  const { MaQuaTang, percentages } = data;

  // Validate percentages
  validatePercentages(percentages);

  // Check if gift exists
  const existingGift = await repository.findGiftById(MaQuaTang);
  if (!existingGift) {
    throw new Error(`Không tìm thấy quà tặng ID: ${MaQuaTang}`);
  }

  // Get all active gifts except the one being deleted
  const activeGifts = await repository.findActiveGifts();
  const remainingGifts = activeGifts.filter(g => g.MaQuaTang !== MaQuaTang);

  const deleted = await repository.executeTransaction(async (tx) => {
    // Update percentages for remaining gifts
    for (const gift of remainingGifts) {
      if (percentages[gift.CapDo] !== undefined) {
        await tx.quaTang.update({
          where: { MaQuaTang: gift.MaQuaTang },
          data: { TyLeXuatHien: String(percentages[gift.CapDo]) }
        });
      }
    }

    // Soft delete the gift
    await tx.quaTang.update({
      where: { MaQuaTang },
      data: { TrangThai: 'Deleted' }
    });

    return { MaQuaTang, status: 'Deleted' };
  });

  invalidateGiftCaches();
  return deleted;
};

module.exports = {
  getActiveGifts,
  getAllGifts,
  addGift,
  updateGift,
  deleteGift,
};
