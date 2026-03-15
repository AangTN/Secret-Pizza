const service = require('./variant.service');

const getAllVariants = async (req, res) => {
  try {
    const data = await service.getAllVariants();
    res.json(data);
  } catch (err) {
    console.error('getAllVariants error:', err);
    res.status(500).json({ message: 'Không lấy được danh sách biến thể.' });
  }
};

const getAllOptionPrices = async (req, res) => {
  try {
    const data = await service.getAllOptionPrices();
    res.json(data);
  } catch (err) {
    console.error('getAllOptionPrices error:', err);
    res.status(500).json({ message: 'Không lấy được danh sách giá tùy chọn.' });
  }
};

module.exports = { getAllVariants, getAllOptionPrices };
