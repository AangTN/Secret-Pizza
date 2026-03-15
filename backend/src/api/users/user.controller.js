const service = require('./user.service');

async function getUserProfile(req, res) {
  try {
    const maNguoiDung = Number(req.params.id);
    if (!maNguoiDung) {
      return res.status(400).json({ message: 'id không hợp lệ' });
    }
    const user = await service.getUserProfile(maNguoiDung);
    res.status(200).json({ data: user });
  } catch (err) {
    console.error('getUserProfile error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function updateUserProfile(req, res) {
  try {
    const updatedUser = await service.updateUserProfile(req.body);
    res.status(200).json({
      message: 'Cập nhật thông tin thành công',
      data: updatedUser,
    });
  } catch (err) {
    console.error('updateUserProfile error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function getAllAccounts(req, res) {
  try {
    const accounts = await service.getAllAccounts();
    res.status(200).json({ data: accounts });
  } catch (err) {
    console.error('getAllAccounts error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function blockUser(req, res) {
  try {
    const maNguoiDung = Number(req.params.id);
    if (!maNguoiDung) {
      return res.status(400).json({ message: 'id không hợp lệ' });
    }

    const updated = await service.blockUser(maNguoiDung);
    res.status(200).json({ message: 'Đã khóa tài khoản', data: updated });
  } catch (err) {
    console.error('blockUser error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function unblockUser(req, res) {
  try {
    const maNguoiDung = Number(req.params.id);
    if (!maNguoiDung) {
      return res.status(400).json({ message: 'id không hợp lệ' });
    }

    const updated = await service.unblockUser(maNguoiDung);
    res.status(200).json({ message: 'Đã mở khóa tài khoản', data: updated });
  } catch (err) {
    console.error('unblockUser error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function createUser(req, res) {
  try {
    const newUser = await service.createUser(req.body);
    res.status(201).json({
      message: 'Tạo người dùng thành công',
      data: newUser,
    });
  } catch (err) {
    console.error('createUser error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function updateUserRole(req, res) {
  try {
    const maNguoiDung = Number(req.params.id);
    const { Role } = req.body;
    
    if (!maNguoiDung) {
      return res.status(400).json({ message: 'id không hợp lệ' });
    }
    
    const updated = await service.updateUserRole(maNguoiDung, Role);
    res.status(200).json({
      message: 'Cập nhật vai trò thành công',
      data: updated,
    });
  } catch (err) {
    console.error('updateUserRole error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  getAllAccounts,
  blockUser,
  unblockUser,
  createUser,
  updateUserRole,
};
