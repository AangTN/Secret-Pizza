# 🌟 HƯỚNG DẪN SỬ DỤNG API ĐÁNH GIÁ ĐƠN HÀNG

## 📌 Tóm tắt nhanh

API cho phép khách hàng đánh giá đơn hàng sau khi đã nhận hàng.

---

## 🔥 Các API có sẵn

### 1. Đánh giá đơn hàng
**POST** `/api/orders/:id/rate`

**Body tối thiểu:**
```json
{
  "SoSao": 5
}
```

**Body đầy đủ:**
```json
{
  "MaNguoiDung": 1,
  "SoSao": 5,
  "BinhLuan": "Giao hàng nhanh, đồ ăn ngon!"
}
```

### 2. Xem đánh giá của đơn hàng
**GET** `/api/orders/:id/review`

Không cần body, chỉ cần GET đến endpoint này.

---

## 💡 Ví dụ thực tế

### Ví dụ 1: Khách hàng đánh giá 5 sao
```javascript
fetch('http://localhost:3000/api/orders/15/rate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    MaNguoiDung: 1,
    SoSao: 5,
    BinhLuan: "Rất hài lòng! Pizza còn nóng, giao đúng giờ."
  })
})
```

### Ví dụ 2: Đánh giá nhanh không comment
```javascript
fetch('http://localhost:3000/api/orders/20/rate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    SoSao: 4
  })
})
```

### Ví dụ 3: Xem đánh giá đã có
```javascript
fetch('http://localhost:3000/api/orders/15/review')
  .then(res => res.json())
  .then(data => console.log(data))
```

---

## ⚠️ Lưu ý quan trọng

### ✅ Điều kiện để đánh giá:
1. Đơn hàng phải có trạng thái **"Đã giao"**
2. Chỉ người đặt hàng mới được đánh giá
3. Mỗi đơn chỉ đánh giá được **1 lần duy nhất**

### 📏 Quy tắc:
- **SoSao**: Bắt buộc, từ 1-5
- **BinhLuan**: Tùy chọn
- **MaNguoiDung**: Tùy chọn (dùng để check quyền)

---

## 🎨 Response mẫu

### Khi thành công:
```json
{
  "message": "Đánh giá đơn hàng thành công",
  "data": {
    "MaDanhGiaDonHang": 1,
    "MaDonHang": 15,
    "SoSao": 5,
    "BinhLuan": "Rất hài lòng!",
    "NgayDanhGia": "2025-11-09T10:30:00.000Z"
  }
}
```

### Khi có lỗi:
```json
{
  "message": "Chỉ có thể đánh giá đơn hàng đã được giao"
}
```

---

## 🧪 Test nhanh

### Với PowerShell (Windows):
```powershell
# Đánh giá đơn hàng
$body = @{
    SoSao = 5
    BinhLuan = "Tuyệt vời!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/orders/15/rate" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

# Xem đánh giá
Invoke-RestMethod -Uri "http://localhost:3000/api/orders/15/review"
```

### Với Postman:
1. **Tạo request POST**
   - URL: `http://localhost:3000/api/orders/15/rate`
   - Body (JSON):
     ```json
     {
       "SoSao": 5,
       "BinhLuan": "Tuyệt vời!"
     }
     ```

2. **Tạo request GET**
   - URL: `http://localhost:3000/api/orders/15/review`
   - Không cần body

---

## 📚 Tài liệu chi tiết

- 📄 **ORDER_REVIEW_API.md** - Tài liệu API đầy đủ
- 📄 **SUMMARY_ORDER_REVIEW.md** - Tóm tắt tất cả thay đổi
- 📄 **test-order-review.js** - File test tự động

---

## 🆘 Các lỗi thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| "Thiếu số sao đánh giá" | Không gửi `SoSao` | Thêm field `SoSao` vào body |
| "Số sao phải là số nguyên từ 1 đến 5" | `SoSao` không hợp lệ | Đảm bảo `SoSao` là 1, 2, 3, 4 hoặc 5 |
| "Chỉ có thể đánh giá đơn hàng đã được giao" | Đơn hàng chưa giao | Đợi đơn hàng có trạng thái "Đã giao" |
| "Đơn hàng này đã được đánh giá rồi" | Đã đánh giá trước đó | Không thể đánh giá lại |
| "Không tìm thấy đơn hàng" | ID đơn hàng sai | Kiểm tra lại ID đơn hàng |

---

## 🎯 Use Cases

### 1. **Khách hàng hài lòng** (5 sao)
```json
{
  "SoSao": 5,
  "BinhLuan": "Pizza ngon, giao nhanh, shipper thân thiện!"
}
```

### 2. **Khách hàng bình thường** (3-4 sao)
```json
{
  "SoSao": 4,
  "BinhLuan": "Đồ ăn ngon nhưng giao hơi chậm"
}
```

### 3. **Khách hàng không hài lòng** (1-2 sao)
```json
{
  "SoSao": 2,
  "BinhLuan": "Pizza nguội, giao chậm 1 tiếng"
}
```

### 4. **Đánh giá nhanh không comment**
```json
{
  "SoSao": 4
}
```

---

## ✨ Tính năng đặc biệt

- ✅ **Tự động ghi thời gian**: `NgayDanhGia` được tạo tự động
- ✅ **Bảo vệ quyền**: Chỉ chủ đơn hàng mới đánh giá được
- ✅ **Ngăn spam**: Mỗi đơn chỉ đánh giá 1 lần
- ✅ **Validation chặt chẽ**: Kiểm tra đầy đủ trước khi lưu
- ✅ **Error message rõ ràng**: Dễ debug và fix lỗi

---

## 🚀 Bắt đầu ngay

1. Đảm bảo server đang chạy
2. Tìm một đơn hàng đã giao (status "Đã giao")
3. Gọi API với `SoSao` từ 1-5
4. Done! ✅

---

## 💬 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. ✅ Server có đang chạy không?
2. ✅ Đơn hàng có status "Đã giao" chưa?
3. ✅ Đơn hàng đã được đánh giá trước đó chưa?
4. ✅ Body request có đúng format JSON không?
5. ✅ `SoSao` có từ 1-5 không?
