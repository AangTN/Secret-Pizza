// --- IMPORT CÁC THƯ VIỆN CẦN THIẾT ---
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const cacheHeaderMiddleware = require('./src/middleware/cacheHeader.middleware');
const { initSocketServer } = require('./src/realtime/socket');

// --- IMPORT CÁC ROUTES CỦA ỨNG DỤNG ---
const authRoutes = require('./src/api/auth/auth.routes');
const categoryRoutes = require('./src/api/categories/category.routes');
const typeRoutes = require('./src/api/types/type.routes');
const foodRoutes = require('./src/api/foods/food.routes');
const variantRoutes = require('./src/api/variants/variant.routes');
const crustRoutes = require('./src/api/crusts/crust.routes');
const branchRoutes = require('./src/api/branch/branch.routes');
const shippingRoutes = require('./src/api/order/shipping.routes');
const voucherRoutes = require('./src/api/vouchers/voucher.routes');
const orderRoutes = require('./src/api/order/order.routes');
const bannerRoutes = require('./src/api/banners/banner.routes');
const comboRoutes = require('./src/api/combos/combo.routes');
const paymentRoutes = require('./src/api/payment/payment.routes');
const reviewRoutes = require('./src/api/reviews/review.routes');
const userRoutes = require('./src/api/users/user.routes');
const promotionRoutes = require('./src/api/promotions/promotion.routes');
const sizeRoutes = require('./src/api/sizes/size.routes');
const optionRoutes = require('./src/api/options/option.routes');
const giftRoutes = require('./src/api/gifts/gift.routes');
const chatRoutes = require('./src/api/chat/chat.routes');
const cacheRoutes = require('./src/api/cache/cache.routes');

// --- KHỞI TẠO EXPRESS APP ---
const app = express();

const localDevOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];

const configuredOrigins = [process.env.CORS_ORIGINS, process.env.FRONTEND_URL]
  .filter(Boolean)
  .join(',')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set(
    process.env.NODE_ENV === 'production'
      ? configuredOrigins
      : [...configuredOrigins, ...localDevOrigins]
  )
);

// --- CẤU HÌNH MIDDLEWARE ---
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(cookieParser());

// Cho phép server đọc và xử lý dữ liệu dạng JSON trong body của request
app.use(express.json());
app.use(express.static('public'));
app.use('/api', cacheHeaderMiddleware);

// --- ĐỊNH NGHĨA CÁC API ROUTES ---
// Route cơ bản để kiểm tra server có đang "sống" hay không
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running healthy!' });
});

// Sử dụng routes đã tách riêng
app.use('/api/auth', authRoutes);

app.use('/api/categories', categoryRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/crusts', crustRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/combos', comboRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/options', optionRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/cache', cacheRoutes);


// --- KHỞI ĐỘNG SERVER ---
// Lấy PORT từ biến môi trường (do Render cung cấp) hoặc dùng 3001 khi chạy local
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
initSocketServer(server, allowedOrigins);

server.listen(PORT, () => {
  console.log(`🚀 Server SECRET PIZZA đang chạy tại cổng ${PORT}`);
});