# Backend Notes

## Banner API

- Endpoint: `GET /api/banners`
- Response body: JSON array of relative paths, e.g. `["/images/Banner/1.jpg", "/images/Banner/2.jpg"]`
- Files are served via Express static middleware from `public/images/Banner`

## VNPay Sandbox Checkout

- Required environment variables (defaults fallback to sandbox credentials supplied by stakeholder):
  - `VNP_TMNCODE`
  - `VNP_HASH_SECRET`
  - `VNP_URL` (default: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`)
  - `VNP_API` (default: `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction`)
  - `VNP_RETURN_URL` (default: `http://localhost:3001/api/payment/vnpay-return`)
- When an order is created with payment method `Chuyển Khoản`, the service now returns a VNPay sandbox payment URL together with transaction metadata (`paymentTxnRef`, `paymentExpireAt`).
- Optional request payload fields under `payment` may override VNPay options: `orderInfo`, `bankCode`, `locale`, `orderType`, `returnUrl`, `ipAddress`, `txnRef`, `expireMinutes`.
- Verify the return URL endpoint handles VNPay response codes before going live.

## Auth JWT Secrets

- Nên cấu hình riêng 2 biến sau (đặc biệt trên production):
  - `USER_JWT_SECRET`
  - `ADMIN_JWT_SECRET`
- Nếu không khai báo, backend dùng 2 fallback secret mặc định tách biệt cho local dev.
- Backend sẽ từ chối khởi động nếu 2 secret resolve ra cùng một giá trị.
