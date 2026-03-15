const prisma = require('../../client');

const findAllCategories = async () => {
  return prisma.danhMuc.findMany({
    select: { MaDanhMuc: true, TenDanhMuc: true },
    orderBy: { MaDanhMuc: 'asc' },
  });
};

// Get category by id
const findCategoryById = async (id) => {
  return prisma.danhMuc.findUnique({
    where: { MaDanhMuc: Number(id) },
  });
};

// Check if category name exists (for duplicate check)
const findCategoryByName = async (name) => {
  return prisma.danhMuc.findUnique({
    where: { TenDanhMuc: String(name) },
  });
};

// Create new category
const createCategory = async (data) => {
  return prisma.danhMuc.create({
    data: {
      TenDanhMuc: data.tenDanhMuc,
    },
  });
};

// Update category
const updateCategory = async (id, data) => {
  return prisma.danhMuc.update({
    where: { MaDanhMuc: Number(id) },
    data: {
      TenDanhMuc: data.tenDanhMuc,
    },
  });
};

// Delete category
const deleteCategory = async (id) => {
  return prisma.danhMuc.delete({
    where: { MaDanhMuc: Number(id) },
  });
};

// Check if any foods use this category
const countFoodsByCategory = async (id) => {
  return prisma.monAn_DanhMuc.count({
    where: { MaDanhMuc: Number(id) },
  });
};

// Delete all MonAn_DanhMuc relations for a category
const deleteCategoryRelations = async (id) => {
  return prisma.monAn_DanhMuc.deleteMany({
    where: { MaDanhMuc: Number(id) },
  });
};

module.exports = {
  findAllCategories,
  findCategoryById,
  findCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  countFoodsByCategory,
  deleteCategoryRelations,
};
