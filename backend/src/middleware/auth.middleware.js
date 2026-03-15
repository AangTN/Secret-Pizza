const jwt = require('jsonwebtoken');
const { getJwtSecretByScope } = require('../config/jwtSecrets');

function extractBearerToken(req) {
  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.split(' ')[1];
  }
  return null;
}

function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.userAccessToken || extractBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const decoded = jwt.verify(token, getJwtSecretByScope('user'));
    if (decoded?.tokenScope && decoded.tokenScope !== 'user') {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn' });
    }
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.adminAccessToken || extractBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const decoded = jwt.verify(token, getJwtSecretByScope('admin'));
    if (decoded?.tokenScope && decoded.tokenScope !== 'admin') {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    req.user = decoded;
    const role = String(req.user?.role || '').toUpperCase();
    if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn' });
    }
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
};