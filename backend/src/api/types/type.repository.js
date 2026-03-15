const prisma = require('../../client');

const findAllTypes = async () => {
  return prisma.loaiMonAn.findMany({
    select: { MaLoaiMonAn: true, TenLoaiMonAn: true },
    orderBy: { MaLoaiMonAn: 'asc' },
  });
};

// Get type by id
const findTypeById = async (id) => {
  return prisma.loaiMonAn.findUnique({
    where: { MaLoaiMonAn: Number(id) },
  });
};

// Check if type name exists (for duplicate check)
const findTypeByName = async (name) => {
  return prisma.loaiMonAn.findUnique({
    where: { TenLoaiMonAn: String(name) },
  });
};

// Create new type
const createType = async (data) => {
  return prisma.loaiMonAn.create({
    data: {
      TenLoaiMonAn: data.tenLoaiMonAn,
    },
  });
};

// Update type
const updateType = async (id, data) => {
  return prisma.loaiMonAn.update({
    where: { MaLoaiMonAn: Number(id) },
    data: {
      TenLoaiMonAn: data.tenLoaiMonAn,
    },
  });
};

// Delete type
const deleteType = async (id) => {
  return prisma.loaiMonAn.delete({
    where: { MaLoaiMonAn: Number(id) },
  });
};

// Check if any foods exist for this type
const countFoodsByType = async (id) => {
  return prisma.monAn.count({
    where: { MaLoaiMonAn: Number(id) },
  });
};

module.exports = {
  findAllTypes,
  findTypeById,
  findTypeByName,
  createType,
  updateType,
  deleteType,
  countFoodsByType,
};
