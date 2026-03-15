const categoryService = require('./category.service');

const getCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error in getCategories controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const createCategory = async (req, res) => {
  try {
    const data = {
      tenDanhMuc: req.body.tenDanhMuc,
    };

    const newCategory = await categoryService.createCategory(data);
    res.status(201).json({
      message: 'Thêm danh mục thành công',
      category: newCategory,
    });
  } catch (error) {
    console.error('Error in createCategory controller:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const data = {
      tenDanhMuc: req.body.tenDanhMuc,
    };

    const updatedCategory = await categoryService.updateCategory(id, data);
    res.status(200).json({
      message: 'Cập nhật danh mục thành công',
      category: updatedCategory,
    });
  } catch (error) {
    console.error('Error in updateCategory controller:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    await categoryService.deleteCategory(id);
    res.status(200).json({ message: 'Xóa danh mục thành công' });
  } catch (error) {
    console.error('Error in deleteCategory controller:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
