import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socketInstance = null;
let activeIdentityKey = null;

function buildIdentityKey(identity = {}) {
  const maTaiKhoan = identity?.maTaiKhoan || '';
  const maNguoiDung = identity?.maNguoiDung || '';
  const maCoSo = identity?.maCoSo || '';
  const role = String(identity?.role || '').toUpperCase();
  const guestPhone = identity?.guestPhone || '';
  return `${maTaiKhoan}:${maNguoiDung}:${maCoSo}:${role}:${guestPhone}`;
}

function normalizePhoneNumber(phone) {
  return String(phone || '').replace(/[^\d+]/g, '').trim();
}

function getSocketScope(identity = {}) {
  if (identity?.guestPhone) {
    return 'guest';
  }

  const role = String(identity?.role || '').toUpperCase();
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SHIPPER') {
    return 'admin';
  }

  return 'user';
}

function ensureSocket(identity = {}) {
  const identityKey = buildIdentityKey(identity);

  if (!socketInstance || activeIdentityKey !== identityKey) {
    if (socketInstance) {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    }

    socketInstance = io(API_BASE_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: {
        scope: getSocketScope(identity),
      },
    });

    activeIdentityKey = identityKey;
  }

  if (socketInstance && !socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

export function subscribeOrderChanges(identity, onEvent) {
  if (!identity?.maTaiKhoan || typeof onEvent !== 'function') {
    return () => {};
  }

  const socket = ensureSocket(identity);
  const handler = (payload) => onEvent(payload);

  socket.on('order:changed', handler);

  return () => {
    socket.off('order:changed', handler);
    if (socket.listeners('order:changed').length === 0) {
      socket.disconnect();
    }
  };
}

export function subscribeOrderChangesByPhone(phone, onEvent) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (normalizedPhone.length < 8 || typeof onEvent !== 'function') {
    return () => {};
  }

  const socket = ensureSocket({ guestPhone: normalizedPhone });
  const handler = (payload) => onEvent(payload);
  const joinRoom = () => {
    socket.emit('order:join-phone', normalizedPhone);
  };

  socket.on('connect', joinRoom);
  socket.on('order:changed', handler);

  if (socket.connected) {
    joinRoom();
  }

  return () => {
    socket.emit('order:leave-phone', normalizedPhone);
    socket.off('connect', joinRoom);
    socket.off('order:changed', handler);
    if (socket.listeners('order:changed').length === 0) {
      socket.disconnect();
    }
  };
}
