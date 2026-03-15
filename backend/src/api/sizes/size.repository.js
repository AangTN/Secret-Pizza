const prisma = require('../../client');

// Get all sizes
const findAllSizes = async () => {
  return prisma.size.findMany({
    orderBy: { MaSize: 'asc' },
  });
};

module.exports = { findAllSizes };
