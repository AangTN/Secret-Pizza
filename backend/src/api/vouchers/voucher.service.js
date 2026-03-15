const repository = require('./voucher.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function normalizeVoucherCode(code) {
  return String(code || '').trim().toUpperCase();
}

function invalidateVoucherCaches(code = null) {
  const tags = [cacheTags.VOUCHER_LIST, cacheTags.VOUCHER_BY_CODE];

  if (code) {
    tags.push(buildCacheKey(cacheTags.VOUCHER_BY_CODE, normalizeVoucherCode(code)));
  }

  apiCache.deleteByTags(tags);
}

function mapVoucherRow(v) {
  return {
    code: v.MaVoucher,
    MoTa: v.MoTa,
    LoaiGiamGia: v.LoaiGiamGia,
    GiaTri: v.GiaTri,
    DieuKienApDung: v.DieuKienApDung,
    NgayBatDau: v.NgayBatDau || null,
    NgayKetThuc: v.NgayKetThuc || null,
    SoLuong: v.SoLuong || null,
    TrangThai: v.TrangThai || null,
    usedCount: (v._count && typeof v._count.DonHang === 'number') ? v._count.DonHang : 0,
  };
}

async function getAllVouchers() {
  const cacheKey = buildCacheKey('vouchers', 'list');
  return apiCache.getOrSet(
    cacheKey,
    async () => {
      const rows = await repository.findAllVouchers();
      return rows.map(mapVoucherRow);
    },
    {
      ttlMs: cacheTtls.VOUCHER_LIST,
      tags: [cacheTags.VOUCHER_LIST],
    }
  );
}

async function getVoucherByCode(code) {
  if (!code) return null;
  const normalizedCode = normalizeVoucherCode(code);
  const cacheKey = buildCacheKey('vouchers', 'code', normalizedCode);
  const codeTag = buildCacheKey(cacheTags.VOUCHER_BY_CODE, normalizedCode);

  return apiCache.getOrSet(
    cacheKey,
    async () => {
      const v = await repository.findVoucherByCode(normalizedCode);
      if (!v) return null;
      return mapVoucherRow(v);
    },
    {
      ttlMs: cacheTtls.VOUCHER_DETAIL,
      tags: [cacheTags.VOUCHER_BY_CODE, codeTag],
      cacheNull: true,
    }
  );
}

async function createVoucher(payload) {
  if (!payload.code || !payload.code.trim()) {
    const e = new Error('Mã voucher là bắt buộc');
    e.status = 400;
    throw e;
  }
  if (!payload.MoTa || !payload.MoTa.trim()) {
    const e = new Error('Mô tả là bắt buộc');
    e.status = 400;
    throw e;
  }
  if (!payload.GiaTri || Number(payload.GiaTri) <= 0) {
    const e = new Error('Giá trị giảm phải lớn hơn 0');
    e.status = 400;
    throw e;
  }

  // Validate percentage must be between 0-100
  if (payload.LoaiGiamGia === 'PERCENT') {
    const giaTri = Number(payload.GiaTri);
    if (giaTri > 100) {
      const e = new Error('Phần trăm giảm phải từ 0-100');
      e.status = 400;
      throw e;
    }
  }

  // Validate amount max 100 million
  if (payload.LoaiGiamGia === 'AMOUNT') {
    const giaTri = Number(payload.GiaTri);
    if (giaTri > 100000000) {
      const e = new Error('Số tiền giảm tối đa 100 triệu');
      e.status = 400;
      throw e;
    }
  }

  if (!payload.SoLuong || Number(payload.SoLuong) <= 0) {
    const e = new Error('Số lượng phải lớn hơn 0');
    e.status = 400;
    throw e;
  }

  // Check if voucher code already exists
  const existing = await repository.findVoucherByCode(payload.code);
  if (existing) {
    const e = new Error('Mã voucher đã tồn tại');
    e.status = 400;
    throw e;
  }

  // Validate: end date must be after start date
  if (payload.NgayBatDau && payload.NgayKetThuc) {
    const startDate = new Date(payload.NgayBatDau);
    const endDate = new Date(payload.NgayKetThuc);
    if (endDate <= startDate) {
      const e = new Error('Ngày kết thúc phải sau ngày bắt đầu');
      e.status = 400;
      throw e;
    }
  }

  const created = await repository.createVoucher(payload);
  invalidateVoucherCaches(created?.MaVoucher || payload.code);
  return mapVoucherRow(created);
}

async function updateVoucher(code, payload) {
  if (!code) {
    const e = new Error('Thiếu mã voucher');
    e.status = 400;
    throw e;
  }
  if (!payload.MoTa || !payload.MoTa.trim()) {
    const e = new Error('Mô tả là bắt buộc');
    e.status = 400;
    throw e;
  }
  if (!payload.GiaTri || Number(payload.GiaTri) <= 0) {
    const e = new Error('Giá trị giảm phải lớn hơn 0');
    e.status = 400;
    throw e;
  }

  // Validate percentage must be between 0-100
  if (payload.LoaiGiamGia === 'PERCENT') {
    const giaTri = Number(payload.GiaTri);
    if (giaTri > 100) {
      const e = new Error('Phần trăm giảm phải từ 0-100');
      e.status = 400;
      throw e;
    }
  }

  // Validate amount max 100 million
  if (payload.LoaiGiamGia === 'AMOUNT') {
    const giaTri = Number(payload.GiaTri);
    if (giaTri > 100000000) {
      const e = new Error('Số tiền giảm tối đa 100 triệu');
      e.status = 400;
      throw e;
    }
  }

  if (!payload.SoLuong || Number(payload.SoLuong) <= 0) {
    const e = new Error('Số lượng phải lớn hơn 0');
    e.status = 400;
    throw e;
  }

  const existing = await repository.findVoucherByCode(code);
  if (!existing) {
    const e = new Error('Voucher không tồn tại');
    e.status = 404;
    throw e;
  }

  // Validate: end date must be after start date
  if (payload.NgayBatDau && payload.NgayKetThuc) {
    const startDate = new Date(payload.NgayBatDau);
    const endDate = new Date(payload.NgayKetThuc);
    if (endDate <= startDate) {
      const e = new Error('Ngày kết thúc phải sau ngày bắt đầu');
      e.status = 400;
      throw e;
    }
  }

  const updated = await repository.updateVoucher(code, payload);
  invalidateVoucherCaches(code);
  return mapVoucherRow(updated);
}

async function toggleVoucherStatus(code, newStatus) {
  if (!code) {
    const e = new Error('Thiếu mã voucher');
    e.status = 400;
    throw e;
  }
  if (!newStatus || !['Active', 'Inactive'].includes(newStatus)) {
    const e = new Error('Trạng thái không hợp lệ');
    e.status = 400;
    throw e;
  }

  const existing = await repository.findVoucherByCode(code);
  if (!existing) {
    const e = new Error('Voucher không tồn tại');
    e.status = 404;
    throw e;
  }

  const updated = await repository.updateVoucherStatus(code, newStatus);
  invalidateVoucherCaches(code);
  return mapVoucherRow(updated);
}

async function giftVoucherToUsers(voucherCode, userIds, message) {
  const emailService = require('../../services/emailService');
  
  // Validate inputs
  if (!voucherCode || !voucherCode.trim()) {
    const e = new Error('Mã voucher là bắt buộc');
    e.status = 400;
    throw e;
  }
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    const e = new Error('Danh sách người nhận không hợp lệ');
    e.status = 400;
    throw e;
  }

  // Get voucher details
  const voucher = await repository.findVoucherByCode(voucherCode);
  if (!voucher) {
    const e = new Error('Voucher không tồn tại');
    e.status = 404;
    throw e;
  }

  // Validate voucher is active and valid
  if (voucher.TrangThai !== 'Active') {
    const e = new Error('Voucher không ở trạng thái hoạt động');
    e.status = 400;
    throw e;
  }

  const now = new Date();
  const startDate = voucher.NgayBatDau ? new Date(voucher.NgayBatDau) : null;
  const endDate = voucher.NgayKetThuc ? new Date(voucher.NgayKetThuc) : null;

  if (startDate && now < startDate) {
    const e = new Error('Voucher chưa bắt đầu');
    e.status = 400;
    throw e;
  }

  if (endDate && now > endDate) {
    const e = new Error('Voucher đã hết hạn');
    e.status = 400;
    throw e;
  }

  const usedCount = (voucher._count && typeof voucher._count.DonHang === 'number') ? voucher._count.DonHang : 0;
  const remaining = (voucher.SoLuong || 0) - usedCount;
  
  if (remaining <= 0) {
    const e = new Error('Voucher đã hết số lượng');
    e.status = 400;
    throw e;
  }

  if (userIds.length > remaining) {
    const e = new Error(`Chỉ còn ${remaining} voucher, không thể tặng cho ${userIds.length} người`);
    e.status = 400;
    throw e;
  }

  // Get user details
  const users = await repository.findUsersByIds(userIds);
  if (users.length === 0) {
    const e = new Error('Không tìm thấy người dùng nào');
    e.status = 404;
    throw e;
  }

  // Format discount
  let discount;
  if (voucher.LoaiGiamGia === 'PERCENT') {
    discount = `${voucher.GiaTri}%`;
  } else {
    discount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.GiaTri);
  }

  // Format min order
  const minOrder = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.DieuKienApDung || 0);

  // Format expiry date
  const expiryDate = voucher.NgayKetThuc 
    ? new Date(voucher.NgayKetThuc).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Không giới hạn';

  // Send emails
  const results = [];
  for (const user of users) {
    try {
      const userEmail = user.NguoiDung?.Email;
      if (!userEmail) {
        results.push({ userId: user.MaTaiKhoan, success: false, error: 'Không có email' });
        continue;
      }

      await emailService.sendVoucherGiftEmail({
        to: userEmail,
        recipientName: user.NguoiDung?.HoTen || userEmail,
        voucherCode: voucher.MaVoucher,
        voucherDescription: voucher.MoTa,
        discount,
        minOrder,
        expiryDate,
        message: message || 'Chúc bạn có trải nghiệm tuyệt vời tại Secret Pizza!'
      });

      results.push({ userId: user.MaTaiKhoan, email: userEmail, success: true });
    } catch (error) {
      console.error(`Failed to send email to user ${user.MaTaiKhoan}:`, error);
      results.push({ userId: user.MaTaiKhoan, email: userEmail, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return {
    success: true,
    totalSent: successCount,
    totalFailed: failCount,
    details: results
  };
}

module.exports = { 
  getAllVouchers, 
  getVoucherByCode, 
  createVoucher, 
  updateVoucher, 
  toggleVoucherStatus,
  giftVoucherToUsers 
};
