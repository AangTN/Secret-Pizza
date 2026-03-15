const prisma = require('../../client');

// Get all option types with their options and pricing by size
const findAllOptions = async () => {
  return prisma.loaiTuyChon.findMany({
    include: {
      TuyChon: {
        where: {
          TrangThai: 'Active',
        },
        include: {
          TuyChon_Gia: {
            include: {
              Size: true,
            },
          },
        },
      },
    },
    orderBy: { MaLoaiTuyChon: 'asc' },
  });
};

// Get all options for admin (including all statuses)
const findAllOptionsAdmin = async () => {
  return prisma.tuyChon.findMany({
    include: {
      LoaiTuyChon: true,
      TuyChon_Gia: {
        include: {
          Size: true,
        },
      },
    },
    orderBy: [
      { MaLoaiTuyChon: 'asc' },
      { MaTuyChon: 'asc' }
    ],
  });
};

// Get all sizes
const findAllSizes = async () => {
  return prisma.size.findMany({
    orderBy: { MaSize: 'asc' },
  });
};

// Get all option types
const findAllOptionTypes = async () => {
  return prisma.loaiTuyChon.findMany({
    orderBy: { MaLoaiTuyChon: 'asc' },
  });
};

// Create new option with pricing
const createOption = async (optionData) => {
  const { TenTuyChon, MaLoaiTuyChon, prices } = optionData;

  return prisma.$transaction(async (tx) => {
    // Create option
    const newOption = await tx.tuyChon.create({
      data: {
        TenTuyChon,
        MaLoaiTuyChon,
        TrangThai: 'Active',
      },
    });

    // Create pricing for each size
    if (prices && prices.length > 0) {
      await tx.tuyChon_Gia.createMany({
        data: prices.map(price => ({
          MaTuyChon: newOption.MaTuyChon,
          MaSize: price.MaSize,
          GiaThem: price.GiaThem,
        })),
      });
    }

    // Return with full data
    return tx.tuyChon.findUnique({
      where: { MaTuyChon: newOption.MaTuyChon },
      include: {
        LoaiTuyChon: true,
        TuyChon_Gia: {
          include: {
            Size: true,
          },
        },
      },
    });
  });
};

// Update option (cannot change name, only prices)
const updateOption = async (id, optionData) => {
  const { prices } = optionData;

  return prisma.$transaction(async (tx) => {
    // Delete all old prices
    await tx.tuyChon_Gia.deleteMany({
      where: { MaTuyChon: id },
    });

    // Create new prices
    if (prices && prices.length > 0) {
      await tx.tuyChon_Gia.createMany({
        data: prices.map(price => ({
          MaTuyChon: id,
          MaSize: price.MaSize,
          GiaThem: price.GiaThem,
        })),
      });
    }

    // Return updated option
    return tx.tuyChon.findUnique({
      where: { MaTuyChon: id },
      include: {
        LoaiTuyChon: true,
        TuyChon_Gia: {
          include: {
            Size: true,
          },
        },
      },
    });
  });
};

// Delete option (soft delete + remove from foods)
const deleteOption = async (id) => {
  return prisma.$transaction(async (tx) => {
    // Delete all MonAn_TuyChon relationships
    await tx.monAn_TuyChon.deleteMany({
      where: { MaTuyChon: id },
    });

    // Soft delete option
    await tx.tuyChon.update({
      where: { MaTuyChon: id },
      data: { TrangThai: 'Deleted' },
    });

    return { success: true };
  });
};

// Get option by ID
const findOptionById = async (id) => {
  return prisma.tuyChon.findUnique({
    where: { MaTuyChon: id },
    include: {
      LoaiTuyChon: true,
      TuyChon_Gia: {
        include: {
          Size: true,
        },
      },
    },
  });
};

module.exports = {
  findAllOptions,
  findAllOptionsAdmin,
  findAllSizes,
  findAllOptionTypes,
  createOption,
  updateOption,
  deleteOption,
  findOptionById,
};
