const foodRepository = require('./food.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function invalidateFoodCaches(foodId = null) {
	const tags = [
		cacheTags.HOME,
		cacheTags.FOODS_LIST,
		cacheTags.BEST_SELLING,
		cacheTags.FEATURED_FOODS,
		cacheTags.FOOD_DETAIL,
		cacheTags.PROMOTION_DISCOUNTED,
		cacheTags.VARIANTS,
		cacheTags.COMBO_LIST,
		cacheTags.COMBO_DETAIL,
	];

	if (foodId) {
		tags.push(buildCacheKey(cacheTags.FOOD_DETAIL, Number(foodId)));
		tags.push(buildCacheKey(cacheTags.REVIEWS_BY_FOOD, Number(foodId)));
	}

	apiCache.deleteByTags(tags);
}

const calcRatingStats = (ratings = []) => {
	const count = ratings.length || 0;
	const avg = count
		? Number((ratings.reduce((sum, r) => sum + (r.SoSao || 0), 0) / count).toFixed(2))
		: 0;
	return { SoDanhGia: count, SoSaoTrungBinh: avg };
};

const getAllFoods = async () => {
	const cacheKey = buildCacheKey('foods', 'list');

	return apiCache.getOrSet(
		cacheKey,
		async () => {
			const [foods, stats] = await Promise.all([
				foodRepository.findAllFoods(),
				foodRepository.findFoodsRatingStats(),
			]);

			// index stats by MaMonAn for quick lookup
			const statsMap = new Map(
				stats.map((s) => [s.MaMonAn, {
					SoSaoTrungBinh: Number((s._avg.SoSao || 0).toFixed(2)),
					SoDanhGia: s._count.SoSao || 0,
				}])
			);

			// Flatten categories, attach stats and promotion info
			return foods.map(({ MonAn_DanhMuc, MonAn_KhuyenMai, ...rest }) => {
				const st = statsMap.get(rest.MaMonAn) || { SoSaoTrungBinh: 0, SoDanhGia: 0 };
				const promotion = MonAn_KhuyenMai && MonAn_KhuyenMai.length > 0
					? MonAn_KhuyenMai[0].KhuyenMai
					: null;

				return {
					...rest,
					DanhMuc: Array.isArray(MonAn_DanhMuc)
						? MonAn_DanhMuc.map((md) => md.DanhMuc)
						: [],
					...st,
					KhuyenMai: promotion,
				};
			});
		},
		{
			ttlMs: cacheTtls.FOODS_LIST,
			tags: [cacheTags.FOODS_LIST, cacheTags.HOME],
		}
	);
};

const getFoodDetail = async (id) => {
	const normalizedId = Number(id);
	const cacheKey = buildCacheKey('foods', 'detail', normalizedId);
	const detailTag = buildCacheKey(cacheTags.FOOD_DETAIL, normalizedId);

	return apiCache.getOrSet(
		cacheKey,
		async () => {
			const food = await foodRepository.findFoodById(id);
			if (!food) return null;

			const { DanhGiaMonAn = [], MonAn_DanhMuc = [], MonAn_KhuyenMai = [], ...rest } = food;
			const { SoDanhGia, SoSaoTrungBinh } = calcRatingStats(DanhGiaMonAn);
			const promotion = MonAn_KhuyenMai && MonAn_KhuyenMai.length > 0
				? MonAn_KhuyenMai[0].KhuyenMai
				: null;

			return {
				...rest,
				DanhMuc: Array.isArray(MonAn_DanhMuc)
					? MonAn_DanhMuc.map((md) => md.DanhMuc)
					: [],
				DanhGiaMonAn, // already filtered to TrangThai = 'Hiển thị'
				SoDanhGia,
				SoSaoTrungBinh,
				KhuyenMai: promotion,
			};
		},
		{
			ttlMs: cacheTtls.FOOD_DETAIL,
			tags: [cacheTags.FOOD_DETAIL, detailTag],
		}
	);
};

const getBestSellingFoods = async (categoryId) => {
	const normalizedCategoryId = categoryId ? Number(categoryId) : 'all';
	const cacheKey = buildCacheKey('foods', 'best-selling', normalizedCategoryId);

	return apiCache.getOrSet(
		cacheKey,
		async () => {
			const [foods, stats] = await Promise.all([
				foodRepository.findBestSellingFoods(8, categoryId),
				foodRepository.findFoodsRatingStats(),
			]);

			// index stats by MaMonAn for quick lookup
			const statsMap = new Map(
				stats.map((s) => [s.MaMonAn, {
					SoSaoTrungBinh: Number((s._avg.SoSao || 0).toFixed(2)),
					SoDanhGia: s._count.SoSao || 0,
				}])
			);

			// Flatten categories, attach stats, promotion and keep totalSold
			return foods.map(({ MonAn_DanhMuc, MonAn_KhuyenMai, totalSold, ...rest }) => {
				const st = statsMap.get(rest.MaMonAn) || { SoSaoTrungBinh: 0, SoDanhGia: 0 };
				const promotion = MonAn_KhuyenMai && MonAn_KhuyenMai.length > 0
					? MonAn_KhuyenMai[0].KhuyenMai
					: null;

				return {
					...rest,
					DanhMuc: Array.isArray(MonAn_DanhMuc)
						? MonAn_DanhMuc.map((md) => md.DanhMuc)
						: [],
					...st,
					totalSold: totalSold || 0,
					KhuyenMai: promotion,
				};
			});
		},
		{
			ttlMs: cacheTtls.BEST_SELLING,
			tags: [cacheTags.BEST_SELLING, cacheTags.HOME],
		}
	);
};

const getFeaturedFoods = async () => {
	const cacheKey = buildCacheKey('foods', 'featured');

	return apiCache.getOrSet(
		cacheKey,
		async () => {
			const foods = await foodRepository.findFeaturedFoods();

			// Flatten categories and add promotion info
			return foods.map(({ MonAn_DanhMuc, MonAn_KhuyenMai, ...rest }) => {
				const promotion = MonAn_KhuyenMai && MonAn_KhuyenMai.length > 0
					? MonAn_KhuyenMai[0].KhuyenMai
					: null;

				return {
					...rest,
					DanhMuc: Array.isArray(MonAn_DanhMuc)
						? MonAn_DanhMuc.map((md) => md.DanhMuc)
						: [],
					KhuyenMai: promotion,
				};
			});
		},
		{
			ttlMs: cacheTtls.FEATURED_FOODS,
			tags: [cacheTags.FEATURED_FOODS, cacheTags.HOME],
		}
	);
};

const createFood = async (foodData) => {
	// Validate required fields
	if (!foodData.tenMonAn || !foodData.maLoaiMonAn) {
		const e = new Error('Thiếu thông tin bắt buộc: tenMonAn, maLoaiMonAn');
		e.status = 400;
		throw e;
	}

	if (!foodData.bienThe || foodData.bienThe.length === 0) {
		const e = new Error('Phải có ít nhất 1 biến thể (size và giá)');
		e.status = 400;
		throw e;
	}

	// Validate each variant has required price (maSize can be null for non-pizza items)
	for (const bt of foodData.bienThe) {
		if (bt.giaBan === undefined || bt.giaBan === null) {
			const e = new Error('Mỗi biến thể phải có giaBan');
			e.status = 400;
			throw e;
		}
		// maSize can be null for non-pizza foods (drinks, sides, etc.)
	}

	// Validate pizza foods must have at least 1 crust
	const prisma = require('../../client');
	const loaiMonAn = await prisma.loaiMonAn.findUnique({
		where: { MaLoaiMonAn: Number(foodData.maLoaiMonAn) },
	});

	if (!loaiMonAn) {
		const e = new Error('Loại món ăn không tồn tại');
		e.status = 400;
		throw e;
	}

	const isPizza = loaiMonAn.TenLoaiMonAn.toLowerCase().includes('pizza');
	if (isPizza && (!foodData.danhSachMaDeBanh || foodData.danhSachMaDeBanh.length === 0)) {
		const e = new Error('Món ăn loại Pizza phải có ít nhất 1 đế bánh');
		e.status = 400;
		throw e;
	}

	const created = await foodRepository.createFood(foodData);
	invalidateFoodCaches(created?.MaMonAn);
	return created;
};

const updateFood = async (id, foodData) => {
	// Validate required fields (exclude tenMonAn since it cannot be changed)
	if (!foodData.maLoaiMonAn) {
		const e = new Error('Thiếu thông tin bắt buộc: maLoaiMonAn');
		e.status = 400;
		throw e;
	}

	if (!foodData.bienThe || foodData.bienThe.length === 0) {
		const e = new Error('Phải có ít nhất 1 biến thể (size và giá)');
		e.status = 400;
		throw e;
	}

	// Validate each variant has required price
	for (const bt of foodData.bienThe) {
		if (bt.giaBan === undefined || bt.giaBan === null) {
			const e = new Error('Mỗi biến thể phải có giaBan');
			e.status = 400;
			throw e;
		}
	}

	// Validate pizza foods must have at least 1 crust
	const prisma = require('../../client');
	const loaiMonAn = await prisma.loaiMonAn.findUnique({
		where: { MaLoaiMonAn: Number(foodData.maLoaiMonAn) },
	});

	if (!loaiMonAn) {
		const e = new Error('Loại món ăn không tồn tại');
		e.status = 400;
		throw e;
	}

	const isPizza = loaiMonAn.TenLoaiMonAn.toLowerCase().includes('pizza');
	if (isPizza && (!foodData.danhSachMaDeBanh || foodData.danhSachMaDeBanh.length === 0)) {
		const e = new Error('Món ăn loại Pizza phải có ít nhất 1 đế bánh');
		e.status = 400;
		throw e;
	}

	const updated = await foodRepository.updateFood(id, foodData);
	invalidateFoodCaches(id);
	return updated;
};

const getAllFoodsAdmin = async () => {
	const [foods, stats] = await Promise.all([
		foodRepository.findAllFoodsAdmin(),
		foodRepository.findFoodsRatingStats(),
	]);

	// index stats by MaMonAn for quick lookup
	const statsMap = new Map(
		stats.map((s) => [s.MaMonAn, {
			SoSaoTrungBinh: Number((s._avg.SoSao || 0).toFixed(2)),
			SoDanhGia: s._count.SoSao || 0,
		}])
	);

	// Flatten categories, attach stats and promotion info (include TrangThai for admin)
	return foods.map(({ MonAn_DanhMuc, MonAn_KhuyenMai, ...rest }) => {
		const st = statsMap.get(rest.MaMonAn) || { SoSaoTrungBinh: 0, SoDanhGia: 0 };
		const promotion = MonAn_KhuyenMai
			? MonAn_KhuyenMai 
			: null;
		
		return {
			...rest,
			DanhMuc: Array.isArray(MonAn_DanhMuc)
				? MonAn_DanhMuc.map((md) => md.DanhMuc)
				: [],
			...st,
			KhuyenMai: promotion,
		};
	});
};

const deleteFood = async (id) => {
	// Kiểm tra món ăn có trong combo nào không
	const combosUsingFood = await foodRepository.checkFoodInCombo(id);
	
	if (combosUsingFood.length > 0) {
		const comboNames = combosUsingFood.map(c => c.TenCombo).join(', ');
		const e = new Error(
			`Không thể xóa món ăn này vì đang được sử dụng trong ${combosUsingFood.length} combo: ${comboNames}`
		);
		e.status = 400;
		throw e;
	}

	const deleted = await foodRepository.softDeleteFood(id);
	invalidateFoodCaches(id);
	return deleted;
};

module.exports = { getAllFoods, getAllFoodsAdmin, getFoodDetail, getBestSellingFoods, getFeaturedFoods, createFood, updateFood, deleteFood };
