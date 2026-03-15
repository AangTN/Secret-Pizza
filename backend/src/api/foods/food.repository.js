const prisma = require('../../client');
const { Prisma } = require('@prisma/client');

// Get list of foods (MonAn) with type and categories (no ratings payload)
const findAllFoods = async () => {
  const now = new Date();
  
  return prisma.monAn.findMany({
    where: {
      TrangThai: 'Active',
    },
    select: {
      MaMonAn: true,
      TenMonAn: true,
      HinhAnh: true,
      MoTa: true,
      MaLoaiMonAn: true,
      LoaiMonAn: { select: { MaLoaiMonAn: true, TenLoaiMonAn: true } },
      MonAn_DanhMuc: {
        select: {
          DanhMuc: { select: { MaDanhMuc: true, TenDanhMuc: true } },
        },
      },
      MonAn_KhuyenMai: {
        where: {
          KhuyenMai: {
            TrangThai: 'Active',
            KMBatDau: { lte: now },
            KMKetThuc: { gte: now },
          },
        },
        select: {
          MaKhuyenMai: true,
          KhuyenMai: {
            select: {
              MaKhuyenMai: true,
              TenKhuyenMai: true,
              KMLoai: true,
              KMGiaTri: true,
              KMBatDau: true,
              KMKetThuc: true,
            },
          },
        },
      },
    },
    orderBy: { MaMonAn: 'asc' },
  });
};

// Rating stats (avg & count) for all foods with visible reviews
const findFoodsRatingStats = async () => {
  return prisma.danhGiaMonAn.groupBy({
    by: ['MaMonAn'],
    where: { TrangThai: 'Hiển thị' },
    _avg: { SoSao: true },
    _count: { SoSao: true },
  });
};

// Detailed food by id with related variants, sizes, crusts, options
const findFoodById = async (id) => {
  const now = new Date();
  
  return prisma.monAn.findUnique({
    where: { MaMonAn: Number(id) },
    include: {
      LoaiMonAn: true,
      MonAn_DanhMuc: { include: { DanhMuc: true } },
      BienTheMonAn: { 
        where: { TrangThai: 'Active' },
        include: { Size: true } 
      },
      MonAn_DeBanh: { include: { DeBanh: true } },
      MonAn_TuyChon: {
        include: {
          TuyChon: {
            include: {
              LoaiTuyChon: true,
              TuyChon_Gia: { include: { Size: true } },
            },
          },
        },
      },
      MonAn_KhuyenMai: {
        where: {
          KhuyenMai: {
            TrangThai: 'Active',
            KMBatDau: { lte: now },
            KMKetThuc: { gte: now },
          },
        },
        include: {
          KhuyenMai: {
            select: {
              MaKhuyenMai: true,
              TenKhuyenMai: true,
              KMLoai: true,
              KMGiaTri: true,
              KMBatDau: true,
              KMKetThuc: true,
            },
          },
        },
      },
      // Include all visible reviews for details view, and include minimal user info (account -> profile)
      DanhGiaMonAn: {
        where: { TrangThai: 'Hiển thị' },
        select: {
          MaDanhGiaMonAn: true,
          MaMonAn: true,
          MaTaiKhoan: true,
          SoSao: true,
          NoiDung: true,
          NgayDanhGia: true,
          TrangThai: true,
          TaiKhoan: {
            select: {
              MaTaiKhoan: true,
              NguoiDung: {
                select: {
                  MaNguoiDung: true,
                  HoTen: true,
                },
              },
            },
          },
        },
        orderBy: { NgayDanhGia: 'desc' },
      },
    },
  });
};

// Get top 8 best-selling foods based on delivered orders in last 7 days, always return 8 items
const findBestSellingFoods = async (limit = 8, categoryId = null) => {
  // Query raw SQL to get sales data (món có bán + món chưa bán) in last 7 days
  const result = await prisma.$queryRaw`
    WITH delivered_orders AS (
      SELECT DISTINCT dh."MaDonHang"
      FROM "DonHang" dh
      JOIN "LichSuTrangThaiDonHang" lst ON lst."MaDonHang" = dh."MaDonHang"
      WHERE lst."TrangThai" = 'Đã giao'
        AND lst."ThoiGianCapNhat" >= NOW() - INTERVAL '7 days'
    ),
    regular_sales AS (
      SELECT 
        bt."MaMonAn",
        SUM(ctdh."SoLuong") as total_quantity
      FROM "ChiTietDonHang" ctdh
      JOIN "BienTheMonAn" bt ON bt."MaBienThe" = ctdh."MaBienThe"
      WHERE ctdh."MaDonHang" IN (SELECT "MaDonHang" FROM delivered_orders)
        AND (ctdh."Loai" = 'SP' OR ctdh."Loai" IS NULL)
      GROUP BY bt."MaMonAn"
    ),
    combo_sales AS (
      SELECT 
        bt."MaMonAn",
        SUM(ctdh."SoLuong" * ctcc."SoLuong") as total_quantity
      FROM "ChiTietDonHang" ctdh
      JOIN "ChiTietDonHang_ChiTietCombo" ctcc ON ctcc."MaChiTietDonHang" = ctdh."MaChiTiet"
      JOIN "BienTheMonAn" bt ON bt."MaBienThe" = ctcc."MaBienThe"
      WHERE ctdh."MaDonHang" IN (SELECT "MaDonHang" FROM delivered_orders)
        AND ctdh."Loai" = 'CB'
      GROUP BY bt."MaMonAn"
    ),
    total_sales AS (
      SELECT "MaMonAn", total_quantity FROM regular_sales
      UNION ALL
      SELECT "MaMonAn", total_quantity FROM combo_sales
    ),
    aggregated_sales AS (
      SELECT 
        "MaMonAn",
        SUM(total_quantity)::INTEGER as total_sold
      FROM total_sales
      GROUP BY "MaMonAn"
    )
    SELECT 
      ma."MaMonAn",
      COALESCE(s.total_sold, 0) as "totalSold"
    FROM "MonAn" ma
    LEFT JOIN aggregated_sales s ON s."MaMonAn" = ma."MaMonAn"
    WHERE ma."TrangThai" = 'Active'
      ${categoryId ? Prisma.sql`AND ma."MaLoaiMonAn" = ${Number(categoryId)}` : Prisma.empty}
    ORDER BY "totalSold" DESC, ma."MaMonAn" ASC
    LIMIT ${limit}
  `;
  
  // Fetch full food data with relations for the selected MaMonAn
  const foodIds = result.map(r => r.MaMonAn);
  const now = new Date();
  
  const foods = await prisma.monAn.findMany({
    where: { MaMonAn: { in: foodIds } },
    select: {
      MaMonAn: true,
      TenMonAn: true,
      HinhAnh: true,
      MoTa: true,
      MaLoaiMonAn: true,
      LoaiMonAn: { select: { MaLoaiMonAn: true, TenLoaiMonAn: true } },
      MonAn_DanhMuc: {
        select: {
          DanhMuc: { select: { MaDanhMuc: true, TenDanhMuc: true } },
        },
      },
      MonAn_KhuyenMai: {
        where: {
          KhuyenMai: {
            TrangThai: 'Active',
            KMBatDau: { lte: now },
            KMKetThuc: { gte: now },
          },
        },
        select: {
          KhuyenMai: {
            select: {
              MaKhuyenMai: true,
              TenKhuyenMai: true,
              KMLoai: true,
              KMGiaTri: true,
              KMBatDau: true,
              KMKetThuc: true,
            },
          },
        },
      },
    },
  });
  
  // Build map for quick lookup and preserve order
  const foodMap = new Map(foods.map(f => [f.MaMonAn, f]));
  const salesMap = new Map(result.map(r => [r.MaMonAn, r.totalSold]));
  
  return result.map(r => {
    const food = foodMap.get(r.MaMonAn);
    return {
      ...food,
      totalSold: salesMap.get(r.MaMonAn) || 0,
    };
  }).filter(Boolean);
};

// Get all featured foods (DeXuat = true and TrangThai = 'Active')
const findFeaturedFoods = async () => {
  const now = new Date();
  
  return prisma.monAn.findMany({
    where: {
      DeXuat: true,
      TrangThai: 'Active',
    },
    select: {
      MaMonAn: true,
      TenMonAn: true,
      HinhAnh: true,
      MoTa: true,
      MaLoaiMonAn: true,
      DeXuat: true,
      TrangThai: true,
      LoaiMonAn: { select: { MaLoaiMonAn: true, TenLoaiMonAn: true } },
      MonAn_DanhMuc: {
        select: {
          DanhMuc: { select: { MaDanhMuc: true, TenDanhMuc: true } },
        },
      },
      MonAn_KhuyenMai: {
        where: {
          KhuyenMai: {
            TrangThai: 'Active',
            KMBatDau: { lte: now },
            KMKetThuc: { gte: now },
          },
        },
        select: {
          KhuyenMai: {
            select: {
              MaKhuyenMai: true,
              TenKhuyenMai: true,
              KMLoai: true,
              KMGiaTri: true,
              KMBatDau: true,
              KMKetThuc: true,
            },
          },
        },
      },
    },
    orderBy: { MaMonAn: 'asc' },
  });
};

// Create new food with variants, categories, crusts, and options
const createFood = async (foodData) => {
  const {
    tenMonAn,
    moTa,
    hinhAnh,
    maLoaiMonAn,
    trangThai,
    deXuat,
    bienThe,
    danhSachMaDanhMuc,
    danhSachMaDeBanh,
    danhSachMaTuyChon,
  } = foodData;

  return prisma.$transaction(async (tx) => {
    // 1. Create MonAn
    const monAn = await tx.monAn.create({
      data: {
        TenMonAn: tenMonAn,
        MoTa: moTa || null,
        HinhAnh: hinhAnh || null,
        MaLoaiMonAn: maLoaiMonAn,
        TrangThai: trangThai || 'Active',
        DeXuat: deXuat || false,
      },
    });

    const maMonAn = monAn.MaMonAn;

    // 2. Create BienTheMonAn (variants with sizes and prices)
    if (bienThe && bienThe.length > 0) {
      await tx.bienTheMonAn.createMany({
        data: bienThe.map(bt => ({
          MaMonAn: maMonAn,
          MaSize: bt.maSize || null, // null for non-pizza items (drinks, sides)
          GiaBan: bt.giaBan,
        })),
      });
    }

    // 3. Link categories (MonAn_DanhMuc)
    if (danhSachMaDanhMuc && danhSachMaDanhMuc.length > 0) {
      await tx.monAn_DanhMuc.createMany({
        data: danhSachMaDanhMuc.map(maDanhMuc => ({
          MaMonAn: maMonAn,
          MaDanhMuc: maDanhMuc,
        })),
      });
    }

    // 4. Link crusts (MonAn_DeBanh)
    if (danhSachMaDeBanh && danhSachMaDeBanh.length > 0) {
      await tx.monAn_DeBanh.createMany({
        data: danhSachMaDeBanh.map(maDeBanh => ({
          MaMonAn: maMonAn,
          MaDeBanh: maDeBanh,
        })),
      });
    }

    // 5. Link options (MonAn_TuyChon)
    if (danhSachMaTuyChon && danhSachMaTuyChon.length > 0) {
      await tx.monAn_TuyChon.createMany({
        data: danhSachMaTuyChon.map(maTuyChon => ({
          MaMonAn: maMonAn,
          MaTuyChon: maTuyChon,
        })),
      });
    }

    return monAn;
  });
};

// Update existing food (admin: cannot change tenMonAn, deactivate all variants then reactivate only those in payload)
const updateFood = async (id, foodData) => {
  const {
    moTa,
    hinhAnh,
    maLoaiMonAn,
    trangThai,
    deXuat,
    bienThe,
    danhSachMaDanhMuc,
    danhSachMaDeBanh,
    danhSachMaTuyChon,
  } = foodData;

  return prisma.$transaction(async (tx) => {
    const maMonAn = Number(id);

    // 1. Update MonAn (do not update TenMonAn per user requirement)
    const updated = await tx.monAn.update({
      where: { MaMonAn: maMonAn },
      data: {
        MoTa: moTa !== undefined ? moTa : undefined,
        HinhAnh: hinhAnh !== undefined ? hinhAnh : undefined,
        MaLoaiMonAn: maLoaiMonAn !== undefined ? maLoaiMonAn : undefined,
        TrangThai: trangThai !== undefined ? trangThai : undefined,
        DeXuat: deXuat !== undefined ? deXuat : undefined,
      },
    });

    // 2. Deactivate all existing variants (set TrangThai = 'Ẩn')
    await tx.bienTheMonAn.updateMany({
      where: { MaMonAn: maMonAn },
      data: { TrangThai: 'Inactive' },
    });

    // 3. Create or reactivate variants from payload
    if (bienThe && bienThe.length > 0) {
      for (const bt of bienThe) {
        const existing = await tx.bienTheMonAn.findFirst({
          where: {
            MaMonAn: maMonAn,
            MaSize: bt.maSize || null,
          },
        });

        if (existing) {
          // Reactivate and update price
          await tx.bienTheMonAn.update({
            where: { MaBienThe: existing.MaBienThe },
            data: {
              GiaBan: bt.giaBan,
              TrangThai: 'Active',
            },
          });
        } else {
          // Create new variant
          await tx.bienTheMonAn.create({
            data: {
              MaMonAn: maMonAn,
              MaSize: bt.maSize || null,
              GiaBan: bt.giaBan,
              TrangThai: 'Active',
            },
          });
        }
      }
    }

    // 4. Replace categories: delete all, then insert new ones
    await tx.monAn_DanhMuc.deleteMany({ where: { MaMonAn: maMonAn } });
    if (danhSachMaDanhMuc && danhSachMaDanhMuc.length > 0) {
      await tx.monAn_DanhMuc.createMany({
        data: danhSachMaDanhMuc.map(maDanhMuc => ({ MaMonAn: maMonAn, MaDanhMuc: maDanhMuc })),
      });
    }

    // 5. Replace crusts: delete all, then insert new ones
    await tx.monAn_DeBanh.deleteMany({ where: { MaMonAn: maMonAn } });
    if (danhSachMaDeBanh && danhSachMaDeBanh.length > 0) {
      await tx.monAn_DeBanh.createMany({
        data: danhSachMaDeBanh.map(maDeBanh => ({ MaMonAn: maMonAn, MaDeBanh: maDeBanh })),
      });
    }

    // 6. Replace options: delete all, then insert new ones
    await tx.monAn_TuyChon.deleteMany({ where: { MaMonAn: maMonAn } });
    if (danhSachMaTuyChon && danhSachMaTuyChon.length > 0) {
      await tx.monAn_TuyChon.createMany({
        data: danhSachMaTuyChon.map(maTuyChon => ({ MaMonAn: maMonAn, MaTuyChon: maTuyChon })),
      });
    }

    return updated;
  });
};

// Admin: Get all foods including Active and Inactive (exclude Deleted)
const findAllFoodsAdmin = async () => {
  const now = new Date();
  
  return prisma.monAn.findMany({
    where: {
      TrangThai: { in: ['Active', 'Inactive'] },
    },
    select: {
      MaMonAn: true,
      TenMonAn: true,
      HinhAnh: true,
      MoTa: true,
      MaLoaiMonAn: true,
      TrangThai: true,
      DeXuat: true,
      LoaiMonAn: { select: { MaLoaiMonAn: true, TenLoaiMonAn: true } },
      MonAn_DanhMuc: {
        select: {
          DanhMuc: { select: { MaDanhMuc: true, TenDanhMuc: true } },
        },
      },
      MonAn_KhuyenMai: {
        select: {
          MaKhuyenMai: true,
          KhuyenMai: {
            select: {
              MaKhuyenMai: true,
              TenKhuyenMai: true,
              KMLoai: true,
              KMGiaTri: true,
              KMBatDau: true,
              KMKetThuc: true,
            },
          },
        },
      },
      BienTheMonAn: {
        select: {
          MaBienThe: true,
          GiaBan: true,
          TrangThai: true,
          Size: {
            select: {
              MaSize: true,
              TenSize: true
            }
          }
        }
      }
    },
    orderBy: { MaMonAn: 'asc' },
  });
};

// Kiểm tra món ăn có trong combo nào không
const checkFoodInCombo = async (id) => {
  // Lấy tất cả biến thể của món ăn
  const variants = await prisma.bienTheMonAn.findMany({
    where: { MaMonAn: Number(id) },
    select: { MaBienThe: true },
  });

  if (variants.length === 0) return [];

  const variantIds = variants.map(v => v.MaBienThe);

  // Kiểm tra các combo có chứa biến thể này
  const combosUsingFood = await prisma.combo.findMany({
    where: {
      TrangThai: { not: 'Deleted' }, // Chỉ check combo chưa bị xóa
      Combo_ChiTiet: {
        some: {
          MaBienThe: { in: variantIds },
        },
      },
    },
    select: {
      MaCombo: true,
      TenCombo: true,
      TrangThai: true,
    },
  });

  return combosUsingFood;
};

// Soft delete food (set TrangThai to 'Deleted')
const softDeleteFood = async (id) => {
  return prisma.monAn.update({
    where: { MaMonAn: Number(id) },
    data: { TrangThai: 'Deleted' },
  });
};

module.exports = { findAllFoods, findAllFoodsAdmin, findFoodById, findFoodsRatingStats, findBestSellingFoods, findFeaturedFoods, createFood, updateFood, softDeleteFood, checkFoodInCombo };
