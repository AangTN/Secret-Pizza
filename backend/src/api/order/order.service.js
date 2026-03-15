const repo = require('./order.repository');
const shippingService = require('./shipping.service');
const aiReviewService = require('../../services/aiReviewService');
const { createPaymentUrl } = require('../../utils/vnpay');
const voucherRepo = require('../vouchers/voucher.repository');
const emailService = require('../../services/emailService');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');
const { emitOrderChanged } = require('../../realtime/socket');

function toNumber(x) {
  if (x == null) return 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function normalizeVoucherCode(code) {
  return String(code || '').trim().toUpperCase();
}

function invalidateOrderCaches({ orderId = null, userId = null, voucherCode = null, includeSales = false } = {}) {
  const tags = [
    cacheTags.USER_ORDER_LIST,
    cacheTags.USER_ORDER_DETAIL,
    cacheTags.VOUCHER_LIST,
  ];

  if (includeSales) {
    tags.push(cacheTags.BEST_SELLING);
    tags.push(cacheTags.HOME);
  }

  if (orderId) {
    tags.push(buildCacheKey(cacheTags.USER_ORDER_DETAIL, Number(orderId)));
  }

  if (userId) {
    tags.push(buildCacheKey(cacheTags.USER_ORDER_LIST, Number(userId)));
  }

  if (voucherCode) {
    tags.push(cacheTags.VOUCHER_BY_CODE);
    tags.push(buildCacheKey(cacheTags.VOUCHER_BY_CODE, normalizeVoucherCode(voucherCode)));
  }

  apiCache.deleteByTags(tags);
}

function emitOrderChangedSafe(order, options = {}) {
  try {
    emitOrderChanged(order, options);
  } catch (error) {
    console.error('Không thể phát sự kiện realtime cho đơn hàng:', error);
  }
}

/**
 * Random chọn một quà tặng dựa trên tỷ lệ xuất hiện
 * @param {Array} gifts - Danh sách quà tặng active với TyLeXuatHien
 * @returns {Object|null} - Quà tặng được chọn hoặc null nếu không có
 */
function selectRandomGift(gifts) {
  if (!Array.isArray(gifts) || gifts.length === 0) {
    return null;
  }

  // Tính tổng tỷ lệ
  const totalRate = gifts.reduce((sum, gift) => {
    const rate = Number(gift.TyLeXuatHien) || 0;
    return sum + rate;
  }, 0);

  // Nếu tổng tỷ lệ = 0 thì không có quà tặng nào có thể được chọn
  if (totalRate <= 0) {
    return null;
  }

  // Random một số từ 0 đến totalRate
  const rand = Math.random() * totalRate;

  // Tìm quà tặng tương ứng
  let accumulator = 0;
  for (const gift of gifts) {
    const rate = Number(gift.TyLeXuatHien) || 0;
    accumulator += rate;
    if (rand <= accumulator) {
      return gift;
    }
  }

  // Fallback về quà tặng cuối cùng (trường hợp rounding error)
  return gifts[gifts.length - 1];
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const e = new Error('Danh sách sản phẩm trống');
    e.status = 400;
    throw e;
  }
  for (const it of items) {
    const isCombo = it.loai === 'CB';
    
    if (isCombo) {
      // Validate combo
      if (!it.maCombo || toNumber(it.soLuong) <= 0) {
        const e = new Error('Combo không hợp lệ: thiếu maCombo hoặc soLuong');
        e.status = 400;
        throw e;
      }
      if (it.chiTietCombo !== undefined && (!Array.isArray(it.chiTietCombo) || it.chiTietCombo.length === 0)) {
        const e = new Error('Chi tiết combo không hợp lệ');
        e.status = 400;
        throw e;
      }
    } else {
      // Validate sản phẩm thường
      if (!it.maBienThe || toNumber(it.soLuong) <= 0) {
        const e = new Error('Sản phẩm không hợp lệ: thiếu maBienThe hoặc soLuong');
        e.status = 400;
        throw e;
      }
    }
  }
}

function calcDiscountAmount(voucher, subtotal) {
  if (!voucher) return 0;
  const min = voucher.DieuKienApDung ? Number(voucher.DieuKienApDung) : 0;
  if (min && subtotal < min) return 0;
  const type = String(voucher.LoaiGiamGia || '').toUpperCase();
  if (type === 'PERCENT') {
    const percent = Number(voucher.GiaTri) || 0;
    return Math.floor((subtotal * percent) / 100);
  }
  if (type === 'AMOUNT') {
    return Number(voucher.GiaTri) || 0;
  }
  return 0;
}

const getAllOrders = () => repo.findAllOrdersBasic();
const getOrderById = (id) => {
  const normalizedId = Number(id);
  const cacheKey = buildCacheKey('orders', 'detail', normalizedId);
  const detailTag = buildCacheKey(cacheTags.USER_ORDER_DETAIL, normalizedId);

  return apiCache.getOrSet(
    cacheKey,
    () => repo.findOrderByIdDetailed(id),
    {
      ttlMs: cacheTtls.USER_ORDER_DETAIL,
      tags: [cacheTags.USER_ORDER_DETAIL, detailTag],
      cacheNull: true,
    }
  );
};
const getOrdersByUserId = (userId) => {
  const normalizedUserId = Number(userId);
  const cacheKey = buildCacheKey('orders', 'user', normalizedUserId);
  const listTag = buildCacheKey(cacheTags.USER_ORDER_LIST, normalizedUserId);

  return apiCache.getOrSet(
    cacheKey,
    () => repo.findOrdersByUserIdBasic(userId),
    {
      ttlMs: cacheTtls.USER_ORDER_LIST,
      tags: [cacheTags.USER_ORDER_LIST, listTag],
    }
  );
};
const getOrdersByBranchId = (branchId) => repo.findOrdersByBranchIdBasic(branchId);
const getOrdersByPhone = (soDienThoai) => repo.findOrdersByPhoneBasic(soDienThoai);
const getAllOrderReviews = () => repo.findAllOrderReviews();

async function cancelOrder(maDonHang) {
  if (!maDonHang) {
    const e = new Error('Thiếu id đơn hàng');
    e.status = 400;
    throw e;
  }

  const existing = await repo.findOrderByIdDetailed(Number(maDonHang));
  const cancelled = await repo.cancelOrderById(Number(maDonHang));

  invalidateOrderCaches({
    orderId: maDonHang,
    userId: existing?.MaNguoiDung || null,
    voucherCode: existing?.MaVoucher || null,
  });

  const latestOrder = await repo.findOrderByIdDetailed(Number(maDonHang));
  emitOrderChangedSafe(latestOrder || existing, {
    type: 'cancelled',
    meta: { cancelledBy: 'customer' },
  });

  return cancelled;
}

async function cancelOrderByStaff(maDonHang) {
  if (!maDonHang) {
    const e = new Error('Thiếu id đơn hàng');
    e.status = 400;
    throw e;
  }

  const existing = await repo.findOrderByIdDetailed(Number(maDonHang));
  const cancelled = await repo.cancelOrderByStaff(Number(maDonHang));

  invalidateOrderCaches({
    orderId: maDonHang,
    userId: existing?.MaNguoiDung || null,
    voucherCode: existing?.MaVoucher || null,
  });

  const latestOrder = await repo.findOrderByIdDetailed(Number(maDonHang));
  emitOrderChangedSafe(latestOrder || existing, {
    type: 'cancelled',
    meta: { cancelledBy: 'staff' },
  });

  return cancelled;
}

async function createOrder(payload) {
  if (!payload) {
    const e = new Error('Thiếu dữ liệu đơn hàng');
    e.status = 400;
    throw e;
  }

  validateItems(payload.items);

  const shippingAddress = {
    soNhaDuong: payload.soNhaDuong || payload.soNhaDuongGiaoHang,
    phuongXa: payload.phuongXa || payload.phuongXaGiaoHang,
    quanHuyen: payload.quanHuyen || payload.quanHuyenGiaoHang,
    thanhPho: payload.thanhPho || payload.thanhPhoGiaoHang,
  };

  if (!shippingAddress.soNhaDuong || !shippingAddress.phuongXa || !shippingAddress.quanHuyen || !shippingAddress.thanhPho) {
    const e = new Error('Thiếu địa chỉ giao hàng đầy đủ');
    e.status = 400;
    throw e;
  }

  const shippingQuote = await shippingService.quoteShipping(shippingAddress);
  if (!shippingQuote.canShip) {
    const e = new Error(shippingQuote.message || 'Không thể giao tới địa chỉ này');
    e.status = 400;
    throw e;
  }

  const branch = shippingQuote.branch;
  if (!branch?.MaCoSo) {
    const e = new Error('Không xác định được cơ sở gần nhất');
    e.status = 500;
    throw e;
  }

  const phiShipFromQuote = toNumber(shippingQuote.fee);
  const etaMinutes = shippingQuote.etaMinutes ?? 0;
  // Calculate estimated delivery time in VN timezone (UTC+7)
  const estimatedDeliveryTime = etaMinutes
    ? new Date(Date.now() + etaMinutes * 60000 + 7 * 60 * 60000)
    : null;

  // 1) Recalculate line totals from DB prices with promotion
  let subtotalBeforePromo = 0; // Tổng tiền trước khuyến mãi
  let totalPromoDiscount = 0;   // Tổng tiền giảm từ khuyến mãi
  let subtotal = 0;              // Tổng tiền sau khuyến mãi (trước voucher)
  const normalizedItems = [];
  const now = new Date();

  const comboCache = new Map();
  const variantCache = new Map();
  const optionExtraCache = new Map();
  const crustValidityCache = new Map();

  const getComboCached = async (maCombo) => {
    const key = Number(maCombo);
    if (comboCache.has(key)) {
      return comboCache.get(key);
    }
    const value = await repo.getCombo(key);
    comboCache.set(key, value);
    return value;
  };

  const getVariantCached = async (maBienThe) => {
    const key = Number(maBienThe);
    if (variantCache.has(key)) {
      return variantCache.get(key);
    }
    const value = await repo.getVariant(key);
    variantCache.set(key, value);
    return value;
  };

  const getOptionExtraForSizeCached = async (maTuyChon, maSize) => {
    const key = `${Number(maTuyChon)}_${Number(maSize)}`;
    if (optionExtraCache.has(key)) {
      return optionExtraCache.get(key);
    }
    const value = await repo.getOptionExtraForSize(maTuyChon, maSize);
    optionExtraCache.set(key, value);
    return value;
  };

  const checkFoodCrustCached = async (maMonAn, maDeBanh) => {
    const key = `${Number(maMonAn)}_${Number(maDeBanh)}`;
    if (crustValidityCache.has(key)) {
      return crustValidityCache.get(key);
    }
    const value = await repo.checkFoodCrust(maMonAn, maDeBanh);
    crustValidityCache.set(key, value);
    return value;
  };
  
  for (const it of payload.items) {
    const isCombo = it.loai === 'CB';
    const qty = toNumber(it.soLuong);
    
    if (isCombo) {
      // Xử lý combo
      const combo = await getComboCached(it.maCombo);
      if (!combo) {
        const e = new Error(`Combo không tồn tại: ${it.maCombo}`);
        e.status = 400;
        throw e;
      }
      
      if (combo.TrangThai?.toLowerCase() !== 'active') {
        const e = new Error(`Combo "${combo.TenCombo}" không còn khả dụng`);
        e.status = 400;
        throw e;
      }

      const hasClientComboDetails = Array.isArray(it.chiTietCombo) && it.chiTietCombo.length > 0;
      const comboDetailsSource = hasClientComboDetails
        ? it.chiTietCombo
        : (combo.Combo_ChiTiet || []).map((dbItem) => ({
            maBienThe: dbItem.MaBienThe,
            maDeBanh: dbItem.MaDeBanh ?? null,
            soLuong: Number(dbItem.SoLuong || 1),
          }));

      if (!Array.isArray(comboDetailsSource) || comboDetailsSource.length === 0) {
        const e = new Error(`Combo "${combo.TenCombo}" chưa có chi tiết sản phẩm`);
        e.status = 400;
        throw e;
      }
      
      if (hasClientComboDetails) {
        // Nếu client gửi chi tiết combo, kiểm tra chặt để chống dữ liệu giỏ hàng cũ.
        const dbComboItems = new Map();
        for (const dbItem of combo.Combo_ChiTiet) {
          const key = `${dbItem.MaBienThe}_${dbItem.MaDeBanh || 'null'}`;
          dbComboItems.set(key, dbItem.SoLuong);
        }

        const clientComboItems = new Map();
        for (const clientItem of comboDetailsSource) {
          const key = `${clientItem.maBienThe}_${clientItem.maDeBanh || 'null'}`;
          const currentQty = clientComboItems.get(key) || 0;
          clientComboItems.set(key, currentQty + clientItem.soLuong);
        }

        if (dbComboItems.size !== clientComboItems.size) {
          const e = new Error(`Chi tiết combo "${combo.TenCombo}" không khớp với dữ liệu hệ thống`);
          e.status = 400;
          throw e;
        }

        for (const [key, dbQty] of dbComboItems) {
          const clientQty = clientComboItems.get(key);
          if (clientQty !== dbQty) {
            const e = new Error(`Chi tiết combo "${combo.TenCombo}" không khớp với dữ liệu hệ thống`);
            e.status = 400;
            throw e;
          }
        }
      }
      
      // Validate các biến thể có tồn tại
      const normalizedComboDetails = [];
      for (const ctc of comboDetailsSource) {
        const variant = await getVariantCached(ctc.maBienThe);
        if (!variant) {
          const e = new Error(`Sản phẩm trong combo không tồn tại: ${ctc.maBienThe}`);
          e.status = 400;
          throw e;
        }
        normalizedComboDetails.push({
          maBienThe: ctc.maBienThe,
          maDeBanh: ctc.maDeBanh ?? null,
          soLuong: ctc.soLuong,
        });
      }
      
      const unitPrice = Number(combo.GiaCombo);
      const lineTotal = unitPrice * qty;
      subtotalBeforePromo += lineTotal;
      
      // Combo không có khuyến mãi riêng, giá đã cố định
      subtotal += lineTotal;
      
      // Lấy bienthe đầu tiên làm đại diện (vì DB yêu cầu MaBienThe not null)
      const representativeVariant = comboDetailsSource[0].maBienThe;
      
      normalizedItems.push({
        loai: 'CB',
        maCombo: combo.MaCombo,
        maBienThe: representativeVariant, // Đại diện cho combo
        maDeBanh: null,
        soLuong: qty,
        donGia: unitPrice,
        thanhTien: lineTotal,
        chiTietCombo: normalizedComboDetails,
      });
      
    } else {
      // Xử lý sản phẩm thường với khuyến mãi
      const variant = await getVariantCached(it.maBienThe);
      if (!variant) {
        const e = new Error(`Dữ liệu sản phẩm đã cũ. Vui lòng thêm lại sản phẩm vào giỏ hàng: ${it.maBienThe}`);
        e.status = 409;
        e.code = 'STALE_CART';
        throw e;
      }

      // Validate Crust (Đế bánh)
      if (it.maDeBanh) {
        const isValidCrust = await checkFoodCrustCached(variant.MonAn.MaMonAn, it.maDeBanh);
        if (!isValidCrust) {
          const e = new Error(`Đế bánh không hợp lệ cho món ăn này hoặc đã bị xóa. Vui lòng cập nhật giỏ hàng.`);
          e.status = 409;
          e.code = 'STALE_CART';
          throw e;
        }
      }
      
      let unitPrice = Number(variant.GiaBan);
      const optionCreates = [];
      if (Array.isArray(it.tuyChon) && it.tuyChon.length) {
        for (const t of it.tuyChon) {
          const rec = await getOptionExtraForSizeCached(t.maTuyChon, variant.MaSize);
          if (!rec) {
             const e = new Error(`Tùy chọn không hợp lệ cho kích thước này hoặc đã bị xóa. Vui lòng cập nhật giỏ hàng.`);
             e.status = 409;
             e.code = 'STALE_CART';
             throw e;
          }
          const extra = Number(rec.GiaThem);
          unitPrice += extra;
          optionCreates.push({ maTuyChon: t.maTuyChon, giaThem: extra });
        }
      }
      
      const lineTotalBeforePromo = unitPrice * qty;
      subtotalBeforePromo += lineTotalBeforePromo;
      
      // Kiểm tra khuyến mãi cho món ăn này
      let finalUnitPrice = unitPrice;
      let promoDiscount = 0;
      
      if (variant.MonAn?.MonAn_KhuyenMai && variant.MonAn.MonAn_KhuyenMai.length > 0) {
        const promo = variant.MonAn.MonAn_KhuyenMai[0];
        const km = promo.KhuyenMai;
        
        // Kiểm tra khuyến mãi còn hiệu lực
        if (km.TrangThai === 'Active' && 
            new Date(km.KMBatDau) <= now && 
            new Date(km.KMKetThuc) >= now) {
          
          if (km.KMLoai === 'PERCENT') {
            const discountPercent = Number(km.KMGiaTri) || 0;
            promoDiscount = Math.floor((unitPrice * discountPercent) / 100);
            finalUnitPrice = unitPrice - promoDiscount;
          } else if (km.KMLoai === 'AMOUNT') {
            promoDiscount = Number(km.KMGiaTri) || 0;
            finalUnitPrice = Math.max(0, unitPrice - promoDiscount);
          }
        }
      }
      
      const lineTotalAfterPromo = finalUnitPrice * qty;
      const lineTotalPromoDiscount = promoDiscount * qty;
      
      subtotal += lineTotalAfterPromo;
      totalPromoDiscount += lineTotalPromoDiscount;

      normalizedItems.push({
        loai: 'SP',
        maBienThe: variant.MaBienThe,
        maDeBanh: it.maDeBanh ?? null,
        soLuong: qty,
        donGia: finalUnitPrice, // Giá sau khuyến mãi
        thanhTien: lineTotalAfterPromo, // Thành tiền sau khuyến mãi
        tuyChon: optionCreates,
      });
    }
  }

  // 2) Validate voucher
  let discount = 0;
  if (payload.maVoucher) {
    const v = await repo.getVoucherForValidation(payload.maVoucher);
    if (!v) {
      const e = new Error('Voucher không tồn tại');
      e.status = 400;
      throw e;
    }
    if (String(v.TrangThai).toLowerCase() !== 'active') {
      const e = new Error('Voucher không còn hiệu lực');
      e.status = 400;
      throw e;
    }
    const now = new Date();
    if (v.NgayBatDau && new Date(v.NgayBatDau) > now) {
      const e = new Error('Voucher chưa đến thời gian áp dụng');
      e.status = 400;
      throw e;
    }
    if (v.NgayKetThuc && new Date(v.NgayKetThuc) < now) {
      const e = new Error('Voucher đã hết hạn');
      e.status = 400;
      throw e;
    }
    if (typeof v.SoLuong === 'number' && v._count?.DonHang >= v.SoLuong) {
      const e = new Error('Voucher đã hết số lượng');
      e.status = 400;
      throw e;
    }
    discount = calcDiscountAmount(v, subtotal);
    if (discount > subtotal) discount = subtotal;
  }

  // 3) Compute totals: subtotal đã là giá sau khuyến mãi
  const phiShip = phiShipFromQuote;
  const expectedTotal = subtotal - discount + phiShip;

  // 3.1) Validate frontend total matches backend calculation
  if (payload.tongTien !== undefined && payload.tongTien !== null) {
    const frontendTotal = toNumber(payload.tongTien);
    // Allow small floating point difference (0.01 VND tolerance)
    if (Math.abs(frontendTotal - expectedTotal) > 0.01) {
      console.error('Stale cart detected. Frontend total:', frontendTotal, 'Backend total:', expectedTotal);
      const e = new Error('Dữ liệu giỏ hàng đã thay đổi. Vui lòng cập nhật giỏ hàng.');
      e.status = 409; // Conflict - stale cart
      e.code = 'STALE_CART';
      throw e;
    }
  }

  // 4) Prepare create payload using server-calculated numbers
  // Validate payment method: accept only exact Vietnamese strings sent by frontend
  // Frontend must send either 'Tiền Mặt' or 'Chuyển Khoản' (trimmed). Anything else -> 400
  const rawPayment = (payload.payment && payload.payment.phuongThuc) || payload.phuongThuc;
  if (!rawPayment || typeof rawPayment !== 'string') {
    const e = new Error('Phương thức thanh toán không hợp lệ. Chỉ chấp nhận: Tiền Mặt hoặc Chuyển Khoản');
    e.status = 400;
    throw e;
  }
  const trimmedPayment = rawPayment.trim();
  const lower = trimmedPayment.toLowerCase();
  if (lower !== 'tiền mặt' && lower !== 'chuyển khoản') {
    const e = new Error('Phương thức thanh toán không hợp lệ. Chỉ chấp nhận: Tiền Mặt hoặc Chuyển Khoản');
    e.status = 400;
    throw e;
  }

  // Normalize stored Vietnamese value to canonical capitalization
  const storedPaymentValue = lower === 'tiền mặt' ? 'Tiền Mặt' : 'Chuyển Khoản';

  // Nếu Chuyển Khoản, không tạo payment ngay
  const skipPayment = storedPaymentValue === 'Chuyển Khoản';

  const createPayload = {
    ...payload,
    maCoSo: branch.MaCoSo,
    items: normalizedItems,
    tienTruocGiamGia: subtotal, // Giá sau khuyến mãi (trước voucher)
    tienGiamGia: discount,      // Giảm giá từ voucher
    tongTien: expectedTotal,
    phiShip,
    thoiGianGiaoDuKien: estimatedDeliveryTime,
    soNhaDuongGiaoHang: shippingAddress.soNhaDuong,
    phuongXaGiaoHang: shippingAddress.phuongXa,
    quanHuyenGiaoHang: shippingAddress.quanHuyen,
    thanhPhoGiaoHang: shippingAddress.thanhPho,
    payment: {
      phuongThuc: storedPaymentValue,
      soTien: expectedTotal,
      maGiaoDich: payload.payment?.maGiaoDich || null,
    },
    skipPaymentCreation: skipPayment,
  };

  const { MaDonHang } = await repo.createOrderWithDetails(createPayload);

  // Lấy danh sách quà tặng active và random chọn 1 quà tặng - chỉ cho đơn > 300k
  if (expectedTotal > 300000) {
    try {
      const activeGifts = await repo.findActiveGifts();
      if (activeGifts && activeGifts.length > 0) {
        const selectedGift = selectRandomGift(activeGifts);
        if (selectedGift) {
          // Tạo bản ghi DonHang_QuaTang
          await repo.createOrderGift({
            maDonHang: MaDonHang,
            maQuaTang: selectedGift.MaQuaTang,
            soLuong: 1,
          });
          console.log(`Đã tặng quà "${selectedGift.TenQuaTang}" (${selectedGift.CapDo}) cho đơn hàng ${MaDonHang} (tổng tiền: ${expectedTotal})`);
        }
      }
    } catch (giftErr) {
      // Không throw lỗi nếu việc tặng quà thất bại, chỉ log để không làm gián đoạn đơn hàng
      console.error('Lỗi khi tặng quà cho đơn hàng:', giftErr);
    }
  } else {
    console.log(`Đơn hàng ${MaDonHang} không đủ điều kiện tặng quà (tổng tiền: ${expectedTotal}, yêu cầu: > 300,000)`);
  }

  invalidateOrderCaches({
    orderId: MaDonHang,
    userId: payload.maNguoiDung || payload.MaNguoiDung || null,
    voucherCode: payload.maVoucher || payload.MaVoucher || null,
  });

  const createdOrder = await repo.findOrderByIdDetailed(Number(MaDonHang));
  emitOrderChangedSafe(createdOrder, {
    type: 'created',
    meta: {
      paymentMethod: createPayload.payment?.phuongThuc || null,
    },
  });

  // Determine behavior based on stored Vietnamese payment method ('Tiền Mặt' or 'Chuyển Khoản')
  // We store the canonical capitalized form ('Tiền Mặt' / 'Chuyển Khoản'), so compare against that.
  const storedPhuongThuc = String(createPayload.payment?.phuongThuc || '').trim();

  if (storedPhuongThuc === 'Tiền Mặt') {
    return {
      orderId: MaDonHang,
      total: expectedTotal,
      discount,
      subtotal,
      phiShip,
      branch,
      distanceKm: shippingQuote.distanceKm,
      etaMinutes,
      next: 'Tiền Mặt',
    };
  }

  if (storedPhuongThuc === 'Chuyển Khoản') {
    let paymentData;
    try {
      paymentData = createPaymentUrl({
        amount: expectedTotal,
        orderId: MaDonHang,
        orderInfo: payload.payment?.orderInfo,
        bankCode: payload.payment?.bankCode,
        locale: payload.payment?.locale,
        orderType: payload.payment?.orderType,
        returnUrl: payload.payment?.returnUrl,
        ipAddr: payload.payment?.ipAddress || payload.clientIp || payload.ipAddr,
        txnRef: payload.payment?.txnRef,
        expireMinutes: payload.payment?.expireMinutes
      });
    } catch (err) {
      console.error('Error creating VNPay payment URL:', err);
      const e = new Error('Không tạo được liên kết thanh toán VNPay');
      e.status = 500;
      throw e;
    }

    return {
      orderId: MaDonHang,
      total: expectedTotal,
      discount,
      subtotal,
      phiShip,
      branch,
      distanceKm: shippingQuote.distanceKm,
      etaMinutes,
      next: 'Chuyển Khoản',
      paymentUrl: paymentData.url,
      paymentGateway: 'VNPay',
      paymentTxnRef: paymentData.params.vnp_TxnRef,
      paymentExpireAt: paymentData.params.vnp_ExpireDate,
    };
  }

  // Fallback - should not happen because we validated earlier, but return generic response
  return {
    orderId: MaDonHang,
    total: expectedTotal,
    discount,
    subtotal,
    phiShip,
    branch,
    distanceKm: shippingQuote.distanceKm,
    etaMinutes,
    next: 'UNKNOWN',
  };
}

async function rateOrder(payload) {
  if (!payload) {
    const e = new Error('Thiếu dữ liệu đánh giá');
    e.status = 400;
    throw e;
  }

  const { MaDonHang, MaNguoiDung, SoSao, BinhLuan } = payload;

  // Validate required fields
  if (!MaDonHang) {
    const e = new Error('Thiếu mã đơn hàng');
    e.status = 400;
    throw e;
  }

  if (!SoSao) {
    const e = new Error('Thiếu số sao đánh giá');
    e.status = 400;
    throw e;
  }

  // Validate SoSao range (1-5)
  const soSaoNum = Number(SoSao);
  if (!Number.isInteger(soSaoNum) || soSaoNum < 1 || soSaoNum > 5) {
    const e = new Error('Số sao phải là số nguyên từ 1 đến 5');
    e.status = 400;
    throw e;
  }

  // Check if order exists
  const order = await repo.findOrderByIdDetailed(Number(MaDonHang));
  if (!order) {
    const e = new Error('Không tìm thấy đơn hàng');
    e.status = 404;
    throw e;
  }

  // Check if user is the order owner (if MaNguoiDung is provided)
  if (MaNguoiDung && order.MaNguoiDung !== Number(MaNguoiDung)) {
    const e = new Error('Bạn không có quyền đánh giá đơn hàng này');
    e.status = 403;
    throw e;
  }

  // Check if order is completed/delivered
  const hasDeliveredStatus = order.LichSuTrangThaiDonHang?.some(
    (status) => status.TrangThai === 'Đã giao'
  );

  if (!hasDeliveredStatus) {
    const e = new Error('Chỉ có thể đánh giá đơn hàng đã được giao');
    e.status = 400;
    throw e;
  }

  // Check if order already has a review
  const existingReview = await repo.findOrderReview(Number(MaDonHang));
  if (existingReview) {
    const e = new Error('Đơn hàng này đã được đánh giá rồi');
    e.status = 400;
    throw e;
  }

  // Create the review
  const newReview = await repo.createOrderReview({
    maDonHang: Number(MaDonHang),
    soSao: soSaoNum,
    binhLuan: BinhLuan || null,
  });

  // Trigger AI Analysis asynchronously (fire and forget, or await if critical)
  // Here we await it to ensure data consistency, but wrap in try-catch so it doesn't fail the review creation
  try {
    const analysis = await aiReviewService.analyzeReview(soSaoNum, BinhLuan);
    if (analysis) {
      await repo.createReviewAnalysis({
        maDanhGiaDonHang: newReview.MaDanhGiaDonHang,
        sentiment: analysis.Sentiment,
        severity: analysis.Severity,
        foodIssue: analysis.FoodIssue,
        driverIssue: analysis.DriverIssue,
        storeIssue: analysis.StoreIssue,
        otherIssue: analysis.OtherIssue,
        mentionLate: analysis.MentionLate,
        rawJSON: analysis
      });
    }
  } catch (aiError) {
    console.error('Error saving AI analysis:', aiError);
    // Do not throw error here, let the review creation succeed
  }

  invalidateOrderCaches({
    orderId: MaDonHang,
    userId: order?.MaNguoiDung || null,
    voucherCode: order?.MaVoucher || null,
  });

  return newReview;
}

async function getOrderReview(maDonHang) {
  if (!maDonHang) {
    const e = new Error('Thiếu mã đơn hàng');
    e.status = 400;
    throw e;
  }
  return repo.findOrderReview(Number(maDonHang));
}

// Update order status with business validations
async function updateOrderStatus(maDonHang, newStatus, maNguoiThucHien = null, ghiChu = null) {
  if (!maDonHang) {
    const e = new Error('Thiếu mã đơn hàng');
    e.status = 400;
    throw e;
  }
  if (!newStatus || typeof newStatus !== 'string') {
    const e = new Error('Thiếu trạng thái mới hợp lệ');
    e.status = 400;
    throw e;
  }

  // Load detailed order to inspect payment and timeline
  const order = await repo.findOrderByIdDetailed(Number(maDonHang));
  if (!order) {
    const e = new Error('Không tìm thấy đơn hàng');
    e.status = 404;
    throw e;
  }

  // Determine latest timeline status
  const latest = Array.isArray(order.LichSuTrangThaiDonHang) && order.LichSuTrangThaiDonHang.length > 0
    ? order.LichSuTrangThaiDonHang[0].TrangThai
    : null;

  // If current timeline is 'Chờ thanh toán', block update
  if (String(latest || '').trim() === 'Chờ thanh toán') {
    const e = new Error('Đơn hàng ở trạng thái Chờ thanh toán, không thể cập nhật trạng thái');
    e.status = 400;
    throw e;
  }

  // Enforce forward-only transitions
  const normalizedLatest = String(latest || '').trim();
  const target = String(newStatus).trim();

  // Define allowed previous statuses for specific targets
  const mustBePrev = {
    'Đang xử lý': ['Đang chờ xác nhận'],
    'Chờ giao hàng': ['Đang xử lý'],
    'Đang giao': ['Chờ giao hàng'],
    'Đã giao': ['Đang giao'],
  };

  if (mustBePrev[target]) {
    if (!mustBePrev[target].includes(normalizedLatest)) {
      const e = new Error(`Không thể chuyển sang '${target}' từ trạng thái hiện tại '${normalizedLatest || 'UNKNOWN'}'`);
      e.status = 400;
      throw e;
    }
  }

  // Disallow cancelling a delivered order
  if (target === 'Đã hủy' && normalizedLatest === 'Đã giao') {
    const e = new Error('Không thể hủy đơn hàng đã giao');
    e.status = 400;
    throw e;
  }

  // All validations passed - append timeline entry
  await repo.appendOrderStatus(Number(maDonHang), {
    TrangThai: target,
    GhiChu: ghiChu || null,
    MaNguoiThucHien: maNguoiThucHien || null,
  });

  // Return updated order
  const updated = await repo.findOrderByIdDetailed(Number(maDonHang));
  let issuedVoucherCode = null;

  // Check for late delivery and issue voucher
  if (target === 'Đã giao' && updated.ThoiGianGiaoDuKien) {
    const deliveredTime = new Date();
    const expectedTime = new Date(updated.ThoiGianGiaoDuKien);
    
    // If delivered after expected time
    if (deliveredTime > expectedTime) {
      try {
        const user = updated.NguoiDung_DonHang_MaNguoiDungToNguoiDung;
        // Check if user exists and has email
        if (user && user.Email) {
           // Generate voucher
           const voucherCode = `SORRY${updated.MaDonHang}T${Math.floor(Math.random() * 1000)}`;
           const expiryDate = new Date();
           expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry

           await voucherRepo.createVoucher({
             code: voucherCode,
             MoTa: `Voucher xin lỗi giao hàng trễ đơn #${updated.MaDonHang}`,
             LoaiGiamGia: 'AMOUNT',
             GiaTri: 20000, // 20k VND
             DieuKienApDung: 0,
             NgayBatDau: new Date(),
             NgayKetThuc: expiryDate,
             SoLuong: 1,
             TrangThai: 'Active'
           });
           issuedVoucherCode = voucherCode;

           // Send email
           await emailService.sendLateDeliveryApologyEmail({
             to: user.Email,
             recipientName: user.HoTen,
             orderId: updated.MaDonHang,
             voucherCode: voucherCode,
             voucherValue: '20,000đ',
             expiryDate: expiryDate.toLocaleDateString('vi-VN')
           });
           
           console.log(`Issued apology voucher ${voucherCode} for late order ${updated.MaDonHang}`);
        }
      } catch (err) {
        console.error('Error issuing apology voucher:', err);
        // Don't fail the status update
      }
    }
  }

  // If we moved to 'Đã giao', and the latest payment for the order is cash ('Tiền Mặt'),
  // mark that payment as paid ('Đã thanh toán').
  let finalUpdated = updated;

  try {
    if (target === 'Đã giao' && Array.isArray(updated?.ThanhToan) && updated.ThanhToan.length > 0) {
      // Determine latest payment by ThoiGian (fallback to MaThanhToan)
      const latestPayment = [...updated.ThanhToan].sort((a, b) => {
        const ta = a.ThoiGian ? new Date(a.ThoiGian).getTime() : 0;
        const tb = b.ThoiGian ? new Date(b.ThoiGian).getTime() : 0;
        if (ta === tb) return (b.MaThanhToan || 0) - (a.MaThanhToan || 0);
        return tb - ta;
      })[0];

      // Normalize to lowercase and compare strictly to the allowed value 'tiền mặt'.
      // System only supports two methods: 'Tiền Mặt' and 'Chuyển Khoản'.
      const phuongThuc = String(latestPayment?.PhuongThuc || '').trim().toLowerCase();
      if (phuongThuc === 'tiền mặt') {
        // Update that payment record to 'Đã thanh toán'
        await repo.updatePaymentById(latestPayment.MaThanhToan, { trangThai: 'Đã thanh toán' });
        // Refresh updated order to include modified payment status
        finalUpdated = await repo.findOrderByIdDetailed(Number(maDonHang));
      }
    }
  } catch (err) {
    // Don't block the status update if marking payment fails; log and continue returning updated order
    console.error('Failed to auto-mark cash payment as paid for order', maDonHang, err);
  }

  invalidateOrderCaches({
    orderId: maDonHang,
    userId: finalUpdated?.MaNguoiDung || updated?.MaNguoiDung || order?.MaNguoiDung || null,
    voucherCode: issuedVoucherCode || finalUpdated?.MaVoucher || updated?.MaVoucher || null,
    includeSales: target === 'Đã giao',
  });

  emitOrderChangedSafe(finalUpdated, {
    type: 'status_updated',
    meta: {
      status: target,
      maNguoiThucHien: maNguoiThucHien || null,
    },
  });

  return finalUpdated;
}

async function assignShipperToOrder(maDonHang, maNguoiDungGiaoHang) {
  if (!maDonHang || !maNguoiDungGiaoHang) {
    const e = new Error('Thiếu mã đơn hàng hoặc mã người giao hàng');
    e.status = 400;
    throw e;
  }

  // Check if order exists
  const order = await repo.findOrderByIdDetailed(maDonHang);
  if (!order) {
    const e = new Error('Đơn hàng không tồn tại');
    e.status = 404;
    throw e;
  }

  // Check if order is in "Chờ giao hàng" status
  const h = order.LichSuTrangThaiDonHang;
  const sortedHist = [...h].sort((a, b) => new Date(a.ThoiGianCapNhat) - new Date(b.ThoiGianCapNhat));
  const latestStatus = sortedHist[sortedHist.length - 1]?.TrangThai;

  if (latestStatus !== 'Chờ giao hàng') {
    const e = new Error('Chỉ có thể nhận đơn hàng ở trạng thái "Chờ giao hàng"');
    e.status = 400;
    throw e;
  }

  // Check if order already has a shipper
  if (order.MaNguoiDungGiaoHang) {
    const e = new Error('Đơn hàng đã được nhận bởi shipper khác');
    e.status = 400;
    throw e;
  }

  // Assign shipper
  const updated = await repo.assignShipperToOrder(maDonHang, maNguoiDungGiaoHang);
  invalidateOrderCaches({
    orderId: maDonHang,
    userId: order?.MaNguoiDung || null,
    voucherCode: order?.MaVoucher || null,
  });

  const detailedOrder = await repo.findOrderByIdDetailed(Number(maDonHang));
  emitOrderChangedSafe(detailedOrder || updated, {
    type: 'shipper_assigned',
    meta: {
      maNguoiDungGiaoHang: Number(maNguoiDungGiaoHang),
    },
  });

  return updated;
}

module.exports = {
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  getOrdersByBranchId,
  getOrdersByPhone,
  getAllOrderReviews,
  createOrder,
  cancelOrder,
  cancelOrderByStaff,
  rateOrder,
  getOrderReview,
  updateOrderStatus,
  assignShipperToOrder,
};

