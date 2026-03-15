const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { getJwtSecretByScope } = require('../config/jwtSecrets');

let ioInstance = null;

const roomNames = {
  user: (maNguoiDung) => `order:user:${Number(maNguoiDung)}`,
  branch: (maCoSo) => `order:branch:${Number(maCoSo)}`,
  role: (role) => `order:role:${String(role || '').toUpperCase()}`,
  shipper: (maNguoiDung) => `order:shipper:${Number(maNguoiDung)}`,
  order: (maDonHang) => `order:id:${Number(maDonHang)}`,
  phone: (soDienThoai) => `order:phone:${String(soDienThoai || '')}`,
};

function normalizePhoneNumber(phone) {
  return String(phone || '').replace(/[^\d+]/g, '').trim();
}

function parseCookieHeader(rawCookieHeader = '') {
  return rawCookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const delimiterIndex = entry.indexOf('=');
      if (delimiterIndex <= 0) {
        return acc;
      }
      const key = entry.slice(0, delimiterIndex).trim();
      const value = entry.slice(delimiterIndex + 1).trim();
      if (!key) {
        return acc;
      }
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function getSocketScope(handshake = {}) {
  const requestedScope = String(handshake?.auth?.scope || '').trim().toLowerCase();
  if (requestedScope === 'admin') {
    return 'admin';
  }
  if (requestedScope === 'guest') {
    return 'guest';
  }
  return 'user';
}

function getAccessTokenFromHandshake(handshake = {}) {
  const scope = getSocketScope(handshake);

  const authToken = handshake?.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return {
      token: authToken.trim(),
      scope,
    };
  }

  const authorization = handshake?.headers?.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    return {
      token: authorization.slice(7).trim(),
      scope,
    };
  }

  const cookieMap = parseCookieHeader(handshake?.headers?.cookie || '');

  if (scope === 'admin' && cookieMap.adminAccessToken) {
    return {
      token: cookieMap.adminAccessToken,
      scope: 'admin',
    };
  }

  if (scope === 'user' && cookieMap.userAccessToken) {
    return {
      token: cookieMap.userAccessToken,
      scope: 'user',
    };
  }

  if (cookieMap.adminAccessToken) {
    return {
      token: cookieMap.adminAccessToken,
      scope: 'admin',
    };
  }

  if (cookieMap.userAccessToken) {
    return {
      token: cookieMap.userAccessToken,
      scope: 'user',
    };
  }

  return {
    token: null,
    scope,
  };
}

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

function getLatestStatus(order) {
  const timeline = Array.isArray(order?.LichSuTrangThaiDonHang)
    ? order.LichSuTrangThaiDonHang
    : [];

  if (!timeline.length) {
    return null;
  }

  const sorted = [...timeline].sort((a, b) => {
    const leftTime = a?.ThoiGianCapNhat ? new Date(a.ThoiGianCapNhat).getTime() : 0;
    const rightTime = b?.ThoiGianCapNhat ? new Date(b.ThoiGianCapNhat).getTime() : 0;
    if (leftTime === rightTime) {
      return Number(a?.MaLichSuTrangThaiDonHang || 0) - Number(b?.MaLichSuTrangThaiDonHang || 0);
    }
    return leftTime - rightTime;
  });

  return sorted[sorted.length - 1]?.TrangThai || null;
}

function joinDefaultRooms(socket, user) {
  const maNguoiDung = Number(user?.maNguoiDung || 0);
  const maCoSo = Number(user?.maCoSo || 0);
  const role = normalizeRole(user?.role);

  if (maNguoiDung) {
    socket.join(roomNames.user(maNguoiDung));
  }

  if (maCoSo) {
    socket.join(roomNames.branch(maCoSo));
  }

  if (role) {
    socket.join(roomNames.role(role));
  }

  if (role === 'SHIPPER' && maNguoiDung) {
    socket.join(roomNames.shipper(maNguoiDung));
  }
}

function initSocketServer(httpServer, allowedOrigins = []) {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origin is not allowed by Socket.IO CORS policy'), false);
      },
      credentials: true,
    },
  });

  ioInstance.use((socket, next) => {
    const { token, scope } = getAccessTokenFromHandshake(socket.handshake);
    socket.data.scope = scope;

    if (!token) {
      socket.data.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, getJwtSecretByScope(scope));

      if (decoded?.tokenScope && decoded.tokenScope !== scope) {
        return next(new Error('UNAUTHORIZED'));
      }

      socket.data.user = decoded;
      return next();
    } catch (error) {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const user = socket.data.user || {};
    const isAuthenticated = Boolean(user?.maTaiKhoan);
    joinDefaultRooms(socket, user);

    socket.on('order:join', (orderId) => {
      if (!isAuthenticated) {
        return;
      }

      const normalizedOrderId = Number(orderId || 0);
      if (!normalizedOrderId) {
        return;
      }
      socket.join(roomNames.order(normalizedOrderId));
    });

    socket.on('order:leave', (orderId) => {
      if (!isAuthenticated) {
        return;
      }

      const normalizedOrderId = Number(orderId || 0);
      if (!normalizedOrderId) {
        return;
      }
      socket.leave(roomNames.order(normalizedOrderId));
    });

    socket.on('order:join-phone', (phone) => {
      const normalizedPhone = normalizePhoneNumber(phone);
      if (normalizedPhone.length < 8) {
        return;
      }
      socket.join(roomNames.phone(normalizedPhone));
    });

    socket.on('order:leave-phone', (phone) => {
      const normalizedPhone = normalizePhoneNumber(phone);
      if (normalizedPhone.length < 8) {
        return;
      }
      socket.leave(roomNames.phone(normalizedPhone));
    });
  });

  return ioInstance;
}

function emitOrderChanged(order, { type = 'updated', meta = null, actor = null } = {}) {
  if (!ioInstance || !order) {
    return false;
  }

  const maDonHang = Number(order?.MaDonHang || order?.maDonHang || 0);
  if (!maDonHang) {
    return false;
  }

  const maNguoiDung = Number(order?.MaNguoiDung || 0);
  const maCoSo = Number(order?.MaCoSo || 0);
  const maNguoiDungGiaoHang = Number(order?.MaNguoiDungGiaoHang || 0);
  const soDienThoaiGiaoHang = normalizePhoneNumber(
    order?.SoDienThoaiGiaoHang || order?.soDienThoaiGiaoHang || order?.SoDienThoai || order?.soDienThoai
  );
  const latestStatus = getLatestStatus(order);

  const targets = new Set([roomNames.order(maDonHang), roomNames.role('SUPER_ADMIN')]);

  if (maNguoiDung) {
    targets.add(roomNames.user(maNguoiDung));
  }

  if (maCoSo) {
    targets.add(roomNames.branch(maCoSo));
  }

  if (maNguoiDungGiaoHang) {
    targets.add(roomNames.shipper(maNguoiDungGiaoHang));
  }

  if (soDienThoaiGiaoHang) {
    targets.add(roomNames.phone(soDienThoaiGiaoHang));
  }

  if (latestStatus === 'Chờ giao hàng' || type === 'created' || type === 'shipper_unassigned') {
    targets.add(roomNames.role('SHIPPER'));
  }

  const roomList = Array.from(targets).filter(Boolean);
  if (!roomList.length) {
    return false;
  }

  let emitter = ioInstance;
  roomList.forEach((room) => {
    emitter = emitter.to(room);
  });

  emitter.emit('order:changed', {
    type,
    orderId: maDonHang,
    latestStatus,
    order,
    meta: meta || undefined,
    actor: actor || undefined,
    emittedAt: new Date().toISOString(),
  });

  return true;
}

module.exports = {
  initSocketServer,
  emitOrderChanged,
  roomNames,
};
