const service = require('./auth.service');

function setAuthCookies(res, accessToken, refreshToken, refreshTokenExpiresAt, { scope = 'user' } = {}) {
  const isAdmin = scope === 'admin';
  const accessTokenCookieName = isAdmin ? 'adminAccessToken' : 'userAccessToken';
  const refreshTokenCookieName = isAdmin ? 'adminRefreshToken' : 'userRefreshToken';

  res.cookie(accessTokenCookieName, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie(refreshTokenCookieName, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: refreshTokenExpiresAt,
  });
}

function clearAuthCookies(res, { scope = 'user' } = {}) {
  const isAdmin = scope === 'admin';
  const accessTokenCookieName = isAdmin ? 'adminAccessToken' : 'userAccessToken';
  const refreshTokenCookieName = isAdmin ? 'adminRefreshToken' : 'userRefreshToken';

  res.clearCookie(accessTokenCookieName);
  res.clearCookie(refreshTokenCookieName);
}

function getGoogleLoginMessage(loginScenario) {
  switch (loginScenario) {
    case 'new_user':
      return 'Đăng nhập Google thành công. Tài khoản mới đã được tạo.';
    case 'linked_existing_email':
      return 'Đăng nhập Google thành công. Đã liên kết với tài khoản hiện có.';
    default:
      return 'Đăng nhập Google thành công.';
  }
}

async function register(req, res) {
  try {
    const { email, hoTen, matKhau, soDienThoai } = req.body;
    const result = await service.register({ email, hoTen, matKhau, soDienThoai });
    res.status(200).json(result);
  } catch (err) {
    console.error('register error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function verifyEmail(req, res) {
  try {
    const { token } = req.body;
    const result = await service.verifyEmail({ token });
    res.status(200).json(result);
  } catch (err) {
    console.error('verify email error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function login(req, res) {
  try {
    const { email, matKhau } = req.body;
    const { accessToken, refreshToken, expiresAt, ...userData } = await service.login({ email, matKhau });
    
    setAuthCookies(res, accessToken, refreshToken, expiresAt, { scope: 'user' });
    
    res.status(200).json({ message: 'Đăng nhập thành công', user: userData });
  } catch (err) {
    console.error('login error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function googleLogin(req, res) {
  try {
    const { code } = req.body;
    const {
      accessToken,
      refreshToken,
      expiresAt,
      loginScenario,
      googleProfile,
      ...userData
    } = await service.loginWithGoogle({ code });

    setAuthCookies(res, accessToken, refreshToken, expiresAt, { scope: 'user' });

    res.status(200).json({
      message: getGoogleLoginMessage(loginScenario),
      user: userData,
      loginScenario,
      googleProfile,
    });
  } catch (err) {
    console.error('google login error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function adminLogin(req, res) {
  try {
    const { email, matKhau } = req.body;
    const { accessToken, refreshToken, expiresAt, ...userData } = await service.adminLogin({ email, matKhau });

    setAuthCookies(res, accessToken, refreshToken, expiresAt, { scope: 'admin' });

    res.status(200).json({ message: 'Đăng nhập admin thành công', user: userData });
  } catch (err) {
    console.error('admin login error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function getMe(req, res) {
  try {
    const user = await service.getCurrentUser({ maTaiKhoan: req.user?.maTaiKhoan });
    res.status(200).json({ user });
  } catch (err) {
    console.error('get me error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function getAdminMe(req, res) {
  try {
    const user = await service.getCurrentUser({ maTaiKhoan: req.user?.maTaiKhoan });
    const role = String(user?.role || '').toUpperCase();
    if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    res.status(200).json({ user });
  } catch (err) {
    console.error('get admin me error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function refreshTokens(req, res) {
  try {
    const rfToken = req.cookies?.userRefreshToken;
    const { accessToken, refreshToken, expiresAt, ...userData } = await service.refreshAuthTokens(rfToken, { scope: 'user' });
    
    setAuthCookies(res, accessToken, refreshToken, expiresAt, { scope: 'user' });

    res.status(200).json({ message: 'Làm mới token thành công', user: userData });
  } catch (err) {
    console.error('refresh tokens error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function refreshAdminTokens(req, res) {
  try {
    const rfToken = req.cookies?.adminRefreshToken;
    const { accessToken, refreshToken, expiresAt, ...userData } = await service.refreshAuthTokens(rfToken, { scope: 'admin' });

    setAuthCookies(res, accessToken, refreshToken, expiresAt, { scope: 'admin' });

    res.status(200).json({ message: 'Làm mới token admin thành công', user: userData });
  } catch (err) {
    console.error('refresh admin tokens error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function logout(req, res) {
  try {
    const rfToken = req.cookies?.userRefreshToken;
    await service.logout(rfToken);

    clearAuthCookies(res, { scope: 'user' });

    res.status(200).json({ message: 'Đăng xuất thành công' });
  } catch (err) {
    console.error('logout error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

async function adminLogout(req, res) {
  try {
    const rfToken = req.cookies?.adminRefreshToken;
    await service.logout(rfToken);

    clearAuthCookies(res, { scope: 'admin' });

    res.status(200).json({ message: 'Đăng xuất thành công' });
  } catch (err) {
    console.error('admin logout error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi server nội bộ' });
  }
}

module.exports = {
  register,
  verifyEmail,
  login,
  googleLogin,
  adminLogin,
  getMe,
  getAdminMe,
  refreshTokens,
  refreshAdminTokens,
  logout,
  adminLogout,
};
