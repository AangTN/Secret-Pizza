const prisma = require('../../client');

async function findAllBranchesWithCoords() {
  return prisma.coSo.findMany({
    where: {
      AND: [
        { KinhDo: { not: null } },
        { ViDo: { not: null } },
      ],
    },
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
}

module.exports = { findAllBranchesWithCoords };
