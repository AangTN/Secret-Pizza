const categoryRepository = require('./category.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function invalidateCategoryCaches() {
  apiCache.deleteByTags([
    cacheTags.CATALOG,
    cacheTags.CATEGORIES,
    cacheTags.FOODS_LIST,
    cacheTags.FOOD_DETAIL,
    cacheTags.BEST_SELLING,
    cacheTags.FEATURED_FOODS,
    cacheTags.HOME,
  ]);
}

const getAllCategories = () => {
  const cacheKey = buildCacheKey('catalog', 'categories');
  return apiCache.getOrSet(
    cacheKey,
    () => categoryRepository.findAllCategories(),
    {
      ttlMs: cacheTtls.CATALOG,
      tags: [cacheTags.CATALOG, cacheTags.CATEGORIES],
    }
  );
};

const createCategory = async (data) => {
  // Validate required fields
  if (!data.tenDanhMuc) {
    const e = new Error('Thiếu thông tin bắt buộc: tenDanhMuc');
    e.status = 400;
    throw e;
  }

  // Check for duplicate name
  const existing = await categoryRepository.findCategoryByName(data.tenDanhMuc);
  if (existing) {
    const e = new Error('Tên danh mục đã tồn tại');
    e.status = 400;
    throw e;
  }

  const created = await categoryRepository.createCategory(data);
  invalidateCategoryCaches();
  return created;
};

const updateCategory = async (id, data) => {
  // Validate required fields
  if (!data.tenDanhMuc) {
    const e = new Error('Thiếu thông tin bắt buộc: tenDanhMuc');
    e.status = 400;
    throw e;
  }

  // Check if category exists
  const category = await categoryRepository.findCategoryById(id);
  if (!category) {
    const e = new Error('Không tìm thấy danh mục');
    e.status = 404;
    throw e;
  }

  // Check for duplicate name (exclude current record)
  const existing = await categoryRepository.findCategoryByName(data.tenDanhMuc);
  if (existing && existing.MaDanhMuc !== Number(id)) {
    const e = new Error('Tên danh mục đã tồn tại');
    e.status = 400;
    throw e;
  }

  const updated = await categoryRepository.updateCategory(id, data);
  invalidateCategoryCaches();
  return updated;
};

const deleteCategory = async (id) => {
  // Check if category exists
  const category = await categoryRepository.findCategoryById(id);
  if (!category) {
    const e = new Error('Không tìm thấy danh mục');
    e.status = 404;
    throw e;
  }

  // Delete all relations first
  await categoryRepository.deleteCategoryRelations(id);

  const deleted = await categoryRepository.deleteCategory(id);
  invalidateCategoryCaches();
  return deleted;
};

module.exports = { getAllCategories, createCategory, updateCategory, deleteCategory };
