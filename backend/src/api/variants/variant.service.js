const repo = require('./variant.repository');
const { apiCache, cacheTags, buildCacheKey } = require('../../utils/cache');

const VARIANT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const getAllVariants = () => {
	const cacheKey = buildCacheKey('variants', 'list');
	return apiCache.getOrSet(
		cacheKey,
		() => repo.findAllVariants(),
		{
			ttlMs: VARIANT_CACHE_TTL_MS,
			tags: [cacheTags.VARIANTS],
		}
	);
};

const getAllOptionPrices = () => {
	const cacheKey = buildCacheKey('variants', 'option-prices');
	return apiCache.getOrSet(
		cacheKey,
		() => repo.findAllOptionPrices(),
		{
			ttlMs: VARIANT_CACHE_TTL_MS,
			tags: [cacheTags.VARIANTS, cacheTags.OPTIONS],
		}
	);
};

module.exports = { getAllVariants, getAllOptionPrices };
