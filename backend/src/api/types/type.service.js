const typeRepository = require('./type.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function invalidateTypeCaches() {
  apiCache.deleteByTags([
    cacheTags.CATALOG,
    cacheTags.TYPES,
    cacheTags.FOODS_LIST,
    cacheTags.FOOD_DETAIL,
    cacheTags.FEATURED_FOODS,
    cacheTags.HOME,
  ]);
}

const getAllTypes = () => {
  const cacheKey = buildCacheKey('catalog', 'types');
  return apiCache.getOrSet(
    cacheKey,
    () => typeRepository.findAllTypes(),
    {
      ttlMs: cacheTtls.CATALOG,
      tags: [cacheTags.CATALOG, cacheTags.TYPES],
    }
  );
};

const createType = async (data) => {
  // Validate required fields
  if (!data.tenLoaiMonAn) {
    const e = new Error('Thiếu thông tin bắt buộc: tenLoaiMonAn');
    e.status = 400;
    throw e;
  }

  // Check for duplicate name
  const existing = await typeRepository.findTypeByName(data.tenLoaiMonAn);
  if (existing) {
    const e = new Error('Tên loại món ăn đã tồn tại');
    e.status = 400;
    throw e;
  }

  const created = await typeRepository.createType(data);
  invalidateTypeCaches();
  return created;
};

const updateType = async (id, data) => {
  // Validate required fields
  if (!data.tenLoaiMonAn) {
    const e = new Error('Thiếu thông tin bắt buộc: tenLoaiMonAn');
    e.status = 400;
    throw e;
  }

  // Check if type exists
  const type = await typeRepository.findTypeById(id);
  if (!type) {
    const e = new Error('Không tìm thấy loại món ăn');
    e.status = 404;
    throw e;
  }

  // Check for duplicate name (exclude current record)
  const existing = await typeRepository.findTypeByName(data.tenLoaiMonAn);
  if (existing && existing.MaLoaiMonAn !== Number(id)) {
    const e = new Error('Tên loại món ăn đã tồn tại');
    e.status = 400;
    throw e;
  }

  const updated = await typeRepository.updateType(id, data);
  invalidateTypeCaches();
  return updated;
};

const deleteType = async (id) => {
  // Check if type exists
  const type = await typeRepository.findTypeById(id);
  if (!type) {
    const e = new Error('Không tìm thấy loại món ăn');
    e.status = 404;
    throw e;
  }

  // Check if any foods use this type
  const foodCount = await typeRepository.countFoodsByType(id);
  if (foodCount > 0) {
    const e = new Error(`Không thể xóa loại món ăn này vì có ${foodCount} món ăn đang sử dụng`);
    e.status = 400;
    throw e;
  }

  const deleted = await typeRepository.deleteType(id);
  invalidateTypeCaches();
  return deleted;
};

module.exports = { getAllTypes, createType, updateType, deleteType };
