const branchRepository = require('./branch.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

const getAllBranches = () => {
	const cacheKey = buildCacheKey('branches', 'list');
	return apiCache.getOrSet(
		cacheKey,
		() => branchRepository.findAllBranches(),
		{
			ttlMs: cacheTtls.BRANCHES,
			tags: [cacheTags.BRANCHES],
		}
	);
};

module.exports = { getAllBranches }; 
