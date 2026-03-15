# Payment API - VNPay Integration

## Endpoint xử lý callback từ VNPay

### GET `/api/payment/vnpay-return`

Endpoint này được VNPay gọi sau khi người dùng hoàn tất thanh toán.

#### Query Parameters (do VNPay trả về):
- `vnp_Amount`: Số tiền thanh toán (x100)
- `vnp_BankCode`: Mã ngân hàng
- `vnp_BankTranNo`: Mã giao dịch tại ngân hàng
- `vnp_CardType`: Loại thẻ (ATM/QRCODE)
- `vnp_OrderInfo`: Thông tin đơn hàng
- `vnp_PayDate`: Ngày thanh toán (yyyyMMddHHmmss)
- `vnp_ResponseCode`: Mã phản hồi ('00' = thành công)
- `vnp_TmnCode`: Mã Terminal
- `vnp_TransactionNo`: Mã giao dịch VNPay
- `vnp_TransactionStatus`: Trạng thái giao dịch ('00' = thành công)
- `vnp_TxnRef`: Mã đơn hàng (Order ID)
- `vnp_SecureHash`: Chữ ký bảo mật

#### Response Success (200):
```json
{
  "message": "Thanh toán thành công",
  "orderId": "45",
  "success": true
}
```

#### Response Failed (200):
```json
{
  "message": "Thanh toán thất bại",
  "orderId": "45",
  "success": false,
  "responseCode": "24"
}
```

#### Response Error (400/404/500):
```json
{
  "message": "Chữ ký không hợp lệ"
}
```

## Luồng thanh toán VNPay

1. **Client tạo đơn hàng** với `payment.phuongThuc = "Chuyển Khoản"`
2. **Server trả về** `paymentUrl` (VNPay payment link)
3. **Client redirect** người dùng đến `paymentUrl`
4. **Người dùng thanh toán** trên trang VNPay
5. **VNPay redirect** về `returnUrl` = `/api/payment/vnpay-return`
6. **Server xử lý callback**:
   - Verify chữ ký `vnp_SecureHash`
   - Kiểm tra `vnp_ResponseCode` và `vnp_TransactionStatus`
   - Cập nhật trạng thái thanh toán trong DB
7. **Server trả response** cho client

## Trạng thái thanh toán

- **Chưa thanh toán**: Mới tạo đơn hàng
- **Đã thanh toán**: VNPay trả về success (responseCode='00' & transactionStatus='00')
- **Thanh toán thất bại**: VNPay trả về failed

## VNPay Response Codes

- `00`: Giao dịch thành công
- `07`: Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)
- `09`: Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking
- `10`: Thẻ/Tài khoản không đúng
- `11`: Thẻ/Tài khoản hết hạn
- `12`: Thẻ/Tài khoản bị khóa
- `13`: Sai mật khẩu xác thực giao dịch
- `24`: Khách hàng hủy giao dịch
- `51`: Tài khoản không đủ số dư
- `65`: Tài khoản vượt quá hạn mức giao dịch trong ngày
- `75`: Ngân hàng thanh toán đang bảo trì
- `79`: Nhập sai mật khẩu quá số lần quy định
- `99`: Lỗi không xác định

## Cấu hình

File `.env`:
```
VNP_TMNCODE=J8L2W6TA
VNP_HASH_SECRET=3U03B9N9TEMWT8BQPUPB2U4ONLUOLZ53
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:3001/api/payment/vnpay-return
```

**Lưu ý**: Đây là thông tin sandbox. Khi lên production cần thay bằng thông tin thật.
