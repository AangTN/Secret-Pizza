const prisma = require('../../client');

const findAllCrusts = async () => {
  return prisma.deBanh.findMany({
    select: {
      MaDeBanh: true,
      TenDeBanh: true,
    },
    orderBy: { MaDeBanh: 'asc' },
  });
};

const createCrust = async (data) => {
  return prisma.deBanh.create({
    data: {
      TenDeBanh: data.TenDeBanh,
    },
  });
};

module.exports = { findAllCrusts, createCrust };
