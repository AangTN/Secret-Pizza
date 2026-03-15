const prisma = require('../../client');

async function createReview(data) {
  return prisma.danhGiaMonAn.create({
    data: {
      MaMonAn: data.maMonAn,
      MaTaiKhoan: data.maTaiKhoan,
      SoSao: data.soSao,
      NoiDung: data.noiDung || null,
      TrangThai: 'Chờ duyệt',
      NgayDanhGia: new Date(),
    },
    include: {
      MonAn: {
        select: {
          MaMonAn: true,
          TenMonAn: true,
          HinhAnh: true,
        },
      },
      TaiKhoan: {
        include: {
          NguoiDung: {
            select: {
              HoTen: true,
            },
          },
        },
      },
    },
  });
}

async function findReviewsByFoodId(maMonAn) {
  return prisma.danhGiaMonAn.findMany({
    where: { 
      MaMonAn: Number(maMonAn),
      TrangThai: 'Hiển thị',
    },
    orderBy: {
      NgayDanhGia: 'desc',
    },
    include: {
      TaiKhoan: {
        include: {
          NguoiDung: {
            select: {
              HoTen: true,
            },
          },
        },
      },
    },
  });
}

async function findAllReviews() {
  return prisma.danhGiaMonAn.findMany({
    orderBy: {
      NgayDanhGia: 'desc',
    },
    include: {
      MonAn: {
        select: {
          MaMonAn: true,
          TenMonAn: true,
          HinhAnh: true,
        },
      },
      TaiKhoan: {
        include: {
          NguoiDung: {
            select: {
              HoTen: true,
            },
          },
        },
      },
    },
  });
}

async function updateReviewStatus(maDanhGia, trangThai) {
  return prisma.danhGiaMonAn.update({
    where: { MaDanhGiaMonAn: Number(maDanhGia) },
    data: { TrangThai: trangThai },
  });
}

async function deleteReview(maDanhGia) {
  return prisma.danhGiaMonAn.delete({
    where: { MaDanhGiaMonAn: Number(maDanhGia) },
  });
}

async function checkUserCanReview(maTaiKhoan, maMonAn) {
  // Kiểm tra xem user đã đánh giá món này chưa
  const existingReview = await prisma.danhGiaMonAn.findFirst({
    where: {
      MaTaiKhoan: Number(maTaiKhoan),
      MaMonAn: Number(maMonAn),
    },
  });
  
  if (existingReview) {
    return { canReview: false, reason: 'already_reviewed' };
  }
  
  // Tìm MaNguoiDung từ tài khoản theo schema mới (TaiKhoan -> NguoiDung)
  const account = await prisma.taiKhoan.findUnique({
    where: { MaTaiKhoan: Number(maTaiKhoan) },
    select: { MaNguoiDung: true },
  });

  if (!account?.MaNguoiDung) {
    return { canReview: false, reason: 'user_not_found' };
  }
  
  // Kiểm tra xem user có đơn hàng nào chứa món ăn này và đã giao chưa
  const completedOrder = await prisma.donHang.findFirst({
    where: {
      MaNguoiDung: account.MaNguoiDung,
      ChiTietDonHang: {
        some: {
          BienTheMonAn: {
            MaMonAn: Number(maMonAn),
          },
        },
      },
      LichSuTrangThaiDonHang: {
        some: {
          TrangThai: 'Đã giao',
        },
      },
    },
  });
  
  if (!completedOrder) {
    return { canReview: false, reason: 'no_completed_order' };
  }
  
  return { canReview: true };
}

module.exports = {
  createReview,
  findReviewsByFoodId,
  findAllReviews,
  updateReviewStatus,
  deleteReview,
  checkUserCanReview,
};
