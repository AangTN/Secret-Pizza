const { quoteShipping } = require('./shipping.service');

function validateBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Thiếu dữ liệu đầu vào'];
  const { soNhaDuong, phuongXa, quanHuyen, thanhPho } = body;
  if (!soNhaDuong || typeof soNhaDuong !== 'string') errors.push('Thiếu số nhà, tên đường');
  if (!phuongXa || typeof phuongXa !== 'string') errors.push('Thiếu Phường/Xã');
  if (!quanHuyen || typeof quanHuyen !== 'string') errors.push('Thiếu Quận/Huyện');
  if (!thanhPho || typeof thanhPho !== 'string') errors.push('Thiếu Thành phố');
  return errors;
}

const getShippingQuote = async (req, res) => {
  try {
    const errors = validateBody(req.body);
    if (errors.length) return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors });

    const result = await quoteShipping(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in getShippingQuote:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
};

module.exports = { getShippingQuote };
