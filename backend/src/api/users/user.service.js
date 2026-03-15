const repo = require('./user.repository');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

function normalizeAccountIds(...sources) {
  const flattened = [];

  for (const source of sources) {
    if (source === null || source === undefined) {
      continue;
    }

    if (Array.isArray(source)) {
      flattened.push(...source);
      continue;
    }

    flattened.push(source);
  }

  return [...new Set(
    flattened
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
}

function extractAccountIdsFromUser(user) {
  if (!user || !Array.isArray(user.TaiKhoan)) {
    return [];
  }

  return normalizeAccountIds(
    user.TaiKhoan.map((account) => account?.MaTaiKhoan)
  );
}

function invalidateUserCaches({ maNguoiDung = null, maTaiKhoan = null, maTaiKhoanList = [] } = {}) {
  const tags = [cacheTags.USER_PROFILE, cacheTags.AUTH_ME];

  if (maNguoiDung) {
    tags.push(buildCacheKey(cacheTags.USER_PROFILE, Number(maNguoiDung)));
  }

  const accountIds = normalizeAccountIds(maTaiKhoan, maTaiKhoanList);
  for (const accountId of accountIds) {
    tags.push(buildCacheKey(cacheTags.AUTH_ME, accountId));
  }

  apiCache.deleteByTags(tags);
}

async function getUserProfile(maNguoiDung) {
  if (!maNguoiDung) {
    const e = new Error('Thiếu MaNguoiDung');
    e.status = 400;
    throw e;
  }

  const normalizedUserId = Number(maNguoiDung);
  const cacheKey = buildCacheKey('users', 'profile', normalizedUserId);
  const profileTag = buildCacheKey(cacheTags.USER_PROFILE, normalizedUserId);

  return apiCache.getOrSet(
    cacheKey,
    async () => {
      const user = await repo.findUserById(maNguoiDung);
      if (!user) {
        const e = new Error('Không tìm thấy người dùng');
        e.status = 404;
        throw e;
      }

      return user;
    },
    {
      ttlMs: cacheTtls.USER_PROFILE,
      tags: [cacheTags.USER_PROFILE, profileTag],
    }
  );
}

async function updateUserProfile(payload) {
  if (!payload) {
    const e = new Error('Thiếu dữ liệu cập nhật');
    e.status = 400;
    throw e;
  }

  const { MaNguoiDung, HoTen, SoDienThoai, SoNhaDuong, PhuongXa, QuanHuyen, ThanhPho } = payload;

  // Validate required fields
  if (!MaNguoiDung) {
    const e = new Error('Thiếu MaNguoiDung');
    e.status = 400;
    throw e;
  }

  if (!HoTen || String(HoTen).trim() === '') {
    const e = new Error('Họ tên không được để trống');
    e.status = 400;
    throw e;
  }

  if (!SoDienThoai || String(SoDienThoai).trim() === '') {
    const e = new Error('Số điện thoại không được để trống');
    e.status = 400;
    throw e;
  }

  // Validate phone format (basic Vietnamese phone number)
  const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
  if (!phoneRegex.test(String(SoDienThoai).trim())) {
    const e = new Error('Số điện thoại không hợp lệ');
    e.status = 400;
    throw e;
  }

  // Check if user exists
  const existingUser = await repo.findUserById(MaNguoiDung);
  if (!existingUser) {
    const e = new Error('Không tìm thấy người dùng');
    e.status = 404;
    throw e;
  }

  // Check if phone number is already used by another user
  if (SoDienThoai !== existingUser.SoDienThoai) {
    const phoneExists = await repo.checkPhoneExists(SoDienThoai, MaNguoiDung);
    if (phoneExists) {
      const e = new Error('Số điện thoại đã được sử dụng bởi tài khoản khác');
      e.status = 400;
      throw e;
    }
  }

  const updated = await repo.updateUser(MaNguoiDung, {
    hoTen: String(HoTen).trim(),
    soDienThoai: String(SoDienThoai).trim(),
    soNhaDuong: SoNhaDuong ? String(SoNhaDuong).trim() : null,
    phuongXa: PhuongXa ? String(PhuongXa).trim() : null,
    quanHuyen: QuanHuyen ? String(QuanHuyen).trim() : null,
    thanhPho: ThanhPho ? String(ThanhPho).trim() : null,
  });

  const accountIds = normalizeAccountIds(
    extractAccountIdsFromUser(existingUser),
    extractAccountIdsFromUser(updated)
  );

  invalidateUserCaches({
    maNguoiDung: MaNguoiDung,
    maTaiKhoanList: accountIds,
  });

  return updated;
}

async function getAllAccounts() {
  return repo.getAllAccounts();
}

async function blockUser(MaNguoiDung) {
  if (!MaNguoiDung) {
    const e = new Error('Thiếu MaNguoiDung');
    e.status = 400;
    throw e;
  }

  const updated = await repo.updateAccountStatusByUser(MaNguoiDung, 'Block');
  if (!updated) {
    const e = new Error('Không tìm thấy người dùng hoặc tài khoản');
    e.status = 404;
    throw e;
  }

  invalidateUserCaches({
    maNguoiDung: MaNguoiDung,
    maTaiKhoanList: updated?.MaTaiKhoanList || [],
  });

  return updated;
}

async function unblockUser(MaNguoiDung) {
  if (!MaNguoiDung) {
    const e = new Error('Thiếu MaNguoiDung');
    e.status = 400;
    throw e;
  }

  const updated = await repo.updateAccountStatusByUser(MaNguoiDung, 'Active');
  if (!updated) {
    const e = new Error('Không tìm thấy người dùng hoặc tài khoản');
    e.status = 404;
    throw e;
  }

  invalidateUserCaches({
    maNguoiDung: MaNguoiDung,
    maTaiKhoanList: updated?.MaTaiKhoanList || [],
  });

  return updated;
}

async function updateUserRole(MaNguoiDung, Role) {
  if (!MaNguoiDung) {
    const e = new Error('Thiếu MaNguoiDung');
    e.status = 400;
    throw e;
  }

  if (!Role) {
    const e = new Error('Thiếu Role');
    e.status = 400;
    throw e;
  }

  // Validate role
  const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SHIPPER', 'CUSTOMER'];
  const normalizedRole = String(Role).toUpperCase();
  if (!validRoles.includes(normalizedRole)) {
    const e = new Error('Vai trò không hợp lệ. Chỉ chấp nhận: SUPER_ADMIN, ADMIN, SHIPPER, CUSTOMER');
    e.status = 400;
    throw e;
  }

  const userBeforeUpdate = await repo.findUserById(MaNguoiDung);
  const updated = await repo.updateUserRole(MaNguoiDung, normalizedRole);
  if (!updated) {
    const e = new Error('Không tìm thấy người dùng');
    e.status = 404;
    throw e;
  }

  invalidateUserCaches({
    maNguoiDung: MaNguoiDung,
    maTaiKhoanList: extractAccountIdsFromUser(userBeforeUpdate),
  });

  return updated;
}

async function createUser(payload) {
  const { Email, MatKhau, HoTen, SoDienThoai, Role, MaCoSo } = payload;

  // Validate required fields
  if (!Email || String(Email).trim() === '') {
    const e = new Error('Email không được để trống');
    e.status = 400;
    throw e;
  }

  if (!MatKhau || String(MatKhau).trim() === '') {
    const e = new Error('Mật khẩu không được để trống');
    e.status = 400;
    throw e;
  }

  if (!HoTen || String(HoTen).trim() === '') {
    const e = new Error('Họ tên không được để trống');
    e.status = 400;
    throw e;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(Email).trim())) {
    const e = new Error('Email không hợp lệ');
    e.status = 400;
    throw e;
  }

  // Check if email already exists
  const emailExists = await repo.checkEmailExists(String(Email).trim());
  if (emailExists) {
    const e = new Error('Email đã được sử dụng');
    e.status = 409;
    throw e;
  }

  // Validate phone if provided
  if (SoDienThoai) {
    const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
    if (!phoneRegex.test(String(SoDienThoai).trim())) {
      const e = new Error('Số điện thoại không hợp lệ');
      e.status = 400;
      throw e;
    }
    
    // Check if phone already exists
    const phoneExists = await repo.checkPhoneExists(String(SoDienThoai).trim());
    if (phoneExists) {
      const e = new Error('Số điện thoại đã được sử dụng');
      e.status = 409;
      throw e;
    }
  }

  // Hash password
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash(String(MatKhau), 10);

  // Validate and normalize role
  const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SHIPPER', 'CUSTOMER'];
  const normalizedRole = String(Role || 'CUSTOMER').toUpperCase();
  if (!validRoles.includes(normalizedRole)) {
    const e = new Error('Vai trò không hợp lệ. Chỉ chấp nhận: SUPER_ADMIN, ADMIN, SHIPPER, CUSTOMER');
    e.status = 400;
    throw e;
  }

  // Validate MaCoSo for ADMIN and SHIPPER
  if (normalizedRole === 'ADMIN' || normalizedRole === 'SHIPPER') {
    if (!MaCoSo) {
      const e = new Error('Cơ sở là bắt buộc cho Quản trị viên và Shipper');
      e.status = 400;
      throw e;
    }
    // Verify branch exists
    const branchExists = await repo.checkBranchExists(Number(MaCoSo));
    if (!branchExists) {
      const e = new Error('Cơ sở không tồn tại');
      e.status = 404;
      throw e;
    }
  }

  // Create user
  const newUser = await repo.createUser({
    email: String(Email).trim(),
    matKhau: hashedPassword,
    hoTen: String(HoTen).trim(),
    soDienThoai: SoDienThoai ? String(SoDienThoai).trim() : null,
    role: normalizedRole,
    maCoSo: (normalizedRole === 'ADMIN' || normalizedRole === 'SHIPPER') && MaCoSo ? Number(MaCoSo) : null,
  });

  return newUser;
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  getAllAccounts,
  blockUser,
  unblockUser,
  createUser,
  updateUserRole,
};
