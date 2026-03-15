const prisma = require('../../client');

// Lấy toàn bộ combo Active (không load chi tiết nặng)
const findAllActiveCombos = async () => {
  const now = new Date();
  // Database lưu giờ VN (UTC+7), cần cộng 7 giờ để so sánh đúng
  now.setHours(now.getHours() + 7);
  
  return prisma.combo.findMany({
    where: { 
      TrangThai: 'Active',
      ThoiGianHetHan: {
        gt: now
      }
    },
    orderBy: { MaCombo: 'asc' },
    select: {
      MaCombo: true,
      TenCombo: true,
      HinhAnh: true,
      GiaCombo: true,
      MoTa: true,
      TrangThai: true,
      NgayTao: true,
      NgayCapNhat: true,
      ThoiGianHetHan: true,
    },
  });
};

// Chi tiết combo theo id: bao gồm các món (BienTheMonAn + Size + MonAn), Đế bánh nếu có
const findComboById = async (id) => {
  return prisma.combo.findUnique({
    where: { MaCombo: Number(id) },
    include: {
      Combo_ChiTiet: {
        include: {
          BienTheMonAn: {
            include: {
              Size: true,
              MonAn: {
                select: {
                  MaMonAn: true,
                  TenMonAn: true,
                  HinhAnh: true,
                  LoaiMonAn: {
                    select: { TenLoaiMonAn: true },
                  },
                },
              },
            },
          },
          DeBanh: true,
        },
      },
      // Các đơn hàng liên quan không cần, bỏ qua để nhẹ
    },
  });
};

// Find combos by a list of statuses (e.g., ['Active','Inactive'])
const findCombosByStatuses = async (statuses = []) => {
  const where = Array.isArray(statuses) && statuses.length > 0
    ? { TrangThai: { in: statuses } }
    : {};
  return prisma.combo.findMany({
    where,
    orderBy: { MaCombo: 'asc' },
    select: {
      MaCombo: true,
      TenCombo: true,
      HinhAnh: true,
      GiaCombo: true,
      MoTa: true,
      TrangThai: true,
      NgayTao: true,
      NgayCapNhat: true,
      ThoiGianHetHan: true,
    },
  });
};

// Tạo combo mới với chi tiết
const createCombo = async (comboData) => {
  const { tenCombo, moTa, giaCombo, hinhAnh, trangThai, thoiGianHetHan, items } = comboData;
  
  return prisma.combo.create({
    data: {
      TenCombo: tenCombo,
      MoTa: moTa || null,
      GiaCombo: giaCombo,
      HinhAnh: hinhAnh,
      TrangThai: trangThai || 'Active',
      ThoiGianHetHan: thoiGianHetHan ? new Date(thoiGianHetHan) : undefined,
      Combo_ChiTiet: {
        create: items.map((item) => ({
          MaBienThe: item.maBienThe,
          SoLuong: item.soLuong,
          MaDeBanh: item.maDeBanh || null,
        })),
      },
    },
    include: {
      Combo_ChiTiet: {
        include: {
          BienTheMonAn: {
            include: {
              Size: true,
              MonAn: {
                select: { MaMonAn: true, TenMonAn: true, HinhAnh: true },
              },
            },
          },
          DeBanh: true,
        },
      },
    },
  });
};

// Cập nhật trạng thái combo (Active/Inactive)
const updateComboStatus = async (id, status) => {
  return prisma.combo.update({
    where: { MaCombo: Number(id) },
    data: {
      TrangThai: status,
      NgayCapNhat: new Date(),
    },
    select: {
      MaCombo: true,
      TenCombo: true,
      HinhAnh: true,
      GiaCombo: true,
      MoTa: true,
      TrangThai: true,
      NgayTao: true,
      NgayCapNhat: true,
      ThoiGianHetHan: true,
    },
  });
};

// Xóa combo (chuyển thành Deleted và xóa chi tiết)
const deleteCombo = async (id) => {
  // Xóa tất cả chi tiết trước
  await prisma.combo_ChiTiet.deleteMany({
    where: { MaCombo: Number(id) },
  });

  // Cập nhật trạng thái combo thành Deleted
  return prisma.combo.update({
    where: { MaCombo: Number(id) },
    data: {
      TrangThai: 'Deleted',
      NgayCapNhat: new Date(),
    },
    select: {
      MaCombo: true,
      TenCombo: true,
      TrangThai: true,
    },
  });
};

// Cập nhật combo (không sửa tên, xóa chi tiết cũ và thêm mới)
const updateCombo = async (id, comboData) => {
  const { moTa, giaCombo, hinhAnh, trangThai, thoiGianHetHan, items } = comboData;
  
  // Xóa tất cả chi tiết cũ
  await prisma.combo_ChiTiet.deleteMany({
    where: { MaCombo: Number(id) },
  });

  // Cập nhật combo và thêm chi tiết mới
  return prisma.combo.update({
    where: { MaCombo: Number(id) },
    data: {
      MoTa: moTa || null,
      GiaCombo: giaCombo,
      HinhAnh: hinhAnh,
      TrangThai: trangThai || 'Active',
      ThoiGianHetHan: thoiGianHetHan ? new Date(thoiGianHetHan) : undefined,
      NgayCapNhat: new Date(),
      Combo_ChiTiet: {
        create: items.map((item) => ({
          MaBienThe: item.maBienThe,
          SoLuong: item.soLuong,
          MaDeBanh: item.maDeBanh || null,
        })),
      },
    },
    include: {
      Combo_ChiTiet: {
        include: {
          BienTheMonAn: {
            include: {
              Size: true,
              MonAn: {
                select: { MaMonAn: true, TenMonAn: true, HinhAnh: true },
              },
            },
          },
          DeBanh: true,
        },
      },
    },
  });
};

module.exports = { 
  findAllActiveCombos, 
  findComboById, 
  findCombosByStatuses, 
  createCombo, 
  updateComboStatus, 
  deleteCombo,
  updateCombo 
};