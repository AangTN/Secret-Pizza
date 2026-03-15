const service = require('./order.service');

async function createOrder(req, res) {
  try {
    const payload = req.body;
    const result = await service.createOrder(payload);
    // Return success message together with result for client convenience
    res.status(201).json({ message: 'Tạo đơn hàng thành công', ...result });
  } catch (err) {
    console.error('createOrder error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function getAllOrders(req, res) {
  try {
    const data = await service.getAllOrders();
    res.status(200).json({ data });
  } catch (err) {
    console.error('getAllOrders error:', err);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
}

async function getOrderById(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Thiếu id hợp lệ' });
    const data = await service.getOrderById(id);
    if (!data) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.status(200).json({ data });
  } catch (err) {
    console.error('getOrderById error:', err);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
}

async function getOrdersByUserId(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ message: 'Thiếu userId hợp lệ' });
    const data = await service.getOrdersByUserId(userId);
    res.status(200).json({ data });
  } catch (err) {
    console.error('getOrdersByUserId error:', err);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
}

async function getOrdersByBranchId(req, res) {
  try {
    const branchId = Number(req.params.branchId);
    if (!branchId) return res.status(400).json({ message: 'Thiếu branchId hợp lệ' });
    const data = await service.getOrdersByBranchId(branchId);
    res.status(200).json({ data });
  } catch (err) {
    console.error('getOrdersByBranchId error:', err);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
}

async function getOrdersByPhone(req, res) {
  try {
    const soDienThoai = req.params.phone;
    if (!soDienThoai) return res.status(400).json({ message: 'Thiếu số điện thoại' });
    const data = await service.getOrdersByPhone(soDienThoai);
    res.status(200).json({ data });
  } catch (err) {
    console.error('getOrdersByPhone error:', err);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
}

async function getAllOrderReviews(req, res) {
  try {
    const data = await service.getAllOrderReviews();
    res.status(200).json({ data });
  } catch (err) {
    console.error('getAllOrderReviews error:', err);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
}

async function cancelOrder(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Thiếu id hợp lệ' });
    await service.cancelOrder(id);
    res.status(200).json({ message: 'Hủy đơn hàng thành công' });
  } catch (err) {
    console.error('cancelOrder error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function cancelOrderByStaff(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Thiếu id hợp lệ' });
    await service.cancelOrderByStaff(id);
    res.status(200).json({ message: 'Hủy đơn hàng thành công' });
  } catch (err) {
    console.error('cancelOrderByStaff error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Thiếu id hợp lệ' });
    const { TrangThai, GhiChu, MaNguoiThucHien } = req.body;
    if (!TrangThai) return res.status(400).json({ message: 'Thiếu trạng thái mới' });
    const updated = await service.updateOrderStatus(id, TrangThai, MaNguoiThucHien || null, GhiChu || null);
    res.status(200).json({ data: updated });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function rateOrder(req, res) {
  try {
    const maDonHang = Number(req.params.id);
    if (!maDonHang) {
      return res.status(400).json({ message: 'Thiếu mã đơn hàng hợp lệ' });
    }
    const payload = { ...req.body, MaDonHang: maDonHang };
    const review = await service.rateOrder(payload);
    res.status(201).json({
      message: 'Đánh giá đơn hàng thành công',
      data: review,
    });
  } catch (err) {
    console.error('rateOrder error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function getOrderReview(req, res) {
  try {
    const maDonHang = Number(req.params.id);
    if (!maDonHang) {
      return res.status(400).json({ message: 'Thiếu mã đơn hàng hợp lệ' });
    }
    const review = await service.getOrderReview(maDonHang);
    if (!review) {
      return res.status(404).json({ message: 'Chưa có đánh giá cho đơn hàng này' });
    }
    res.status(200).json({ data: review });
  } catch (err) {
    console.error('getOrderReview error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function assignShipperToOrder(req, res) {
  try {
    const maDonHang = Number(req.params.id);
    const { maNguoiDungGiaoHang } = req.body;
    
    if (!maDonHang || !maNguoiDungGiaoHang) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết' });
    }

    const updated = await service.assignShipperToOrder(maDonHang, maNguoiDungGiaoHang);
    res.status(200).json({ 
      message: 'Nhận đơn hàng thành công', 
      data: updated 
    });
  } catch (err) {
    console.error('assignShipperToOrder error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  getOrdersByBranchId,
  getOrdersByPhone,
  getAllOrderReviews,
  cancelOrder,
  cancelOrderByStaff,
  updateOrderStatus,
  rateOrder,
  getOrderReview,
  assignShipperToOrder,
};

