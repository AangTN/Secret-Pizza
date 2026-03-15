const sizeService = require('./size.service');

const getAllSizes = async (req, res) => {
  try {
    const sizes = await sizeService.getAllSizes();
    res.status(200).json(sizes);
  } catch (error) {
    console.error('Error in getAllSizes controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

module.exports = { getAllSizes };
