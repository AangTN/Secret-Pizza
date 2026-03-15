const orderRepo = require('../order/order.repository');
const { createPaymentUrl: createVnpayUrl, verifyReturnUrl } = require('../../utils/vnpay');
const { emitOrderChanged } = require('../../realtime/socket');

async function handleVNPayReturn(queryParams) {
  // Verify signature first
  const verifyResult = verifyReturnUrl(queryParams);
  if (!verifyResult.isValid) {
    const e = new Error('Chữ ký không hợp lệ (Checksum failed)');
    e.status = 400;
    throw e;
  }

  // Extract orderId from vnp_TxnRef (format: orderId-timestamp)
  const txnRef = queryParams.vnp_TxnRef;
  if (!txnRef) {
    const e = new Error('Không tìm thấy mã giao dịch');
    e.status = 400;
    throw e;
  }
  
  // Parse orderId from txnRef (format: "orderId-timestamp")
  const orderId = txnRef.split('-')[0];
  if (!orderId) {
    const e = new Error('Không tìm thấy mã đơn hàng');
    e.status = 400;
    throw e;
  }
  
  // Kiểm tra đơn hàng có tồn tại không
  const order = await orderRepo.findOrderByIdDetailed(Number(orderId));
  if (!order) {
    const e = new Error('Không tìm thấy đơn hàng');
    e.status = 404;
    throw e;
  }
  
  // Kiểm tra transactionStatus
  // vnp_TransactionStatus = '00' => Thành công
  const transactionStatus = queryParams.vnp_TransactionStatus;
  const isSuccess = transactionStatus === '00';
  
  let paymentStatus = 'Chưa thanh toán';
  let orderStatus = null;
  
  if (isSuccess) {
    paymentStatus = 'Đã thanh toán';
    orderStatus = 'Đang chờ xác nhận';
  } else {
    paymentStatus = 'Thanh toán thất bại';
    // Giữ nguyên trạng thái đơn hàng là "Chờ thanh toán"
  }
  
  const amount = queryParams.vnp_Amount ? parseInt(queryParams.vnp_Amount) / 100 : 0;
  const transactionNo = queryParams.vnp_TransactionNo || queryParams.vnp_BankTranNo || '0';
  
  // Thêm timestamp vào đầu mã giao dịch để tránh trùng lặp (đặc biệt khi transactionNo = '0' nếu thất bại)
  const uniqueTransactionCode = `${Date.now()}-${transactionNo}`;
  
  console.log('📥 VNPay callback nhận được:', {
    orderId,
    transactionNo,
    uniqueTransactionCode,
    paymentStatus,
    amount,
    isSuccess,
  });
  
  // Tạo payment mới với mã giao dịch unique
  await orderRepo.createPaymentForOrder({
    maDonHang: orderId,
    phuongThuc: 'Chuyển Khoản',
    trangThai: paymentStatus,
    soTien: amount,
    maGiaoDich: uniqueTransactionCode,
  });
  
  // Nếu thanh toán thành công, cập nhật trạng thái đơn hàng
  if (isSuccess && orderStatus) {
    await orderRepo.updateOrderStatus(orderId, orderStatus, 'Thanh toán VNPay thành công');
  }

  const latestOrder = await orderRepo.findOrderByIdDetailed(Number(orderId));
  if (latestOrder) {
    try {
      emitOrderChanged(latestOrder, {
        type: 'payment_updated',
        meta: {
          isSuccess,
          paymentStatus,
          transactionStatus,
          responseCode: queryParams.vnp_ResponseCode,
        },
      });
    } catch (error) {
      console.error('Không thể phát sự kiện realtime cho cập nhật thanh toán:', error);
    }
  }
  
  return {
    success: isSuccess,
    orderId,
    responseCode: queryParams.vnp_ResponseCode,
    transactionStatus: queryParams.vnp_TransactionStatus,
    message: isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại',
    amount,
    bankCode: queryParams.vnp_BankCode,
    transactionNo: queryParams.vnp_TransactionNo,
    payDate: queryParams.vnp_PayDate,
  };
}

async function createPaymentUrlForOrder(orderId, ipAddress = '127.0.0.1') {
  // Kiểm tra đơn hàng tồn tại
  const order = await orderRepo.findOrderByIdDetailed(orderId);
  if (!order) {
    const e = new Error('Không tìm thấy đơn hàng');
    e.status = 404;
    throw e;
  }

  // Kiểm tra trạng thái đơn hàng - chỉ cho phép tạo URL khi đơn ở trạng thái "Chờ thanh toán"
  const latestStatus = order.LichSuTrangThaiDonHang && order.LichSuTrangThaiDonHang.length > 0
    ? order.LichSuTrangThaiDonHang[0].TrangThai
    : null;
  
  if (!latestStatus || latestStatus.trim() !== 'Chờ thanh toán') {
    const e = new Error(`Không thể tạo URL thanh toán. Trạng thái đơn hàng hiện tại: ${latestStatus || 'Không xác định'}`);
    e.status = 400;
    throw e;
  }

  // Kiểm tra xem có payment record nào đã thanh toán chưa
  if (order.ThanhToan) {
    // ThanhToan có thể là array hoặc object tùy thuộc vào include
    const payments = Array.isArray(order.ThanhToan) ? order.ThanhToan : [order.ThanhToan];
    const paidPayment = payments.find(p => 
      String(p.TrangThai || '').trim().toLowerCase() === 'đã thanh toán'
    );
    
    if (paidPayment) {
      const e = new Error('Đơn hàng đã được thanh toán');
      e.status = 400;
      throw e;
    }
  }

  // Tạo URL thanh toán VNPay
  const amount = Number(order.TongTien) || 0;
  if (amount <= 0) {
    const e = new Error('Số tiền thanh toán không hợp lệ');
    e.status = 400;
    throw e;
  }

  try {
    const paymentData = createVnpayUrl({
      amount,
      orderId: order.MaDonHang,
      orderInfo: `Thanh toán đơn hàng #${order.MaDonHang}`,
      ipAddr: ipAddress,
      txnRef: `${order.MaDonHang}-${Math.floor(Date.now() / 1000)}`,
      expireMinutes: 15,
    });

    return {
      orderId: order.MaDonHang,
      amount,
      paymentUrl: paymentData.url,
      paymentGateway: 'VNPay',
      txnRef: paymentData.params.vnp_TxnRef,
      expireAt: paymentData.params.vnp_ExpireDate,
    };
  } catch (err) {
    console.error('Error creating VNPay URL:', err);
    const e = new Error('Không thể tạo liên kết thanh toán VNPay');
    e.status = 500;
    throw e;
  }
}

module.exports = {
  handleVNPayReturn,
  createPaymentUrlForOrder,
};
