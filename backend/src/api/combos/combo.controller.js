const comboService = require('./combo.service');

const getCombos = async (req, res) => {
  try {
    const combos = await comboService.getAllActiveCombos();
    return res.status(200).json(combos);
  } catch (err) {
    console.error('Error getCombos:', err);
    return res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const getComboById = async (req, res) => {
  try {
    const id = req.params.id;
    const combo = await comboService.getComboDetail(id);
    if (!combo) return res.status(404).json({ message: 'Không tìm thấy combo' });
    return res.status(200).json(combo);
  } catch (err) {
    console.error('Error getComboById:', err);
    return res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const getCombosAdmin = async (req, res, next) => {
  try {
    // default to Active and Inactive if not provided
    const q = req.query.statuses || 'Active,Inactive';
    const statuses = String(q).split(',').map(s => s.trim()).filter(Boolean);
    const combos = await comboService.getCombosByStatuses(statuses);
    return res.json({ data: combos });
  } catch (err) {
    next(err);
  }
};

const createCombo = async (req, res) => {
  try {
    // Parse JSON data from multipart form
    const data = JSON.parse(req.body.data);
    
    // Get uploaded file path (relative path for storage in DB) - save to AnhCombo folder
    const hinhAnh = req.file ? `/images/AnhCombo/${req.file.filename}` : null;
    
    if (!hinhAnh) {
      return res.status(400).json({ message: 'Hình ảnh combo là bắt buộc' });
    }

    const comboData = {
      tenCombo: data.tenCombo,
      moTa: data.moTa,
      giaCombo: Number(data.giaCombo),
      hinhAnh: hinhAnh,
      trangThai: data.trangThai || 'Active',
      thoiGianHetHan: data.thoiGianHetHan || null,
      items: data.items || [],
    };

    const newCombo = await comboService.createCombo(comboData);
    return res.status(201).json({ 
      message: 'Thêm combo thành công', 
      combo: newCombo 
    });
  } catch (err) {
    console.error('Error createCombo:', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
};

const updateComboStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Trạng thái là bắt buộc' });
    }

    const updatedCombo = await comboService.updateComboStatus(id, status);
    return res.status(200).json({ 
      message: 'Cập nhật trạng thái combo thành công', 
      combo: updatedCombo 
    });
  } catch (err) {
    console.error('Error updateComboStatus:', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
};

const deleteCombo = async (req, res) => {
  try {
    const id = req.params.id;
    const deletedCombo = await comboService.deleteCombo(id);
    return res.status(200).json({ 
      message: 'Xóa combo thành công', 
      combo: deletedCombo 
    });
  } catch (err) {
    console.error('Error deleteCombo:', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
};

const updateCombo = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Parse JSON data from multipart form
    const data = JSON.parse(req.body.data);
    
    // Get uploaded file path if new image provided (otherwise keep existing)
    const hinhAnh = req.file ? `/images/AnhCombo/${req.file.filename}` : data.hinhAnh;
    
    if (!hinhAnh) {
      return res.status(400).json({ message: 'Hình ảnh combo là bắt buộc' });
    }

    const comboData = {
      moTa: data.moTa,
      giaCombo: Number(data.giaCombo),
      hinhAnh: hinhAnh,
      trangThai: data.trangThai || 'Active',
      thoiGianHetHan: data.thoiGianHetHan || null,
      items: data.items || [],
    };

    const updatedCombo = await comboService.updateCombo(id, comboData);
    return res.status(200).json({ 
      message: 'Cập nhật combo thành công', 
      combo: updatedCombo 
    });
  } catch (err) {
    console.error('Error updateCombo:', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
};

module.exports = { 
  getCombos, 
  getComboById, 
  getCombosAdmin, 
  createCombo, 
  updateComboStatus, 
  deleteCombo,
  updateCombo 
};