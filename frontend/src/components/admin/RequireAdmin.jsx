import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const RequireAdmin = ({ children, requiredPermission }) => {
  const { isAuthenticated, loading, admin } = useAdminAuth();
  const location = useLocation();

  // Đợi load xong auto-login
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-danger mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-dark mb-2">Đang kiểm tra quyền truy cập...</h5>
          <p className="text-muted small">Vui lòng đợi</p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  // Kiểm tra permission nếu được yêu cầu
  if (requiredPermission && admin?.permissions) {
    const hasPermission = admin.permissions.includes(requiredPermission);
    if (!hasPermission) {
      return (
        <div className="container mt-5">
          <div className="alert alert-danger border-0 shadow-sm" role="alert">
            <div className="d-flex align-items-start">
              <div style={{ fontSize: '2rem', marginRight: '1rem' }}>🚫</div>
              <div>
                <h4 className="alert-heading mb-2">Không có quyền truy cập</h4>
                <p className="mb-2">
                  Bạn không có quyền <strong>{requiredPermission}</strong> để truy cập trang này.
                </p>
                <hr />
                <p className="mb-0 small">
                  Vui lòng liên hệ quản trị viên để được cấp quyền hoặc quay lại trang chủ admin.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center mt-4">
            <a href="/admin" className="btn btn-primary">
              ← Quay lại trang chủ Admin
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default RequireAdmin;
