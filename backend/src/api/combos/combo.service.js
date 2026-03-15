const comboRepository = require('./combo.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function invalidateComboCaches(comboId = null) {
  const tags = [
    cacheTags.HOME,
    cacheTags.COMBO_LIST,
    cacheTags.COMBO_DETAIL,
  ];

  if (comboId) {
    tags.push(buildCacheKey(cacheTags.COMBO_DETAIL, Number(comboId)));
  }

  apiCache.deleteByTags(tags);
}

const getAllActiveCombos = () => {
  const cacheKey = buildCacheKey('combos', 'active');
  return apiCache.getOrSet(
    cacheKey,
    () => comboRepository.findAllActiveCombos(),
    {
      ttlMs: cacheTtls.COMBO_LIST,
      tags: [cacheTags.COMBO_LIST, cacheTags.HOME],
    }
  );
};
const getCombosByStatuses = (statuses = []) => comboRepository.findCombosByStatuses(statuses);

const getComboDetail = async (id) => {
  const normalizedId = Number(id);
  const cacheKey = buildCacheKey('combos', 'detail', normalizedId);
  const detailTag = buildCacheKey(cacheTags.COMBO_DETAIL, normalizedId);

  return apiCache.getOrSet(
    cacheKey,
    async () => {
      const combo = await comboRepository.findComboById(id);
      if (!combo) return null;
      // Chuẩn hoá trả về: tách danh sách chi tiết thành mảng items đơn giản
      const { Combo_ChiTiet = [], ...rest } = combo;
      const items = Combo_ChiTiet.map((ct) => ({
        MaCTCombo: ct.MaCTCombo,
        MaBienThe: ct.MaBienThe,
        SoLuong: ct.SoLuong,
        MaDeBanh: ct.MaDeBanh,
        DeBanh: ct.DeBanh || null,
        BienTheMonAn: ct.BienTheMonAn
          ? {
              MaBienThe: ct.BienTheMonAn.MaBienThe,
              GiaBan: ct.BienTheMonAn.GiaBan,
              Size: ct.BienTheMonAn.Size || null,
              MonAn: ct.BienTheMonAn.MonAn || null,
            }
          : null,
      }));
      return { ...rest, Items: items };
    },
    {
      ttlMs: cacheTtls.COMBO_DETAIL,
      tags: [cacheTags.COMBO_DETAIL, detailTag],
    }
  );
};

const createCombo = async (comboData) => {
  // Validate data
  if (!comboData.tenCombo || !comboData.tenCombo.trim()) {
    const err = new Error('Tên combo là bắt buộc');
    err.status = 400;
    throw err;
  }
  if (!comboData.giaCombo || comboData.giaCombo <= 0) {
    const err = new Error('Giá combo phải lớn hơn 0');
    err.status = 400;
    throw err;
  }
  if (!comboData.hinhAnh) {
    const err = new Error('Hình ảnh combo là bắt buộc');
    err.status = 400;
    throw err;
  }
  if (!comboData.items || comboData.items.length === 0) {
    const err = new Error('Combo phải có ít nhất một món');
    err.status = 400;
    throw err;
  }

  // Validate items
  for (const item of comboData.items) {
    if (!item.maBienThe) {
      const err = new Error('Mỗi món phải có mã biến thể');
      err.status = 400;
      throw err;
    }
    if (!item.soLuong || item.soLuong <= 0) {
      const err = new Error('Số lượng món phải lớn hơn 0');
      err.status = 400;
      throw err;
    }
  }

  const combo = await comboRepository.createCombo(comboData);
  invalidateComboCaches(combo?.MaCombo);
  return combo;
};

const updateComboStatus = async (id, status) => {
  // Validate status
  const validStatuses = ['Active', 'Inactive'];
  if (!validStatuses.includes(status)) {
    const err = new Error('Trạng thái không hợp lệ. Chỉ chấp nhận Active hoặc Inactive');
    err.status = 400;
    throw err;
  }

  // Check if combo exists
  const combo = await comboRepository.findComboById(id);
  if (!combo) {
    const err = new Error('Không tìm thấy combo');
    err.status = 404;
    throw err;
  }

  const updated = await comboRepository.updateComboStatus(id, status);
  invalidateComboCaches(id);
  return updated;
};

const deleteCombo = async (id) => {
  // Check if combo exists
  const combo = await comboRepository.findComboById(id);
  if (!combo) {
    const err = new Error('Không tìm thấy combo');
    err.status = 404;
    throw err;
  }

  const deleted = await comboRepository.deleteCombo(id);
  invalidateComboCaches(id);
  return deleted;
};

const updateCombo = async (id, comboData) => {
  // Check if combo exists
  const combo = await comboRepository.findComboById(id);
  if (!combo) {
    const err = new Error('Không tìm thấy combo');
    err.status = 404;
    throw err;
  }

  // Validate data
  if (!comboData.giaCombo || comboData.giaCombo <= 0) {
    const err = new Error('Giá combo phải lớn hơn 0');
    err.status = 400;
    throw err;
  }
  if (!comboData.hinhAnh) {
    const err = new Error('Hình ảnh combo là bắt buộc');
    err.status = 400;
    throw err;
  }
  if (!comboData.items || comboData.items.length === 0) {
    const err = new Error('Combo phải có ít nhất một món');
    err.status = 400;
    throw err;
  }

  // Validate items
  for (const item of comboData.items) {
    if (!item.maBienThe) {
      const err = new Error('Mỗi món phải có mã biến thể');
      err.status = 400;
      throw err;
    }
    if (!item.soLuong || item.soLuong <= 0) {
      const err = new Error('Số lượng món phải lớn hơn 0');
      err.status = 400;
      throw err;
    }
  }

  const updated = await comboRepository.updateCombo(id, comboData);
  invalidateComboCaches(id);
  return updated;
};

module.exports = { 
  getAllActiveCombos, 
  getCombosByStatuses, 
  getComboDetail, 
  createCombo, 
  updateComboStatus, 
  deleteCombo,
  updateCombo 
};