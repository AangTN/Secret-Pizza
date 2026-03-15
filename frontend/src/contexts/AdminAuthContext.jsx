import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';

const AdminAuthContext = createContext();

function mapAdminData(userData) {
  return {
    maTaiKhoan: userData.maTaiKhoan,
    maCoSo: userData.maCoSo,
    email: userData.email,
    role: userData.role,
    hoTen: userData.hoTen,
    soDienThoai: userData.soDienThoai,
    maNguoiDung: userData.maNguoiDung,
    permissions: userData.permissions || []
  };
}

function isAdminRole(role) {
  const roleUpper = String(role || '').toUpperCase();
  return roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN';
}

let adminBootstrapRequest = null;

async function fetchAdminSession() {
  if (!adminBootstrapRequest) {
    adminBootstrapRequest = api.get('/api/auth/admin/me')
      .then((response) => {
        const userData = response?.data?.user;
        if (!userData || !isAdminRole(userData.role)) return null;
        return mapAdminData(userData);
      })
      .catch((error) => {
        if (error?.response?.status !== 401) {
          console.error('Admin auto-login failed:', error);
        }
        return null;
      })
      .finally(() => {
        adminBootstrapRequest = null;
      });
  }

  return adminBootstrapRequest;
}

export const AdminAuthProvider = ({ children }) => {
  const location = useLocation();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdminRoute = /^\/admin(\/|$)/.test(location.pathname || '');

  // Auto-login bằng token cookie khi mount
  useEffect(() => {
    let cancelled = false;

    if (!isAdminRoute) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    (async () => {
      const adminData = await fetchAdminSession();
      if (!cancelled) {
        setAdmin(adminData);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdminRoute]);

  useEffect(() => {
    const handleAuthExpired = () => {
      adminBootstrapRequest = null;
      setAdmin(null);
    };

    window.addEventListener('admin-auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('admin-auth-expired', handleAuthExpired);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post(`/api/auth/admin/login`, {
        email,
        matKhau: password
      });

      // Kiểm tra nếu có lỗi (message nhưng không có user)
      if (response.data.message && !response.data.user) {
        return { success: false, message: response.data.message };
      }

      // Lấy thông tin user từ response
      const userData = response.data.user;

      if (!isAdminRole(userData.role)) {
        return { success: false, message: 'Tài khoản không có quyền truy cập hệ thống quản trị.' };
      }
      
      // Lưu thông tin admin vào state
      const adminData = mapAdminData(userData);

      setAdmin(adminData);
      adminBootstrapRequest = null;

      return { success: true, admin: adminData };

    } catch (error) {
      console.error('Admin login error:', error);
      if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: 'Đăng nhập thất bại. Vui lòng thử lại.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/admin/logout');
    } catch (e) {
      console.error('Logout API failed:', e);
    }
    adminBootstrapRequest = null;
    setAdmin(null);
  }, []);

  const value = useMemo(() => ({
    admin,
    isAuthenticated: Boolean(admin),
    loading,
    login,
    logout,
  }), [admin, loading, login, logout]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
