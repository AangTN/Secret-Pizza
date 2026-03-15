const prisma = require('../../client');

const findAllBranches = async () => {
  return prisma.coSo.findMany({
    select: {
      MaCoSo: true,
      TenCoSo: true,
      SoDienThoai: true,
      SoNhaDuong: true,
      PhuongXa: true,
      QuanHuyen: true,
      ThanhPho: true,
      KinhDo: true,
      ViDo: true,
    },
    orderBy: { MaCoSo: 'asc' },
  });
};

module.exports = { findAllBranches };
