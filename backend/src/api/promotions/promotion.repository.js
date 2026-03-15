const prisma = require('../../client');

// Lấy tất cả khuyến mãi
const findAllPromotions = async () => {
  return prisma.khuyenMai.findMany({
    include: {
      _count: {
        select: { MonAn_KhuyenMai: true },
      },
    },
    orderBy: { KMBatDau: 'desc' },
  });
};

// Lấy các món ăn đang được giảm giá (khuyến mãi active và trong thời gian)
const findDiscountedFoods = async () => {
  const now = new Date();
  
  return prisma.monAn_KhuyenMai.findMany({
    where: {
      KhuyenMai: {
        TrangThai: 'Active',
        KMBatDau: { lte: now },
        KMKetThuc: { gte: now },
      },
      MonAn: {
        TrangThai: 'Active',
      },
    },
    select: {
      MaMonAn: true,
      MaKhuyenMai: true,
    },
  });
};

// Lấy khuyến mãi theo ID
const findPromotionById = async (id) => {
  return prisma.khuyenMai.findUnique({
    where: { MaKhuyenMai: id },
    include: {
      MonAn_KhuyenMai: {
        include: {
          MonAn: true,
        },
      },
      _count: {
        select: { MonAn_KhuyenMai: true },
      },
    },
  });
};

// Tạo khuyến mãi mới
const createPromotion = async (data) => {
  return prisma.khuyenMai.create({
    data: {
      TenKhuyenMai: data.TenKhuyenMai,
      MoTa: data.MoTa || null,
      KMLoai: data.KMLoai,
      KMGiaTri: data.KMGiaTri,
      KMBatDau: data.KMBatDau ? new Date(data.KMBatDau) : null,
      KMKetThuc: data.KMKetThuc ? new Date(data.KMKetThuc) : null,
      TrangThai: data.TrangThai || 'Active',
    },
    include: {
      _count: {
        select: { MonAn_KhuyenMai: true },
      },
    },
  });
};

// Cập nhật khuyến mãi
const updatePromotion = async (id, data) => {
  return prisma.khuyenMai.update({
    where: { MaKhuyenMai: id },
    data: {
      TenKhuyenMai: data.TenKhuyenMai,
      MoTa: data.MoTa || null,
      KMLoai: data.KMLoai,
      KMGiaTri: data.KMGiaTri,
      KMBatDau: data.KMBatDau ? new Date(data.KMBatDau) : null,
      KMKetThuc: data.KMKetThuc ? new Date(data.KMKetThuc) : null,
      TrangThai: data.TrangThai,
    },
    include: {
      _count: {
        select: { MonAn_KhuyenMai: true },
      },
    },
  });
};

// Cập nhật trạng thái khuyến mãi
const updatePromotionStatus = async (id, status) => {
  return prisma.khuyenMai.update({
    where: { MaKhuyenMai: id },
    data: { TrangThai: status },
    include: {
      _count: {
        select: { MonAn_KhuyenMai: true },
      },
    },
  });
};

// Cập nhật danh sách món ăn cho khuyến mãi (xóa hết và thêm lại)
const updatePromotionFoods = async (promotionId, foodIds) => {
  // Xóa tất cả món ăn hiện tại
  await prisma.monAn_KhuyenMai.deleteMany({
    where: { MaKhuyenMai: promotionId },
  });

  // Thêm món ăn mới
  if (foodIds && foodIds.length > 0) {
    await prisma.monAn_KhuyenMai.createMany({
      data: foodIds.map(foodId => ({
        MaKhuyenMai: promotionId,
        MaMonAn: foodId,
      })),
    });
  }

  return true;
};

// Xóa khuyến mãi (xóa trước MonAn_KhuyenMai rồi xóa KhuyenMai)
const deletePromotion = async (promotionId) => {
  // Xóa tất cả liên kết món - khuyến mãi
  await prisma.monAn_KhuyenMai.deleteMany({
    where: { MaKhuyenMai: promotionId },
  });

  // Xóa khuyến mãi
  return prisma.khuyenMai.delete({
    where: { MaKhuyenMai: promotionId },
  });
};

module.exports = {
  findAllPromotions,
  findDiscountedFoods,
  findPromotionById,
  createPromotion,
  updatePromotion,
  updatePromotionStatus,
  updatePromotionFoods,
  deletePromotion,
};
