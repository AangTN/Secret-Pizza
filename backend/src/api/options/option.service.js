const optionRepository = require('./option.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function invalidateOptionCaches() {
  apiCache.deleteByTags([
    cacheTags.CATALOG,
    cacheTags.OPTIONS,
    cacheTags.OPTION_TYPES,
    cacheTags.FOOD_DETAIL,
    cacheTags.FOODS_LIST,
    cacheTags.COMBO_DETAIL,
    cacheTags.VARIANTS,
  ]);
}

const getAllOptions = async () => {
  const cacheKey = buildCacheKey('options', 'list');
  return apiCache.getOrSet(
    cacheKey,
    () => optionRepository.findAllOptions(),
    {
      ttlMs: cacheTtls.CATALOG,
      tags: [cacheTags.OPTIONS],
    }
  );
};

const getAllOptionsAdmin = async () => {
  return optionRepository.findAllOptionsAdmin();
};

const getAllSizes = async () => {
  const cacheKey = buildCacheKey('catalog', 'sizes');
  return apiCache.getOrSet(
    cacheKey,
    () => optionRepository.findAllSizes(),
    {
      ttlMs: cacheTtls.CATALOG,
      tags: [cacheTags.CATALOG, cacheTags.SIZES],
    }
  );
};

const getAllOptionTypes = async () => {
  const cacheKey = buildCacheKey('catalog', 'option-types');
  return apiCache.getOrSet(
    cacheKey,
    () => optionRepository.findAllOptionTypes(),
    {
      ttlMs: cacheTtls.CATALOG,
      tags: [cacheTags.CATALOG, cacheTags.OPTION_TYPES],
    }
  );
};

const createOption = async (optionData) => {
  // Validate
  if (!optionData.TenTuyChon || !optionData.MaLoaiTuyChon) {
    throw new Error('Tên tùy chọn và loại tùy chọn là bắt buộc');
  }

  if (!optionData.prices || optionData.prices.length === 0) {
    throw new Error('Phải có ít nhất một giá cho size');
  }

  const created = await optionRepository.createOption(optionData);
  invalidateOptionCaches();
  return created;
};

const updateOption = async (id, optionData) => {
  // Check if option exists
  const option = await optionRepository.findOptionById(id);
  if (!option) {
    throw new Error('Không tìm thấy tùy chọn');
  }

  if (!optionData.prices || optionData.prices.length === 0) {
    throw new Error('Phải có ít nhất một giá cho size');
  }

  const updated = await optionRepository.updateOption(id, optionData);
  invalidateOptionCaches();
  return updated;
};

const deleteOption = async (id) => {
  // Check if option exists
  const option = await optionRepository.findOptionById(id);
  if (!option) {
    throw new Error('Không tìm thấy tùy chọn');
  }

  const deleted = await optionRepository.deleteOption(id);
  invalidateOptionCaches();
  return deleted;
};

const getOptionById = async (id) => {
  const normalizedId = Number(id);
  const cacheKey = buildCacheKey('options', 'detail', normalizedId);
  const option = await apiCache.getOrSet(
    cacheKey,
    () => optionRepository.findOptionById(id),
    {
      ttlMs: cacheTtls.CATALOG,
      tags: [cacheTags.OPTIONS],
    }
  );
  if (!option) {
    throw new Error('Không tìm thấy tùy chọn');
  }
  return option;
};

module.exports = {
  getAllOptions,
  getAllOptionsAdmin,
  getAllSizes,
  getAllOptionTypes,
  createOption,
  updateOption,
  deleteOption,
  getOptionById,
};
