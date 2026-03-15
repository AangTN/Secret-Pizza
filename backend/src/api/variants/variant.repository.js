const prisma = require('../../client');

// Get all variants (BienTheMonAn) with related food and size
const findAllVariants = async () => {
  return prisma.bienTheMonAn.findMany({
    where: { TrangThai: 'Active' },
    select: {
      MaBienThe: true,
      GiaBan: true,
      MonAn: { select: { MaMonAn: true, TenMonAn: true } },
      Size: { select: { MaSize: true, TenSize: true } },
    },
    orderBy: { MaBienThe: 'asc' },
  });
};

// Get all option prices (TuyChon_Gia) with option and size
const findAllOptionPrices = async () => {
  return prisma.tuyChon_Gia.findMany({
    select: {
      MaTuyChon: true,
      MaSize: true,
      GiaThem: true,
      TuyChon: {
        select: {
          MaTuyChon: true,
          TenTuyChon: true,
          LoaiTuyChon: { select: { MaLoaiTuyChon: true, TenLoaiTuyChon: true } },
        },
      },
      Size: { select: { MaSize: true, TenSize: true } },
    },
    orderBy: [{ MaTuyChon: 'asc' }, { MaSize: 'asc' }],
  });
};

module.exports = { findAllVariants, findAllOptionPrices };
