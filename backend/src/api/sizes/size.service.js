const sizeRepository = require('./size.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

const getAllSizes = async () => {
  const cacheKey = buildCacheKey('catalog', 'sizes');
  return apiCache.getOrSet(
    cacheKey,
    () => sizeRepository.findAllSizes(),
    {
      ttlMs: cacheTtls.CATALOG,
      tags: [cacheTags.CATALOG, cacheTags.SIZES],
    }
  );
};

module.exports = { getAllSizes };
