const prisma = require('../../client');

/**
 * Thống kê sản phẩm bán chạy nhất (không bao gồm combo)
 * @param {Object} options - { limit, branchId, startDate, endDate }
 */
async function getBestSellingProducts(options = {}) {
  const { limit = 10, branchId, startDate, endDate } = options;
  
  // Build where condition for orders first
  const orderWhere = {};
  if (branchId) orderWhere.MaCoSo = Number(branchId);
  if (startDate || endDate) {
    orderWhere.NgayDat = {};
    if (startDate) orderWhere.NgayDat.gte = new Date(startDate);
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      orderWhere.NgayDat.lt = endDateTime;
    }
  }

  // Get order IDs that match the filter - chỉ lấy đơn Đã giao
  const orders = await prisma.donHang.findMany({
    where: orderWhere,
    select: { 
      MaDonHang: true,
      LichSuTrangThaiDonHang: {
        orderBy: { ThoiGianCapNhat: 'desc' },
        take: 1,
        select: { TrangThai: true },
      },
    },
  });
  
  // Filter only completed orders
  const completedOrderIds = orders
    .filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao')
    .map(o => o.MaDonHang);
  
  if (completedOrderIds.length === 0) {
    return [];
  }

  const result = await prisma.chiTietDonHang.groupBy({
    by: ['MaBienThe'],
    where: {
      Loai: 'SP', // Chỉ lấy sản phẩm, không lấy combo
      MaDonHang: { in: completedOrderIds },
    },
    _sum: {
      SoLuong: true,
      ThanhTien: true,
    },
    _count: {
      MaChiTiet: true,
    },
    orderBy: {
      _sum: {
        SoLuong: 'desc',
      },
    },
    take: limit,
  });

  // Lấy thông tin chi tiết sản phẩm
  const detailedResults = await Promise.all(
    result.map(async (item) => {
      const variant = await prisma.bienTheMonAn.findUnique({
        where: { MaBienThe: item.MaBienThe },
        include: {
          MonAn: {
            include: {
              MonAn_DanhMuc: {
                include: {
                  DanhMuc: true,
                },
              },
            },
          },
          Size: true,
        },
      });

      return {
        MaBienThe: item.MaBienThe,
        TongSoLuongBan: item._sum.SoLuong || 0,
        TongDoanhThu: item._sum.ThanhTien || 0,
        SoDonHang: item._count.MaChiTiet || 0,
        ThongTinSanPham: variant,
      };
    })
  );

  return detailedResults;
}

/**
 * Thống kê combo bán chạy nhất
 * @param {Object} options - { limit, branchId, startDate, endDate }
 */
async function getBestSellingCombos(options = {}) {
  const { limit = 10, branchId, startDate, endDate } = options;
  
  // Build where condition for orders
  const orderWhere = {};
  if (branchId) orderWhere.MaCoSo = Number(branchId);
  if (startDate || endDate) {
    orderWhere.NgayDat = {};
    if (startDate) orderWhere.NgayDat.gte = new Date(startDate);
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      orderWhere.NgayDat.lt = endDateTime;
    }
  }

  // Get order IDs that match the filter - chỉ lấy đơn Đã giao
  const orders = await prisma.donHang.findMany({
    where: orderWhere,
    select: { 
      MaDonHang: true,
      LichSuTrangThaiDonHang: {
        orderBy: { ThoiGianCapNhat: 'desc' },
        take: 1,
        select: { TrangThai: true },
      },
    },
  });
  
  // Filter only completed orders
  const completedOrderIds = orders
    .filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao')
    .map(o => o.MaDonHang);
  
  if (completedOrderIds.length === 0) {
    return [];
  }

  const result = await prisma.chiTietDonHang.groupBy({
    by: ['MaCombo'],
    where: {
      Loai: 'CB',
      MaCombo: { not: null },
      MaDonHang: { in: completedOrderIds },
    },
    _sum: {
      SoLuong: true,
      ThanhTien: true,
    },
    _count: {
      MaChiTiet: true,
    },
    orderBy: {
      _sum: {
        SoLuong: 'desc',
      },
    },
    take: limit,
  });

  const detailedResults = await Promise.all(
    result.map(async (item) => {
      const combo = await prisma.combo.findUnique({
        where: { MaCombo: item.MaCombo },
        select: {
          MaCombo: true,
          TenCombo: true,
          MoTa: true,
          HinhAnh: true,
          GiaCombo: true,
          TrangThai: true,
        },
      });

      return {
        MaCombo: item.MaCombo,
        TongSoLuongBan: item._sum.SoLuong || 0,
        TongDoanhThu: item._sum.ThanhTien || 0,
        SoDonHang: item._count.MaChiTiet || 0,
        ThongTinCombo: combo,
      };
    })
  );

  return detailedResults;
}

/**
 * Thống kê doanh thu theo cơ sở
 * @param {Object} options - { startDate, endDate }
 */
async function getRevenueByBranch(options = {}) {
  const { startDate, endDate } = options;
  
  const whereCondition = {};
  if (startDate || endDate) {
    whereCondition.NgayDat = {};
    if (startDate) whereCondition.NgayDat.gte = new Date(startDate);
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      whereCondition.NgayDat.lt = endDateTime;
    }
  }

  // Lấy tất cả đơn hàng với trạng thái - chỉ lấy Đã giao
  const orders = await prisma.donHang.findMany({
    where: whereCondition,
    select: {
      MaDonHang: true,
      MaCoSo: true,
      TongTien: true,
      TienGiamGia: true,
      PhiShip: true,
      LichSuTrangThaiDonHang: {
        orderBy: { ThoiGianCapNhat: 'desc' },
        take: 1,
        select: { TrangThai: true },
      },
    },
  });

  // Filter only completed orders và group theo cơ sở
  const branchGroups = {};
  orders
    .filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao')
    .forEach(order => {
      const maCoSo = order.MaCoSo;
      if (!branchGroups[maCoSo]) {
        branchGroups[maCoSo] = {
          MaCoSo: maCoSo,
          TongTien: 0,
          TienGiamGia: 0,
          PhiShip: 0,
          count: 0,
        };
      }
      branchGroups[maCoSo].TongTien += Number(order.TongTien) || 0;
      branchGroups[maCoSo].TienGiamGia += Number(order.TienGiamGia) || 0;
      branchGroups[maCoSo].PhiShip += Number(order.PhiShip) || 0;
      branchGroups[maCoSo].count += 1;
    });

  const result = Object.values(branchGroups).sort((a, b) => b.TongTien - a.TongTien);

  // Lấy thông tin chi tiết cơ sở
  const detailedResults = await Promise.all(
    result.map(async (item) => {
      const branch = await prisma.coSo.findUnique({
        where: { MaCoSo: item.MaCoSo },
        select: {
          MaCoSo: true,
          TenCoSo: true,
          SoDienThoai: true,
          SoNhaDuong: true,
          PhuongXa: true,
          QuanHuyen: true,
          ThanhPho: true,
        },
      });

      return {
        MaCoSo: item.MaCoSo,
        TongDoanhThu: item.TongTien || 0,
        TongGiamGia: item.TienGiamGia || 0,
        TongPhiShip: item.PhiShip || 0,
        SoDonHang: item.count || 0,
        DoanhThuThucTe: (item.TongTien || 0) - (item.TienGiamGia || 0),
        ThongTinCoSo: branch,
      };
    })
  );

  return detailedResults;
}

/**
 * Thống kê tổng quan doanh thu
 * @param {Object} options - { startDate, endDate, branchId }
 */
async function getOverallRevenue(options = {}) {
  const { startDate, endDate, branchId } = options;
  
  const whereCondition = {};
  if (branchId) whereCondition.MaCoSo = Number(branchId);
  if (startDate || endDate) {
    whereCondition.NgayDat = {};
    if (startDate) whereCondition.NgayDat.gte = new Date(startDate);
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      whereCondition.NgayDat.lt = endDateTime;
    }
  }

  // Lấy tất cả đơn hàng với trạng thái - chỉ lấy Đã giao
  const orders = await prisma.donHang.findMany({
    where: whereCondition,
    select: {
      TongTien: true,
      TienTruocGiamGia: true,
      TienGiamGia: true,
      PhiShip: true,
      LichSuTrangThaiDonHang: {
        orderBy: { ThoiGianCapNhat: 'desc' },
        take: 1,
        select: { TrangThai: true },
      },
    },
  });

  // Filter only completed orders
  const completedOrders = orders.filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao');
  
  // Calculate aggregates manually
  const result = completedOrders.reduce((acc, order) => {
    acc.TongTien += Number(order.TongTien) || 0;
    acc.TienTruocGiamGia += Number(order.TienTruocGiamGia) || 0;
    acc.TienGiamGia += Number(order.TienGiamGia) || 0;
    acc.PhiShip += Number(order.PhiShip) || 0;
    acc.count += 1;
    return acc;
  }, { TongTien: 0, TienTruocGiamGia: 0, TienGiamGia: 0, PhiShip: 0, count: 0 });

  return {
    TongDoanhThu: result.TongTien || 0,
    TongTienHang: result.TienTruocGiamGia || 0,
    TongGiamGia: result.TienGiamGia || 0,
    TongPhiShip: result.PhiShip || 0,
    SoDonHang: result.count || 0,
    GiaTriTrungBinh: result.count > 0 ? result.TongTien / result.count : 0,
    DoanhThuThucTe: (result.TongTien || 0) - (result.TienGiamGia || 0),
  };
}

/**
 * Thống kê số lượng đơn hàng theo khoảng thời gian
 * @param {Object} options - { startDate, endDate, branchId, groupBy }
 */
async function getOrderCountByPeriod(options = {}) {
  const { startDate, endDate, branchId, groupBy = 'day' } = options;
  
  const whereCondition = {};
  if (branchId) whereCondition.MaCoSo = Number(branchId);
  if (startDate || endDate) {
    whereCondition.NgayDat = {};
    if (startDate) whereCondition.NgayDat.gte = new Date(startDate);
    if (endDate) {
      // Thêm 1 ngày để bao gồm toàn bộ ngày endDate
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      whereCondition.NgayDat.lt = endDateTime;
    }
  }

  // Lấy tất cả đơn hàng trong khoảng thời gian với trạng thái
  const orders = await prisma.donHang.findMany({
    where: whereCondition,
    select: {
      MaDonHang: true,
      NgayDat: true,
      TongTien: true,
      MaCoSo: true,
      LichSuTrangThaiDonHang: {
        orderBy: { ThoiGianCapNhat: 'desc' },
        take: 1,
        select: { TrangThai: true },
      },
    },
    orderBy: { NgayDat: 'asc' },
  });

  // Filter only completed orders
  const completedOrders = orders.filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao');

  // Nhóm theo ngày/tuần/tháng
  // Database lưu giờ VN nhưng JS đọc như UTC, nên dùng getUTC* để lấy giá trị đúng
  const grouped = {};
  completedOrders.forEach(order => {
    const date = new Date(order.NgayDat);
    let key;
    
    if (groupBy === 'day') {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      key = `${year}-${month}-${day}`;
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
      const year = weekStart.getUTCFullYear();
      const month = String(weekStart.getUTCMonth() + 1).padStart(2, '0');
      const day = String(weekStart.getUTCDate()).padStart(2, '0');
      key = `${year}-${month}-${day}`;
    } else if (groupBy === 'month') {
      key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    } else if (groupBy === 'year') {
      key = String(date.getUTCFullYear());
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        count: 0,
        totalRevenue: 0,
      };
    }
    
    grouped[key].count += 1;
    grouped[key].totalRevenue += Number(order.TongTien) || 0;
  });

  return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Thống kê theo trạng thái đơn hàng
 * @param {Object} options - { startDate, endDate, branchId }
 */
async function getOrdersByStatus(options = {}) {
  const { startDate, endDate, branchId } = options;
  
  const whereCondition = {};
  if (branchId) whereCondition.MaCoSo = Number(branchId);
  if (startDate || endDate) {
    whereCondition.NgayDat = {};
    if (startDate) whereCondition.NgayDat.gte = new Date(startDate);
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      whereCondition.NgayDat.lt = endDateTime;
    }
  }

  // Lấy tất cả đơn hàng với trạng thái mới nhất
  const orders = await prisma.donHang.findMany({
    where: whereCondition,
    select: {
      MaDonHang: true,
      TongTien: true,
      LichSuTrangThaiDonHang: {
        orderBy: { ThoiGianCapNhat: 'desc' },
        take: 1,
        select: { TrangThai: true },
      },
    },
  });

  // Nhóm theo trạng thái
  const statusGroups = {};
  orders.forEach(order => {
    const status = order.LichSuTrangThaiDonHang[0]?.TrangThai || 'Không rõ';
    if (!statusGroups[status]) {
      statusGroups[status] = {
        TrangThai: status,
        SoDonHang: 0,
        TongDoanhThu: 0,
      };
    }
    statusGroups[status].SoDonHang += 1;
    statusGroups[status].TongDoanhThu += Number(order.TongTien) || 0;
  });

  return Object.values(statusGroups).sort((a, b) => b.SoDonHang - a.SoDonHang);
}

/**
 * Thống kê theo phương thức thanh toán
 * @param {Object} options - { startDate, endDate, branchId }
 */
async function getOrdersByPaymentMethod(options = {}) {
  const { startDate, endDate, branchId } = options;
  
  // Build where condition for orders
  const orderWhere = {};
  if (branchId) orderWhere.MaCoSo = Number(branchId);
  if (startDate || endDate) {
    orderWhere.NgayDat = {};
    if (startDate) orderWhere.NgayDat.gte = new Date(startDate);
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      orderWhere.NgayDat.lt = endDateTime;
    }
  }

  // Get order IDs that match the filter - chỉ lấy đơn Đã giao
  const orders = await prisma.donHang.findMany({
    where: orderWhere,
    select: { 
      MaDonHang: true,
      LichSuTrangThaiDonHang: {
        orderBy: { ThoiGianCapNhat: 'desc' },
        take: 1,
        select: { TrangThai: true },
      },
    },
  });
  
  // Filter only completed orders
  const completedOrderIds = orders
    .filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao')
    .map(o => o.MaDonHang);
  
  if (completedOrderIds.length === 0) {
    return [];
  }

  const result = await prisma.thanhToan.groupBy({
    by: ['PhuongThuc'],
    where: {
      MaDonHang: { in: completedOrderIds },
      PhuongThuc: { in: ['Tiền Mặt', 'Chuyển Khoản'] },
    },
    _sum: {
      SoTien: true,
    },
    _count: {
      MaThanhToan: true,
    },
  });

  return result.map(item => ({
    PhuongThuc: item.PhuongThuc,
    SoGiaoDich: item._count.MaThanhToan || 0,
    TongTien: item._sum.SoTien || 0,
  }));
}

/**
 * So sánh doanh thu giữa các cơ sở theo thời gian
 * @param {Object} options - { startDate, endDate, groupBy }
 */
async function getRevenueComparisonByBranch(options = {}) {
  const { startDate, endDate, groupBy = 'day' } = options;
  
  const whereCondition = {};
  if (startDate || endDate) {
    whereCondition.NgayDat = {};
    if (startDate) whereCondition.NgayDat.gte = new Date(startDate);
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      whereCondition.NgayDat.lt = endDateTime;
    }
  }

  // Lấy tất cả đơn hàng với thông tin cơ sở và trạng thái
  const orders = await prisma.donHang.findMany({
    where: whereCondition,
    select: {
      MaDonHang: true,
      NgayDat: true,
      TongTien: true,
      MaCoSo: true,
      CoSo: {
        select: {
          TenCoSo: true,
        },
      },
      LichSuTrangThaiDonHang: {
        orderBy: { ThoiGianCapNhat: 'desc' },
        take: 1,
        select: { TrangThai: true },
      },
    },
    orderBy: { NgayDat: 'asc' },
  });

  // Filter only completed orders
  const completedOrders = orders.filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao');

  // Nhóm theo cơ sở và thời gian
  const grouped = {};
  
  completedOrders.forEach(order => {
    const date = new Date(order.NgayDat);
    let key;
    
    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    } else if (groupBy === 'year') {
      key = String(date.getFullYear());
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        branches: {},
      };
    }

    const branchId = order.MaCoSo;
    const branchName = order.CoSo?.TenCoSo || `Cơ sở ${branchId}`;
    
    if (!grouped[key].branches[branchId]) {
      grouped[key].branches[branchId] = {
        branchId,
        branchName,
        revenue: 0,
        orderCount: 0,
      };
    }
    
    grouped[key].branches[branchId].revenue += Number(order.TongTien) || 0;
    grouped[key].branches[branchId].orderCount += 1;
  });

  // Chuyển đổi sang format dễ dùng cho frontend
  const result = Object.values(grouped).map(item => {
    const data = {
      period: item.period,
    };
    
    Object.values(item.branches).forEach(branch => {
      data[branch.branchName] = branch.revenue;
      data[`${branch.branchName}_orders`] = branch.orderCount;
    });
    
    return data;
  }).sort((a, b) => a.period.localeCompare(b.period));

  return result;
}

/**
 * Dashboard overview - Tổng quan nhanh
 * @param {Object} options - { branchId }
 */
async function getDashboardOverview(options = {}) {
  const { branchId } = options;
  const now = new Date();
  
  // Database lưu giờ VN nhưng Prisma đọc như UTC
  // Cần lấy 00:00:00 theo giờ VN, rồi trừ 7 giờ để có giá trị UTC tương ứng
  const nowVN = new Date(now.getTime() + 7 * 60 * 60 * 1000); // Giờ VN
  const todayVN = new Date(nowVN.getFullYear(), nowVN.getMonth(), nowVN.getDate()); // 00:00:00 VN
  const today = new Date(todayVN.getTime() - 7 * 60 * 60 * 1000); // Chuyển về UTC để so sánh
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const startOfMonthVN = new Date(nowVN.getFullYear(), nowVN.getMonth(), 1);
  const startOfMonth = new Date(startOfMonthVN.getTime() - 7 * 60 * 60 * 1000);

  const whereBase = branchId ? { MaCoSo: Number(branchId) } : {};

  // Lấy tất cả đơn hàng với trạng thái - chỉ tính đơn Đã giao
  const [todayOrders, weekOrders, monthOrders, allOrders] = await Promise.all([
    // Hôm nay
    prisma.donHang.findMany({
      where: { ...whereBase, NgayDat: { gte: today } },
      select: {
        TongTien: true,
        TienGiamGia: true,
        LichSuTrangThaiDonHang: {
          orderBy: { ThoiGianCapNhat: 'desc' },
          take: 1,
          select: { TrangThai: true },
        },
      },
    }),
    // Tuần này
    prisma.donHang.findMany({
      where: { ...whereBase, NgayDat: { gte: startOfWeek } },
      select: {
        TongTien: true,
        TienGiamGia: true,
        LichSuTrangThaiDonHang: {
          orderBy: { ThoiGianCapNhat: 'desc' },
          take: 1,
          select: { TrangThai: true },
        },
      },
    }),
    // Tháng này
    prisma.donHang.findMany({
      where: { ...whereBase, NgayDat: { gte: startOfMonth } },
      select: {
        TongTien: true,
        TienGiamGia: true,
        LichSuTrangThaiDonHang: {
          orderBy: { ThoiGianCapNhat: 'desc' },
          take: 1,
          select: { TrangThai: true },
        },
      },
    }),
    // Tổng toàn bộ
    prisma.donHang.findMany({
      where: whereBase,
      select: {
        TongTien: true,
        TienGiamGia: true,
        LichSuTrangThaiDonHang: {
          orderBy: { ThoiGianCapNhat: 'desc' },
          take: 1,
          select: { TrangThai: true },
        },
      },
    }),
  ]);

  // Filter và tính toán cho từng period
  const todayCompleted = todayOrders.filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao');
  const weekCompleted = weekOrders.filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao');
  const monthCompleted = monthOrders.filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao');
  const allCompleted = allOrders.filter(o => o.LichSuTrangThaiDonHang[0]?.TrangThai === 'Đã giao');

  const todayStats = {
    count: todayCompleted.length,
    total: todayCompleted.reduce((sum, o) => sum + (Number(o.TongTien) || 0), 0),
  };
  const weekStats = {
    count: weekCompleted.length,
    total: weekCompleted.reduce((sum, o) => sum + (Number(o.TongTien) || 0), 0),
  };
  const monthStats = {
    count: monthCompleted.length,
    total: monthCompleted.reduce((sum, o) => sum + (Number(o.TongTien) || 0), 0),
  };
  const totalStats = {
    count: allCompleted.length,
    totalRevenue: allCompleted.reduce((sum, o) => sum + (Number(o.TongTien) || 0), 0),
    totalDiscount: allCompleted.reduce((sum, o) => sum + (Number(o.TienGiamGia) || 0), 0),
    avgRevenue: allCompleted.length > 0 ? allCompleted.reduce((sum, o) => sum + (Number(o.TongTien) || 0), 0) / allCompleted.length : 0,
  };

  return {
    homNay: {
      soDonHang: todayStats.count || 0,
      doanhThu: todayStats.total || 0,
    },
    tuanNay: {
      soDonHang: weekStats.count || 0,
      doanhThu: weekStats.total || 0,
    },
    thangNay: {
      soDonHang: monthStats.count || 0,
      doanhThu: monthStats.total || 0,
    },
    namNay: {
      soDonHang: 0,
      doanhThu: 0,
    },
    tongQuan: {
      tongSoDonHang: totalStats.count || 0,
      tongDoanhThu: totalStats.totalRevenue || 0,
      tongGiamGia: totalStats.totalDiscount || 0,
      giaTriTrungBinh: totalStats.avgRevenue || 0,
    },
  };
}

async function getReviewIssueStatistics(options = {}) {
  const { startDate, endDate, branchId } = options;
  
  const where = {};
  if (startDate || endDate) {
    where.NgayPhanTich = {};
    if (startDate) where.NgayPhanTich.gte = new Date(startDate);
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      where.NgayPhanTich.lt = endDateTime;
    }
  }

  // Filter by branch if provided
  if (branchId) {
    where.DanhGiaDonHang = {
      DonHang: {
        MaCoSo: Number(branchId)
      }
    };
  }

  // Handle potential Prisma naming convention variations
  const model = prisma.aI_ReviewAnalysis || prisma.ai_ReviewAnalysis || prisma.AI_ReviewAnalysis;
  if (!model) return { totalReviews: 0, sentiment: {}, issues: {}, dailyIssues: {} };

  // Fetch all analysis records within the date range
  const analyses = await model.findMany({
    where,
    select: {
      Sentiment: true,
      Severity: true,
      FoodIssue: true,
      DriverIssue: true,
      StoreIssue: true,
      OtherIssue: true,
      MentionLate: true,
      NgayPhanTich: true,
    }
  });

  // Aggregate data
  const stats = {
    totalReviews: analyses.length,
    sentiment: { Positive: 0, Negative: 0, Neutral: 0 },
    issues: {
      Food: 0,
      Driver: 0,
      Store: 0,
      Other: 0,
      Late: 0
    },
    issueDetails: {
      Food: [],
      Driver: [],
      Store: [],
      Other: []
    },
    dailyIssues: {} // Key: YYYY-MM-DD, Value: count
  };

  analyses.forEach(a => {
    // Sentiment
    if (a.Sentiment) {
      stats.sentiment[a.Sentiment] = (stats.sentiment[a.Sentiment] || 0) + 1;
    }

    // Issues
    if (a.FoodIssue && a.FoodIssue !== 'null') {
      stats.issues.Food++;
      stats.issueDetails.Food.push(a.FoodIssue);
    }
    if (a.DriverIssue && a.DriverIssue !== 'null') {
      stats.issues.Driver++;
      stats.issueDetails.Driver.push(a.DriverIssue);
    }
    if (a.StoreIssue && a.StoreIssue !== 'null') {
      stats.issues.Store++;
      stats.issueDetails.Store.push(a.StoreIssue);
    }
    if (a.OtherIssue && a.OtherIssue !== 'null') {
      stats.issues.Other++;
      stats.issueDetails.Other.push(a.OtherIssue);
    }
    if (a.MentionLate) stats.issues.Late++;

    // Daily breakdown (for chart)
    if (a.NgayPhanTich) {
      const dateKey = a.NgayPhanTich.toISOString().split('T')[0];
      if (!stats.dailyIssues[dateKey]) {
        stats.dailyIssues[dateKey] = { Food: 0, Driver: 0, Store: 0, Other: 0, Late: 0 };
      }
      if (a.FoodIssue) stats.dailyIssues[dateKey].Food++;
      if (a.DriverIssue) stats.dailyIssues[dateKey].Driver++;
      if (a.StoreIssue) stats.dailyIssues[dateKey].Store++;
      if (a.OtherIssue) stats.dailyIssues[dateKey].Other++;
      if (a.MentionLate) stats.dailyIssues[dateKey].Late++;
    }
  });

  return stats;
}

module.exports = {
  getBestSellingProducts,
  getBestSellingCombos,
  getRevenueByBranch,
  getOverallRevenue,
  getOrderCountByPeriod,
  getOrdersByStatus,
  getOrdersByPaymentMethod,
  getDashboardOverview,
  getRevenueComparisonByBranch,
  getReviewIssueStatistics,
};
