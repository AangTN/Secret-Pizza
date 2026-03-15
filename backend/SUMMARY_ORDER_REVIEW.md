# 📝 TÓM TẮT: API ĐÁNH GIÁ ĐơN HÀNG

## 🎯 Tính năng đã hoàn thành

Đã tạo API để khách hàng đánh giá đơn hàng sau khi nhận hàng.

---

## 📂 Các file đã thay đổi/tạo mới

### 1. **src/api/order/order.controller.js** ✅
   - Thêm hàm `rateOrder()` - Tạo đánh giá cho đơn hàng
   - Thêm hàm `getOrderReview()` - Lấy thông tin đánh giá

### 2. **src/api/order/order.service.js** ✅
   - Thêm hàm `rateOrder()` - Business logic cho đánh giá
   - Thêm hàm `getOrderReview()` - Lấy đánh giá
   - Validation: số sao (1-5), quyền sở hữu, trạng thái đơn hàng

### 3. **src/api/order/order.repository.js** ✅
   - Thêm hàm `createOrderReview()` - Tạo record trong database
   - Thêm hàm `findOrderReview()` - Query đánh giá từ database

### 4. **src/api/order/order.routes.js** ✅
   - Thêm route: `POST /api/orders/:id/rate`
   - Thêm route: `GET /api/orders/:id/review`

### 5. **src/api/order/ORDER_REVIEW_API.md** 🆕
   - Tài liệu API đầy đủ
   - Ví dụ request/response
   - Error handling
   - Business rules

### 6. **test-order-review.js** 🆕
   - File test để demo API
   - 6 test cases khác nhau

---

## 🚀 Endpoints mới

### 1️⃣ Tạo đánh giá đơn hàng
```
POST /api/orders/:id/rate
```

### 2️⃣ Lấy thông tin đánh giá
```
GET /api/orders/:id/review
```

---

## 📋 Mẫu JSON

### ✅ REQUEST - Đánh giá đầy đủ
```json
POST /api/orders/15/rate
Content-Type: application/json

{
  "MaNguoiDung": 1,
  "SoSao": 5,
  "BinhLuan": "Giao hàng nhanh, đồ ăn ngon, shipper thân thiện!"
}
```

### ✅ RESPONSE - Thành công (201)
```json
{
  "message": "Đánh giá đơn hàng thành công",
  "data": {
    "MaDanhGiaDonHang": 1,
    "MaDonHang": 15,
    "SoSao": 5,
    "BinhLuan": "Giao hàng nhanh, đồ ăn ngon, shipper thân thiện!",
    "NgayDanhGia": "2025-11-09T10:30:00.000Z",
    "DonHang": {
      "MaDonHang": 15,
      "NgayDat": "2025-11-08T14:20:00.000Z",
      "TongTien": "285000.00",
      "NguoiDung": {
        "HoTen": "Nguyễn Văn A"
      }
    }
  }
}
```

### ✅ REQUEST - Chỉ số sao (không bình luận)
```json
POST /api/orders/20/rate
Content-Type: application/json

{
  "SoSao": 4
}
```

### ✅ RESPONSE - Thành công (201)
```json
{
  "message": "Đánh giá đơn hàng thành công",
  "data": {
    "MaDanhGiaDonHang": 2,
    "MaDonHang": 20,
    "SoSao": 4,
    "BinhLuan": null,
    "NgayDanhGia": "2025-11-09T10:35:00.000Z"
  }
}
```

### ✅ REQUEST - Đánh giá thấp với lý do
```json
POST /api/orders/25/rate
Content-Type: application/json

{
  "MaNguoiDung": 5,
  "SoSao": 2,
  "BinhLuan": "Giao hàng chậm, đồ ăn hơi nguội khi nhận được"
}
```

### ✅ RESPONSE - Lấy thông tin đánh giá (GET)
```json
GET /api/orders/15/review

{
  "data": {
    "MaDanhGiaDonHang": 1,
    "MaDonHang": 15,
    "SoSao": 5,
    "BinhLuan": "Giao hàng nhanh, đồ ăn ngon!",
    "NgayDanhGia": "2025-11-09T10:30:00.000Z",
    "DonHang": {
      "MaDonHang": 15,
      "NgayDat": "2025-11-08T14:20:00.000Z",
      "TongTien": "285000.00",
      "NguoiDung": {
        "HoTen": "Nguyễn Văn A"
      }
    }
  }
}
```

---

## ❌ Các trường hợp lỗi

### 1. Thiếu số sao (400)
```json
{
  "message": "Thiếu số sao đánh giá"
}
```

### 2. Số sao không hợp lệ (400)
```json
{
  "message": "Số sao phải là số nguyên từ 1 đến 5"
}
```

### 3. Đơn hàng chưa giao (400)
```json
{
  "message": "Chỉ có thể đánh giá đơn hàng đã được giao"
}
```

### 4. Đã đánh giá rồi (400)
```json
{
  "message": "Đơn hàng này đã được đánh giá rồi"
}
```

### 5. Không có quyền (403)
```json
{
  "message": "Bạn không có quyền đánh giá đơn hàng này"
}
```

### 6. Không tìm thấy đơn hàng (404)
```json
{
  "message": "Không tìm thấy đơn hàng"
}
```

### 7. Chưa có đánh giá (404)
```json
{
  "message": "Chưa có đánh giá cho đơn hàng này"
}
```

---

## 🔐 Business Rules

1. **Quyền đánh giá**: Chỉ người đặt hàng mới có quyền đánh giá
2. **Trạng thái đơn hàng**: Phải có trạng thái "Đã giao"
3. **Một lần duy nhất**: Mỗi đơn hàng chỉ được đánh giá 1 lần
4. **Validation số sao**: Phải là số nguyên từ 1 đến 5
5. **Bình luận tùy chọn**: Có thể để trống

---

## 🧪 Test nhanh với cURL

### Tạo đánh giá
```bash
curl -X POST http://localhost:3000/api/orders/15/rate \
  -H "Content-Type: application/json" \
  -d '{
    "MaNguoiDung": 1,
    "SoSao": 5,
    "BinhLuan": "Giao hàng nhanh, đồ ăn ngon!"
  }'
```

### Lấy thông tin đánh giá
```bash
curl -X GET http://localhost:3000/api/orders/15/review
```

---

## 📊 Database Schema

API sử dụng model `DanhGiaDonHang` trong Prisma:

```prisma
model DanhGiaDonHang {
  MaDanhGiaDonHang Int      @id @default(autoincrement())
  MaDonHang        Int      @unique
  SoSao            Int
  BinhLuan         String?
  NgayDanhGia      DateTime @default(now())
  DonHang          DonHang  @relation(...)
}
```

---

## ✨ Đặc điểm nổi bật

- ✅ Validation đầy đủ (số sao, quyền, trạng thái)
- ✅ Error handling rõ ràng với message tiếng Việt
- ✅ Kiểm tra quyền sở hữu đơn hàng
- ✅ Chỉ cho phép đánh giá sau khi giao hàng
- ✅ Mỗi đơn hàng chỉ đánh giá 1 lần
- ✅ Bình luận tùy chọn (optional)
- ✅ Tự động ghi nhận thời gian đánh giá
- ✅ Response đầy đủ thông tin đơn hàng

---

## 📝 Ghi chú

- API đã sẵn sàng để sử dụng
- Đảm bảo server đang chạy trước khi test
- Có thể chạy file `test-order-review.js` để test tự động
- Chi tiết đầy đủ xem trong `ORDER_REVIEW_API.md`
