const giftService = require('./gift.service');

/**
 * Get all active gifts
 */
const getActiveGifts = async (req, res) => {
  try {
    const gifts = await giftService.getActiveGifts();
    res.json(gifts);
  } catch (error) {
    console.error('Error fetching active gifts:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all gifts (admin)
 */
const getAllGifts = async (req, res) => {
  try {
    const gifts = await giftService.getAllGifts();
    res.json(gifts);
  } catch (error) {
    console.error('Error fetching gifts:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add new gift
 * Body (multipart/form-data): { TenQuaTang, MoTa, CapDo, percentages (JSON string), file }
 */
const addGift = async (req, res) => {
  try {
    // Parse percentages from form data (sent as JSON string)
    let percentages;
    try {
      percentages = JSON.parse(req.body.percentages || '{}');
    } catch (e) {
      return res.status(400).json({ message: 'Dữ liệu percentages không hợp lệ' });
    }

    // Get uploaded file path
    const HinhAnh = req.file ? `/images/QuaTang/${req.file.filename}` : null;

    const { TenQuaTang, MoTa, CapDo, TrangThai } = req.body;
    
    if (!TenQuaTang || !MoTa || !CapDo || !percentages) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: TenQuaTang, MoTa, CapDo, percentages' });
    }

    const result = await giftService.addGift({
      TenQuaTang,
      MoTa,
      CapDo,
      HinhAnh,
      TrangThai: TrangThai || 'Active',
      percentages
    });
    
    res.json({ message: 'Thêm quà tặng thành công', data: result });
  } catch (error) {
    console.error('Error adding gift:', error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Update gift (cannot update TenQuaTang and CapDo)
 * Body (multipart/form-data): { MaQuaTang, MoTa, percentages (JSON string), file? }
 */
const updateGift = async (req, res) => {
  try {
    // Parse percentages from form data (sent as JSON string)
    let percentages;
    try {
      percentages = JSON.parse(req.body.percentages || '{}');
    } catch (e) {
      return res.status(400).json({ message: 'Dữ liệu percentages không hợp lệ' });
    }

    // Get uploaded file path (optional for update)
    const HinhAnh = req.file ? `/images/QuaTang/${req.file.filename}` : undefined;

    const { MaQuaTang, MoTa, TrangThai } = req.body;
    
    if (!MaQuaTang || !MoTa || !percentages) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: MaQuaTang, MoTa, percentages' });
    }

    const result = await giftService.updateGift({
      MaQuaTang: parseInt(MaQuaTang, 10),
      MoTa,
      HinhAnh,
      TrangThai,
      percentages
    });
    
    res.json({ message: 'Cập nhật quà tặng thành công', data: result });
  } catch (error) {
    console.error('Error updating gift:', error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Delete gift (soft delete - set TrangThai to Deleted)
 * Body: { MaQuaTang, percentages: { Common: "52", Uncommon: "25", ... } }
 */
const deleteGift = async (req, res) => {
  try {
    const { MaQuaTang, percentages } = req.body;
    
    if (!MaQuaTang || !percentages) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: MaQuaTang, percentages' });
    }

    const result = await giftService.deleteGift({
      MaQuaTang: parseInt(MaQuaTang, 10),
      percentages
    });
    
    res.json({ message: 'Xóa quà tặng thành công', data: result });
  } catch (error) {
    console.error('Error deleting gift:', error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getActiveGifts,
  getAllGifts,
  addGift,
  updateGift,
  deleteGift,
};
