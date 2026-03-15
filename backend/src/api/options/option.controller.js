const optionService = require('./option.service');

const getAllOptions = async (req, res) => {
  try {
    const options = await optionService.getAllOptions();
    res.status(200).json(options);
  } catch (error) {
    console.error('Error in getAllOptions controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const getAllOptionsAdmin = async (req, res) => {
  try {
    const options = await optionService.getAllOptionsAdmin();
    res.status(200).json({ success: true, data: options });
  } catch (error) {
    console.error('Error in getAllOptionsAdmin controller:', error);
    res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
  }
};

const getAllSizes = async (req, res) => {
  try {
    const sizes = await optionService.getAllSizes();
    res.status(200).json({ success: true, data: sizes });
  } catch (error) {
    console.error('Error in getAllSizes controller:', error);
    res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
  }
};

const getAllOptionTypes = async (req, res) => {
  try {
    const types = await optionService.getAllOptionTypes();
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    console.error('Error in getAllOptionTypes controller:', error);
    res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
  }
};

const createOption = async (req, res) => {
  try {
    const optionData = req.body;
    const newOption = await optionService.createOption(optionData);
    res.status(201).json({ success: true, data: newOption, message: 'Tạo tùy chọn thành công' });
  } catch (error) {
    console.error('Error in createOption controller:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi tạo tùy chọn' });
  }
};

const updateOption = async (req, res) => {
  try {
    const { id } = req.params;
    const optionData = req.body;
    const updatedOption = await optionService.updateOption(parseInt(id), optionData);
    res.status(200).json({ success: true, data: updatedOption, message: 'Cập nhật tùy chọn thành công' });
  } catch (error) {
    console.error('Error in updateOption controller:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi cập nhật tùy chọn' });
  }
};

const deleteOption = async (req, res) => {
  try {
    const { id } = req.params;
    await optionService.deleteOption(parseInt(id));
    res.status(200).json({ success: true, message: 'Xóa tùy chọn thành công' });
  } catch (error) {
    console.error('Error in deleteOption controller:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi xóa tùy chọn' });
  }
};

const getOptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const option = await optionService.getOptionById(parseInt(id));
    res.status(200).json({ success: true, data: option });
  } catch (error) {
    console.error('Error in getOptionById controller:', error);
    res.status(404).json({ success: false, message: error.message || 'Không tìm thấy tùy chọn' });
  }
};

module.exports = {
  getAllOptions,
  getAllOptionsAdmin,
  getAllSizes,
  getAllOptionTypes,
  createOption,
  updateOption,
  deleteOption,
  getOptionById,
};
