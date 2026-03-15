const prisma = require('../../client');

async function findAllVouchers() {
  return prisma.voucher.findMany({
    orderBy: { MaVoucher: 'asc' },
    include: { _count: { select: { DonHang: true } } },
  });
}

async function findVoucherByCode(code) {
  return prisma.voucher.findUnique({
    where: { MaVoucher: String(code) },
    include: { _count: { select: { DonHang: true } } },
  });
}

async function createVoucher(data) {
  return prisma.voucher.create({
    data: {
      MaVoucher: data.code,
      MoTa: data.MoTa,
      LoaiGiamGia: data.LoaiGiamGia,
      GiaTri: data.GiaTri,
      DieuKienApDung: data.DieuKienApDung,
      NgayBatDau: data.NgayBatDau,
      NgayKetThuc: data.NgayKetThuc,
      SoLuong: data.SoLuong,
      TrangThai: data.TrangThai || 'Active',
    },
  });
}

async function updateVoucher(code, data) {
  return prisma.voucher.update({
    where: { MaVoucher: String(code) },
    data: {
      MoTa: data.MoTa,
      LoaiGiamGia: data.LoaiGiamGia,
      GiaTri: data.GiaTri,
      DieuKienApDung: data.DieuKienApDung,
      NgayBatDau: data.NgayBatDau,
      NgayKetThuc: data.NgayKetThuc,
      SoLuong: data.SoLuong,
      TrangThai: data.TrangThai,
    },
  });
}

async function updateVoucherStatus(code, status) {
  return prisma.voucher.update({
    where: { MaVoucher: String(code) },
    data: { TrangThai: status },
  });
}

async function findUsersByIds(userIds) {
  return prisma.taiKhoan.findMany({
    where: {
      MaTaiKhoan: { in: userIds }
    },
    include: {
      NguoiDung: true
    }
  });
}

module.exports = { 
  findAllVouchers, 
  findVoucherByCode, 
  createVoucher, 
  updateVoucher, 
  updateVoucherStatus,
  findUsersByIds 
};
