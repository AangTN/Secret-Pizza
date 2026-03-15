const service = require('./payment.service');

async function vnpayReturn(req, res) {
  try {
    const result = await service.handleVNPayReturn(req.query);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    if (result.success) {
      // Redirect về trang thành công
      res.redirect(`${frontendUrl}/order-success?orderId=${result.orderId}`);
    } else {
      // Redirect về trang thất bại với lý do
      const message = encodeURIComponent(result.message || 'Thanh toán thất bại');
      res.redirect(`${frontendUrl}/payment-failed?orderId=${result.orderId}&message=${message}`);
    }
  } catch (err) {
    console.error('VNPay return error:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const message = encodeURIComponent(err.message || 'Lỗi xử lý thanh toán');
    res.redirect(`${frontendUrl}/payment-failed?message=${message}`);
  }
}

async function createPaymentUrl(req, res) {
  try {
    const { orderId, ipAddress } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu mã đơn hàng'
      });
    }

    const clientIp = ipAddress || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
    
    const result = await service.createPaymentUrlForOrder(orderId, clientIp);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Error creating payment URL:', err);
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: err.message || 'Lỗi khi tạo URL thanh toán'
    });
  }
}

module.exports = {
  vnpayReturn,
  createPaymentUrl,
};
