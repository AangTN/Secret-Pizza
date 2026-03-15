const prisma = require('../../client');

/**
 * Find all active gifts
 */
const findActiveGifts = async () => {
  return prisma.quaTang.findMany({
    where: { TrangThai: 'Active' },
    orderBy: { TyLeXuatHien: 'asc' },
  });
};

/**
 * Find all gifts (for admin)
 */
const findAllGifts = async () => {
  return prisma.quaTang.findMany({
    orderBy: { MaQuaTang: 'desc' },
  });
};

/**
 * Find gift by ID
 */
const findGiftById = async (id) => {
  return prisma.quaTang.findUnique({
    where: { MaQuaTang: Number(id) },
  });
};

/**
 * Find gift by CapDo and status
 */
const findGiftByCapDo = async (capDo, status = 'Active') => {
  return prisma.quaTang.findFirst({
    where: {
      CapDo: capDo,
      TrangThai: status,
    },
  });
};

/**
 * Find gifts by CapDo and status
 */
const findGiftsByCapDo = async (capDoList, status = 'Active') => {
  return prisma.quaTang.findMany({
    where: {
      CapDo: { in: capDoList },
      TrangThai: status,
    },
  });
};

/**
 * Create single gift
 */
const createGift = async (giftData) => {
  return prisma.quaTang.create({
    data: {
      TenQuaTang: giftData.TenQuaTang,
      MoTa: giftData.MoTa || null,
      HinhAnh: giftData.HinhAnh || null,
      CapDo: giftData.CapDo,
      TyLeXuatHien: giftData.TyLeXuatHien,
      TrangThai: 'Active',
    },
  });
};

/**
 * Update gift
 */
const updateGift = async (id, giftData) => {
  return prisma.quaTang.update({
    where: { MaQuaTang: Number(id) },
    data: {
      MoTa: giftData.MoTa,
      HinhAnh: giftData.HinhAnh,
      CapDo: giftData.CapDo,
      TyLeXuatHien: giftData.TyLeXuatHien,
      TrangThai: giftData.TrangThai || 'Active',
    },
  });
};

/**
 * Update multiple gifts to Deleted status
 */
const updateManyToDeleted = async (ids) => {
  return prisma.quaTang.updateMany({
    where: { MaQuaTang: { in: ids } },
    data: { TrangThai: 'Deleted' },
  });
};

/**
 * Soft delete gift (set status to Inactive)
 */
const softDeleteGift = async (id) => {
  return prisma.quaTang.update({
    where: { MaQuaTang: Number(id) },
    data: { TrangThai: 'Inactive' },
  });
};

/**
 * Execute transaction
 */
const executeTransaction = async (callback) => {
  return prisma.$transaction(callback);
};

module.exports = {
  findActiveGifts,
  findAllGifts,
  findGiftById,
  findGiftByCapDo,
  findGiftsByCapDo,
  createGift,
  updateGift,
  updateManyToDeleted,
  softDeleteGift,
  executeTransaction,
};
