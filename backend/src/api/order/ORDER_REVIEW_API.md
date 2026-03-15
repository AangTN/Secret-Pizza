# API Đánh Giá Đơn Hàng (Order Review API)

## Mô tả
API cho phép khách hàng đánh giá đơn hàng sau khi đã nhận được hàng.

## Endpoints

### 1. Tạo đánh giá cho đơn hàng
**POST** `/api/orders/:id/rate`

#### Request Parameters
- `id` (path parameter): Mã đơn hàng cần đánh giá

#### Request Body
```json
{
  "MaNguoiDung": 1,
  "SoSao": 5,
  "BinhLuan": "Giao hàng nhanh, đồ ăn ngon, shipper thân thiện!"
}
```

#### Request Body Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| MaNguoiDung | Integer | Optional | Mã người dùng (dùng để xác thực quyền sở hữu đơn hàng) |
| SoSao | Integer | **Required** | Số sao đánh giá (1-5) |
| BinhLuan | String | Optional | Nội dung đánh giá |

#### Response Success (201 Created)
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

#### Error Responses

**400 Bad Request - Thiếu số sao**
```json
{
  "message": "Thiếu số sao đánh giá"
}
```

**400 Bad Request - Số sao không hợp lệ**
```json
{
  "message": "Số sao phải là số nguyên từ 1 đến 5"
}
```

**400 Bad Request - Đơn hàng chưa giao**
```json
{
  "message": "Chỉ có thể đánh giá đơn hàng đã được giao"
}
```

**400 Bad Request - Đã đánh giá rồi**
```json
{
  "message": "Đơn hàng này đã được đánh giá rồi"
}
```

**403 Forbidden - Không có quyền**
```json
{
  "message": "Bạn không có quyền đánh giá đơn hàng này"
}
```

**404 Not Found - Không tìm thấy đơn hàng**
```json
{
  "message": "Không tìm thấy đơn hàng"
}
```

---

### 2. Lấy thông tin đánh giá của đơn hàng
**GET** `/api/orders/:id/review`

#### Request Parameters
- `id` (path parameter): Mã đơn hàng cần xem đánh giá

#### Response Success (200 OK)
```json
{
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

#### Error Responses

**404 Not Found - Chưa có đánh giá**
```json
{
  "message": "Chưa có đánh giá cho đơn hàng này"
}
```

---

## Ví dụ sử dụng

### Ví dụ 1: Đánh giá đơn hàng với đầy đủ thông tin
```javascript
// Request
POST /api/orders/15/rate
Content-Type: application/json

{
  "MaNguoiDung": 1,
  "SoSao": 5,
  "BinhLuan": "Giao hàng nhanh, đồ ăn ngon, shipper thân thiện!"
}

// Response (201)
{
  "message": "Đánh giá đơn hàng thành công",
  "data": {
    "MaDanhGiaDonHang": 1,
    "MaDonHang": 15,
    "SoSao": 5,
    "BinhLuan": "Giao hàng nhanh, đồ ăn ngon, shipper thân thiện!",
    "NgayDanhGia": "2025-11-09T10:30:00.000Z"
  }
}
```

### Ví dụ 2: Đánh giá đơn hàng chỉ với số sao (không có bình luận)
```javascript
// Request
POST /api/orders/20/rate
Content-Type: application/json

{
  "SoSao": 4
}

// Response (201)
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

### Ví dụ 3: Đánh giá thấp với lý do cụ thể
```javascript
// Request
POST /api/orders/25/rate
Content-Type: application/json

{
  "MaNguoiDung": 5,
  "SoSao": 2,
  "BinhLuan": "Giao hàng chậm, đồ ăn hơi nguội khi nhận được"
}

// Response (201)
{
  "message": "Đánh giá đơn hàng thành công",
  "data": {
    "MaDanhGiaDonHang": 3,
    "MaDonHang": 25,
    "SoSao": 2,
    "BinhLuan": "Giao hàng chậm, đồ ăn hơi nguội khi nhận được",
    "NgayDanhGia": "2025-11-09T11:00:00.000Z"
  }
}
```

### Ví dụ 4: Kiểm tra đánh giá của đơn hàng
```javascript
// Request
GET /api/orders/15/review

// Response (200)
{
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

---

## Business Rules

1. **Quyền đánh giá**: 
   - Chỉ người đặt hàng mới có quyền đánh giá đơn hàng của mình
   - Nếu cung cấp `MaNguoiDung`, hệ thống sẽ kiểm tra quyền sở hữu

2. **Điều kiện đánh giá**:
   - Đơn hàng phải có trạng thái "Đã giao" 
   - Mỗi đơn hàng chỉ được đánh giá 1 lần duy nhất
   - Không thể chỉnh sửa đánh giá sau khi đã gửi

3. **Validation**:
   - `SoSao` bắt buộc phải có và phải là số nguyên từ 1 đến 5
   - `BinhLuan` là tùy chọn, có thể để trống hoặc null

4. **Thời gian**:
   - `NgayDanhGia` được tự động ghi nhận là thời điểm hiện tại khi tạo đánh giá

---

## Testing với cURL

### Test 1: Tạo đánh giá mới
```bash
curl -X POST http://localhost:3000/api/orders/15/rate \
  -H "Content-Type: application/json" \
  -d '{
    "MaNguoiDung": 1,
    "SoSao": 5,
    "BinhLuan": "Giao hàng nhanh, đồ ăn ngon!"
  }'
```

### Test 2: Lấy thông tin đánh giá
```bash
curl -X GET http://localhost:3000/api/orders/15/review
```

### Test 3: Đánh giá không có bình luận
```bash
curl -X POST http://localhost:3000/api/orders/20/rate \
  -H "Content-Type: application/json" \
  -d '{
    "SoSao": 4
  }'
```

---

## Notes

- API này tích hợp sẵn trong module `/api/orders`
- Endpoints được thêm vào `order.routes.js`
- Logic được xử lý trong `order.service.js` và `order.controller.js`
- Database operations thông qua `order.repository.js`
- Sử dụng model `DanhGiaDonHang` trong Prisma schema
