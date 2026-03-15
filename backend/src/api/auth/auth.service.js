const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../../client');
const { normalizeAuthScope, getJwtSecretByScope } = require('../../config/jwtSecrets');
const repo = require('./auth.repository');
const emailService = require('../../services/emailService');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_ROTATE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL_VERIFY_SECRET =
  process.env.EMAIL_VERIFY_JWT_SECRET ||
  process.env.JWT_SECRET ||
  'secret-pizza-email-verify-change-this-secret';
const EMAIL_VERIFY_EXPIRES_IN = process.env.EMAIL_VERIFY_TOKEN_EXPIRES || '30m';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'postmessage';

let googleOAuthClient = null;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getAccountProvider(account) {
  return String(account?.Provider || 'local').toLowerCase();
}

function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function ensureGoogleOauthConfig() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    const e = new Error(
      'Thiếu cấu hình Google OAuth trên backend. Cần GOOGLE_CLIENT_ID/CLIENT_ID và GOOGLE_CLIENT_SECRET/CLIENT_SECRET.'
    );
    e.status = 500;
    throw e;
  }
}

function getGoogleOAuthClient() {
  ensureGoogleOauthConfig();

  if (!googleOAuthClient) {
    googleOAuthClient = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_OAUTH_REDIRECT_URI
    );
  }

  return googleOAuthClient;
}

async function verifyGoogleIdentityFromCode(code) {
  const oauthClient = getGoogleOAuthClient();

  let tokens;
  try {
    const tokenResponse = await oauthClient.getToken({
      code: String(code || ''),
      redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
    });
    tokens = tokenResponse?.tokens || {};
  } catch (err) {
    const e = new Error('Mã đăng nhập Google không hợp lệ hoặc đã hết hạn.');
    e.status = 401;
    throw e;
  }

  if (!tokens.id_token) {
    const e = new Error('Google không trả về token định danh hợp lệ.');
    e.status = 401;
    throw e;
  }

  let payload;
  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    const e = new Error('Không thể xác thực danh tính Google.');
    e.status = 401;
    throw e;
  }

  const providerId = String(payload?.sub || '').trim();
  const email = normalizeEmail(payload?.email);

  if (!providerId || !email) {
    const e = new Error('Thiếu thông tin tài khoản Google (email hoặc định danh).');
    e.status = 401;
    throw e;
  }

  if (payload?.email_verified !== true) {
    const e = new Error('Email Google chưa được xác thực.');
    e.status = 403;
    throw e;
  }

  if (!isValidEmail(email)) {
    const e = new Error('Email trả về từ Google không hợp lệ.');
    e.status = 400;
    throw e;
  }

  return {
    providerId,
    email,
    hoTen: String(payload?.name || '').trim() || String(email).split('@')[0],
    avatarUrl: String(payload?.picture || '').trim() || null,
  };
}

function buildSystemGeneratedPassword() {
  return crypto.randomBytes(48).toString('hex');
}

function ensureRefreshTokenModel() {
  if (!prisma.refreshToken) {
    const e = new Error(
      'Prisma client chưa có model RefreshToken. Hãy chạy `npx prisma generate` sau khi cập nhật schema.'
    );
    e.status = 500;
    throw e;
  }
}

function buildAccessToken(userPayload, scope = 'user') {
  const normalizedScope = normalizeAuthScope(scope);
  return jwt.sign(
    {
      ...userPayload,
      tokenScope: normalizedScope,
    },
    getJwtSecretByScope(normalizedScope),
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

function getPermissionsByRole(role) {
  const roleUpper = String(role || '').toUpperCase();

  switch (roleUpper) {
    case 'SHIPPER':
      return ['Quản lý giao hàng'];
    case 'ADMIN':
      return [
        'Tổng quan chi nhánh',
        'Quản lý đơn hàng chi nhánh',
        'Quản lý đánh giá đơn hàng chi nhánh',
      ];
    case 'SUPER_ADMIN':
      return [
        'Tổng quan',
        'Quản lý sản phẩm',
        'Quản lý thể loại',
        'Quản lý danh mục',
        'Quản lý đơn hàng',
        'Quản lý người dùng',
        'Quản lý tùy chọn',
        'Quản lý đánh giá món ăn',
        'Quản lý đánh giá đơn hàng',
        'Quản lý khuyến mãi',
        'Quản lý voucher',
        'Quản lý banner',
        'Quản lý combo',
        'Quản lý quà tặng',
      ];
    default:
      return [];
  }
}

function mapUserInfo(account, { includePermissions = false } = {}) {
  const payload = {
    maTaiKhoan: account.MaTaiKhoan,
    maCoSo: account.NguoiDung?.MaCoSo || null,
    email: account.NguoiDung?.Email,
    role: account.NguoiDung?.Role,
    maNguoiDung: account.NguoiDung?.MaNguoiDung,
    hoTen: account.NguoiDung?.HoTen,
    soDienThoai: account.NguoiDung?.SoDienThoai,
    soNhaDuong: account.NguoiDung?.SoNhaDuong,
    phuongXa: account.NguoiDung?.PhuongXa,
    quanHuyen: account.NguoiDung?.QuanHuyen,
    thanhPho: account.NguoiDung?.ThanhPho,
  };

  if (includePermissions) {
    payload.permissions = getPermissionsByRole(account.NguoiDung?.Role);
  }

  return payload;
}

async function findMatchedLocalAccountByPassword(accounts, matKhau) {
  let pendingMatched = null;

  for (const account of accounts) {
    if (getAccountProvider(account) !== 'local' || !account?.MatKhau) {
      continue;
    }

    const isValidPassword = await bcrypt.compare(matKhau, account.MatKhau);
    if (!isValidPassword) {
      continue;
    }

    if (account.IsActived) {
      return {
        matchedAccount: account,
        pendingMatched,
      };
    }

    pendingMatched = account;
  }

  return {
    matchedAccount: null,
    pendingMatched,
  };
}

function buildEmailVerificationToken(account) {
  return jwt.sign(
    {
      action: 'verify_email',
      maTaiKhoan: account.MaTaiKhoan,
      email: account.NguoiDung?.Email,
    },
    EMAIL_VERIFY_SECRET,
    { expiresIn: EMAIL_VERIFY_EXPIRES_IN }
  );
}

function buildEmailVerificationLink(token) {
  const feBase = FRONTEND_URL.replace(/\/$/, '');
  return `${feBase}/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail(account) {
  const email = account?.NguoiDung?.Email;
  if (!email) {
    const e = new Error('Không tìm thấy email tài khoản để gửi xác thực');
    e.status = 500;
    throw e;
  }

  const token = buildEmailVerificationToken(account);
  const verifyLink = buildEmailVerificationLink(token);

  await emailService.sendAccountVerificationEmail({
    to: email,
    recipientName: account?.NguoiDung?.HoTen || email,
    verifyLink,
    expiresIn: EMAIL_VERIFY_EXPIRES_IN,
  });
}

function parseVerifyEmailToken(token) {
  try {
    return jwt.verify(token, EMAIL_VERIFY_SECRET);
  } catch (err) {
    const e = new Error(
      err.name === 'TokenExpiredError'
        ? 'Liên kết xác thực đã hết hạn. Vui lòng đăng ký lại để nhận email mới.'
        : 'Token xác thực không hợp lệ.'
    );
    e.status = 400;
    throw e;
  }
}

async function generateAuthTokens(maTaiKhoan, userPayload, { scope = 'user' } = {}) {
  ensureRefreshTokenModel();

  const accessToken = buildAccessToken(userPayload, scope);
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);

  await prisma.refreshToken.create({
    data: {
      maTaiKhoan: Number(maTaiKhoan),
      token: hashRefreshToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken, expiresAt };
}

async function register({ email, matKhau, hoTen }) {
  if (!email || !matKhau) {
    const e = new Error('Thiếu thông tin: email, matKhau');
    e.status = 400;
    throw e;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    const e = new Error('Định dạng email không hợp lệ');
    e.status = 400;
    throw e;
  }

  const existingAccounts = await repo.findAccountsByEmail(normalizedEmail);
  if (existingAccounts.length > 0) {
    const existingUser = existingAccounts.find((account) => account?.NguoiDung)?.NguoiDung;
    if (!existingUser?.MaNguoiDung) {
      const e = new Error('Dữ liệu tài khoản không hợp lệ. Vui lòng liên hệ quản trị viên.');
      e.status = 500;
      throw e;
    }

    const hasLocalActivated = existingAccounts.some(
      (account) => getAccountProvider(account) === 'local' && account.IsActived
    );
    if (hasLocalActivated) {
      const e = new Error('Email đã được sử dụng');
      e.status = 409;
      throw e;
    }

    const hashedPassword = await bcrypt.hash(matKhau, 10);
    const pendingAccount = await repo.createPendingLocalAccountForUser({
      maNguoiDung: existingUser.MaNguoiDung,
      matKhau: hashedPassword,
    });
    await sendVerificationEmail(pendingAccount);

    return {
      requiresEmailVerification: true,
      isResend: false,
      email: normalizedEmail,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
    };
  }

  const hashedPassword = await bcrypt.hash(matKhau, 10);

  const { taiKhoan, nguoiDung } = await repo.createUser({
    email: normalizedEmail,
    matKhau: hashedPassword,
    hoTen,
  });

  await sendVerificationEmail({
    ...taiKhoan,
    NguoiDung: nguoiDung,
  });

  return {
    requiresEmailVerification: true,
    isResend: false,
    email: normalizedEmail,
    message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
  };
}

async function verifyEmail({ token }) {
  if (!token) {
    const e = new Error('Thiếu token xác thực');
    e.status = 400;
    throw e;
  }

  const payload = parseVerifyEmailToken(token);
  if (payload?.action !== 'verify_email' || !payload?.maTaiKhoan || !payload?.email) {
    const e = new Error('Token xác thực không hợp lệ.');
    e.status = 400;
    throw e;
  }

  const account = await repo.findAccountById(payload.maTaiKhoan);
  if (!account || !account.NguoiDung) {
    const e = new Error('Tài khoản không tồn tại hoặc đã bị xóa');
    e.status = 400;
    throw e;
  }

  const emailFromToken = normalizeEmail(payload.email);
  const emailFromDb = normalizeEmail(account.NguoiDung.Email);
  if (!emailFromDb || emailFromDb !== emailFromToken) {
    const e = new Error('Token xác thực không khớp với tài khoản');
    e.status = 400;
    throw e;
  }

  const provider = getAccountProvider(account);
  if (provider !== 'local') {
    const e = new Error('Tài khoản này không dùng xác thực email local');
    e.status = 400;
    throw e;
  }

  let resolvedAccount = account;
  let wasActivated = false;

  if (!account.IsActived) {
    resolvedAccount = await repo.activateAccount(account.MaTaiKhoan);
    wasActivated = true;
  }

  const deletedResult = await repo.deletePendingLocalAccountsByUser({
    maNguoiDung: resolvedAccount.NguoiDung?.MaNguoiDung,
    exceptMaTaiKhoan: resolvedAccount.MaTaiKhoan,
  });
  const deletedPendingAccounts = deletedResult?.count || 0;

  const baseMessage = wasActivated
    ? 'Xác thực email thành công. Bạn có thể đăng nhập.'
    : 'Tài khoản đã được xác thực trước đó. Bạn có thể đăng nhập.';
  const cleanupMessage = deletedPendingAccounts
    ? ` Đã xóa ${deletedPendingAccounts} tài khoản local chưa xác thực cũ.`
    : '';

  return {
    message: `${baseMessage}${cleanupMessage}`,
    user: mapUserInfo(resolvedAccount),
    wasActivated,
    deletedPendingAccounts,
  };
}

async function login({ email, matKhau }) {
  if (!email || !matKhau) {
    const e = new Error('Thiếu thông tin: email, matKhau');
    e.status = 400;
    throw e;
  }

  const normalizedEmail = normalizeEmail(email);
  const accounts = await repo.findAccountsByEmail(normalizedEmail);
  if (!accounts.length) {
    const e = new Error('Email hoặc mật khẩu không đúng');
    e.status = 401;
    throw e;
  }

  const { matchedAccount, pendingMatched } = await findMatchedLocalAccountByPassword(accounts, matKhau);
  if (!matchedAccount) {
    if (pendingMatched) {
      const e = new Error('Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư.');
      e.status = 403;
      throw e;
    }

    const e = new Error('Email hoặc mật khẩu không đúng');
    e.status = 401;
    throw e;
  }

  const userRes = mapUserInfo(matchedAccount);
  const authTokens = await generateAuthTokens(matchedAccount.MaTaiKhoan, userRes, { scope: 'user' });
  return { ...userRes, ...authTokens };
}

async function loginWithGoogle({ code }) {
  if (!code) {
    const e = new Error('Thiếu mã đăng nhập Google');
    e.status = 400;
    throw e;
  }

  const googleProfile = await verifyGoogleIdentityFromCode(code);
  const linkedGoogleAccounts = await repo.findAccountsByProviderId({
    provider: 'google',
    providerId: googleProfile.providerId,
  });

  if (linkedGoogleAccounts.length > 1) {
    const e = new Error('Tài khoản Google này đang liên kết bất thường với nhiều hồ sơ.');
    e.status = 409;
    throw e;
  }

  let resolvedAccount = linkedGoogleAccounts[0] || null;
  let loginScenario = 'existing_google_user';

  if (!resolvedAccount) {
    const existingAccountsByEmail = await repo.findAccountsByEmail(googleProfile.email);

    if (!existingAccountsByEmail.length) {
      const { taiKhoan, nguoiDung } = await repo.createUserWithGoogle({
        email: googleProfile.email,
        hoTen: googleProfile.hoTen,
        providerId: googleProfile.providerId,
        matKhau: buildSystemGeneratedPassword(),
      });

      resolvedAccount = {
        ...taiKhoan,
        NguoiDung: nguoiDung,
      };
      loginScenario = 'new_user';
    } else {
      const existingUser = existingAccountsByEmail.find((account) => account?.NguoiDung)?.NguoiDung;
      if (!existingUser?.MaNguoiDung) {
        const e = new Error('Dữ liệu tài khoản không hợp lệ. Vui lòng liên hệ quản trị viên.');
        e.status = 500;
        throw e;
      }

      const existingGoogleAccount = existingAccountsByEmail.find(
        (account) => getAccountProvider(account) === 'google'
      );

      if (existingGoogleAccount) {
        const existingProviderId = String(existingGoogleAccount.providerId || '').trim();
        if (existingProviderId && existingProviderId !== googleProfile.providerId) {
          const e = new Error('Email này đã liên kết với một tài khoản Google khác.');
          e.status = 409;
          throw e;
        }

        resolvedAccount = existingGoogleAccount;
        loginScenario = 'existing_google_user';
      } else {
        resolvedAccount = await repo.createGoogleAccountForUser({
          maNguoiDung: existingUser.MaNguoiDung,
          providerId: googleProfile.providerId,
          matKhau: buildSystemGeneratedPassword(),
        });
        loginScenario = 'linked_existing_email';
      }
    }
  }

  if (!resolvedAccount || !resolvedAccount.NguoiDung) {
    const e = new Error('Không thể xác định người dùng từ tài khoản Google');
    e.status = 500;
    throw e;
  }

  if (!resolvedAccount.IsActived) {
    resolvedAccount = await repo.activateAccount(resolvedAccount.MaTaiKhoan);
  }

  const userRes = mapUserInfo(resolvedAccount);
  const authTokens = await generateAuthTokens(resolvedAccount.MaTaiKhoan, userRes, { scope: 'user' });

  return {
    ...userRes,
    ...authTokens,
    loginScenario,
    googleProfile: {
      email: googleProfile.email,
      hoTen: googleProfile.hoTen,
      avatarUrl: googleProfile.avatarUrl,
      providerId: googleProfile.providerId,
    },
  };
}

async function adminLogin({ email, matKhau }) {
  if (!email || !matKhau) {
    const e = new Error('Thiếu thông tin: email, matKhau');
    e.status = 400;
    throw e;
  }

  const normalizedEmail = normalizeEmail(email);
  const accounts = await repo.findAccountsByEmail(normalizedEmail);
  if (!accounts.length) {
    const e = new Error('Email hoặc mật khẩu không đúng');
    e.status = 401;
    throw e;
  }

  const { matchedAccount, pendingMatched } = await findMatchedLocalAccountByPassword(accounts, matKhau);
  if (!matchedAccount) {
    if (pendingMatched) {
      const e = new Error('Tài khoản chưa được xác thực email.');
      e.status = 403;
      throw e;
    }

    const e = new Error('Email hoặc mật khẩu không đúng');
    e.status = 401;
    throw e;
  }

  const role = String(matchedAccount.NguoiDung?.Role || '').toUpperCase();
  if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    const e = new Error('Tài khoản không có quyền truy cập hệ thống quản trị');
    e.status = 403;
    throw e;
  }

  const userRes = mapUserInfo(matchedAccount, { includePermissions: true });
  const authTokens = await generateAuthTokens(matchedAccount.MaTaiKhoan, userRes, { scope: 'admin' });
  return { ...userRes, ...authTokens };
}

async function getCurrentUser({ maTaiKhoan }) {
  const accountId = Number(maTaiKhoan);
  if (!Number.isFinite(accountId)) {
    const e = new Error('Không xác định được người dùng hiện tại');
    e.status = 401;
    throw e;
  }

  const cacheKey = buildCacheKey('auth', 'me', accountId);
  const accountTag = buildCacheKey(cacheTags.AUTH_ME, accountId);

  return apiCache.getOrSet(
    cacheKey,
    async () => {
      const account = await repo.findAccountById(accountId);
      if (!account || !account.NguoiDung || !account.IsActived) {
        const e = new Error('Phiên đăng nhập không hợp lệ');
        e.status = 401;
        throw e;
      }

      const roleUpper = String(account.NguoiDung?.Role || '').toUpperCase();
      return mapUserInfo(account, { includePermissions: roleUpper !== 'CUSTOMER' });
    },
    {
      ttlMs: cacheTtls.AUTH_ME,
      tags: [cacheTags.AUTH_ME, accountTag],
    }
  );
}

async function refreshAuthTokens(refreshTokenCookie, { scope = 'user' } = {}) {
  const normalizedScope = normalizeAuthScope(scope);
  if (!refreshTokenCookie) {
    const e = new Error('Không cung cấp Refresh Token');
    e.status = 401;
    throw e;
  }

  ensureRefreshTokenModel();

  const tokenRecord = await prisma.refreshToken.findFirst({
    where: { token: hashRefreshToken(refreshTokenCookie) },
    include: { TaiKhoan: { include: { NguoiDung: true } } },
  });

  if (!tokenRecord) {
    const e = new Error('Refresh Token không hợp lệ');
    e.status = 401;
    throw e;
  }

  if (new Date() > tokenRecord.expiresAt) {
    await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
    const e = new Error('Refresh Token đã hết hạn, vui lòng đăng nhập lại');
    e.status = 401;
    throw e;
  }

  const userPayload = mapUserInfo(tokenRecord.TaiKhoan, {
    includePermissions: String(tokenRecord.TaiKhoan?.NguoiDung?.Role || '').toUpperCase() !== 'CUSTOMER',
  });

  if (normalizedScope === 'admin') {
    const role = String(tokenRecord.TaiKhoan?.NguoiDung?.Role || '').toUpperCase();
    if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      const e = new Error('Tài khoản không có quyền truy cập hệ thống quản trị');
      e.status = 403;
      throw e;
    }
  }

  const accessToken = buildAccessToken(userPayload, normalizedScope);

  const timeUntilExpiry = tokenRecord.expiresAt.getTime() - Date.now();
  if (timeUntilExpiry < REFRESH_ROTATE_THRESHOLD_MS) {
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);

    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        token: hashRefreshToken(newRefreshToken),
        expiresAt: newExpiresAt,
      },
    });

    return {
      ...userPayload,
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt,
    };
  }

  return {
    ...userPayload,
    accessToken,
    refreshToken: refreshTokenCookie,
    expiresAt: tokenRecord.expiresAt,
  };
}

async function logout(refreshTokenCookie) {
  if (!refreshTokenCookie) {
    return;
  }

  ensureRefreshTokenModel();

  await prisma.refreshToken.deleteMany({
    where: { token: hashRefreshToken(refreshTokenCookie) },
  });
}

module.exports = {
  register,
  verifyEmail,
  login,
  loginWithGoogle,
  adminLogin,
  getCurrentUser,
  refreshAuthTokens,
  logout,
};
