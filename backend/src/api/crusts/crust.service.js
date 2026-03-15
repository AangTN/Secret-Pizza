const crustRepository = require('./crust.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function invalidateCrustCaches() {
  apiCache.deleteByTags([
    cacheTags.CATALOG,
    cacheTags.CRUSTS,
    cacheTags.FOOD_DETAIL,
    cacheTags.FOODS_LIST,
    cacheTags.COMBO_DETAIL,
  ]);
}

const getAllCrusts = () => {
  const cacheKey = buildCacheKey('catalog', 'crusts');
  return apiCache.getOrSet(
    cacheKey,
    () => crustRepository.findAllCrusts(),
    {
      ttlMs: cacheTtls.CATALOG,
      tags: [cacheTags.CATALOG, cacheTags.CRUSTS],
    }
  );
};

const createCrust = async (data) => {
  if (!data.TenDeBanh || !data.TenDeBanh.trim()) {
    const e = new Error('Tên đế bánh là bắt buộc');
    e.status = 400;
    throw e;
  }
  const created = await crustRepository.createCrust(data);
  invalidateCrustCaches();
  return created;
};

module.exports = { getAllCrusts, createCrust };
