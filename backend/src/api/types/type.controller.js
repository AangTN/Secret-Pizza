const typeService = require('./type.service');

const getTypes = async (req, res) => {
  try {
    const types = await typeService.getAllTypes();
    res.status(200).json(types);
  } catch (error) {
    console.error('Error in getTypes controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const createType = async (req, res) => {
  try {
    const data = {
      tenLoaiMonAn: req.body.tenLoaiMonAn,
    };

    const newType = await typeService.createType(data);
    res.status(201).json({
      message: 'Thêm loại món ăn thành công',
      type: newType,
    });
  } catch (error) {
    console.error('Error in createType controller:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const updateType = async (req, res) => {
  try {
    const id = req.params.id;
    const data = {
      tenLoaiMonAn: req.body.tenLoaiMonAn,
    };

    const updatedType = await typeService.updateType(id, data);
    res.status(200).json({
      message: 'Cập nhật loại món ăn thành công',
      type: updatedType,
    });
  } catch (error) {
    console.error('Error in updateType controller:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const deleteType = async (req, res) => {
  try {
    const id = req.params.id;
    await typeService.deleteType(id);
    res.status(200).json({ message: 'Xóa loại món ăn thành công' });
  } catch (error) {
    console.error('Error in deleteType controller:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

module.exports = { getTypes, createType, updateType, deleteType };
