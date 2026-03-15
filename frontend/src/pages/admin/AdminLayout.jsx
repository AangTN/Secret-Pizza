import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext';
import '../../styles/admin.css';

const AdminLayoutContent = () => {
  const { admin, logout } = useAdminAuth();
  const { isOpen, isCollapsed, screenSize, toggleSidebar, closeSidebar } = useSidebar();

  const HamburgerButton = () => (
    <button
      onClick={toggleSidebar}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '32px',
        height: '32px',
        background: 'transparent',
        border: '1px solid var(--admin-border-base)',
        borderRadius: 'var(--admin-radius-md)',
        cursor: 'pointer',
        transition: 'var(--admin-transition-base)',
        padding: '6px',
        gap: '3px'
      }}
      onMouseEnter={(e) => {
        e.target.style.background = 'var(--admin-bg-secondary)';
        e.target.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'transparent';
        e.target.style.transform = 'scale(1)';
      }}
    >
      <span
        style={{
          width: '20px',
          height: '2px',
          background: 'var(--admin-text-primary)',
          borderRadius: '1px',
          transition: 'var(--admin-transition-base)',
          transform: isOpen && screenSize === 'mobile' ? 'rotate(45deg) translate(5px, 5px)' : 'none'
        }}
      />
      <span
        style={{
          width: '20px',
          height: '2px',
          background: 'var(--admin-text-primary)',
          borderRadius: '1px',
          transition: 'var(--admin-transition-base)',
          opacity: isOpen && screenSize === 'mobile' ? 0 : 1
        }}
      />
      <span
        style={{
          width: '20px',
          height: '2px',
          background: 'var(--admin-text-primary)',
          borderRadius: '1px',
          transition: 'var(--admin-transition-base)',
          transform: isOpen && screenSize === 'mobile' ? 'rotate(-45deg) translate(7px, -6px)' : 'none'
        }}
      />
    </button>
  );

  return (
    <div className="admin-app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Modern Header */}
      <header 
        style={{
          background: 'var(--admin-bg-header)',
          color: 'var(--admin-text-primary)',
          padding: 'var(--admin-space-md) var(--admin-space-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--admin-z-sticky)',
          borderBottom: '1px solid var(--admin-border-base)'
        }}
      >
        {/* Header Left - Hamburger, Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--admin-space-md)' }}>
          {/* Hamburger Menu - Show on mobile and tablet */}
          {(screenSize === 'mobile' || screenSize === 'tablet') && <HamburgerButton />}
          
          <div 
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 
              style={{
                margin: 0,
                fontSize: screenSize === 'mobile' ? 'var(--admin-font-size-lg)' : 'var(--admin-font-size-xl)',
                fontWeight: 'var(--admin-font-weight-bold)',
                color: 'var(--admin-primary)',
              }}
            >
              Trang quản trị
            </h1>
            <p 
              style={{
                margin: '2px 0 0 0',
                fontSize: screenSize === 'mobile' ? 'var(--admin-font-size-xs)' : 'var(--admin-font-size-sm)',
                color: 'var(--admin-text-tertiary)',
                fontWeight: 'var(--admin-font-weight-medium)',
                display: screenSize === 'mobile' ? 'none' : 'block'
              }}
            >
              Quản lý cửa hàng pizza
            </p>
          </div>
        </div>

        {/* Header Right - User Info and Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: screenSize === 'mobile' ? 'var(--admin-space-sm)' : 'var(--admin-space-lg)' }}>
          
          {/* User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--admin-space-md)' }}>
            <div 
              style={{
                width: screenSize === 'mobile' ? '32px' : '36px',
                height: screenSize === 'mobile' ? '32px' : '36px',
                background: 'linear-gradient(135deg, var(--admin-primary) 0%, var(--admin-secondary) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: screenSize === 'mobile' ? 'var(--admin-font-size-sm)' : 'var(--admin-font-size-base)',
                fontWeight: 'var(--admin-font-weight-bold)',
                boxShadow: 'var(--admin-shadow-sm)'
              }}
            >
              {admin?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            {screenSize !== 'mobile' && (
              <div style={{ textAlign: 'right' }}>
                <div 
                  style={{
                    fontSize: 'var(--admin-font-size-sm)',
                    fontWeight: 'var(--admin-font-weight-semibold)',
                    color: 'var(--admin-text-inverse)',
                    lineHeight: 'var(--admin-line-height-tight)'
                  }}
                >
                  {admin?.hoTen || 'Admin'}
                </div>
                <div 
                  style={{
                    fontSize: 'var(--admin-font-size-xs)',
                    color: 'var(--admin-text-tertiary)',
                    fontWeight: 'var(--admin-font-weight-medium)'
                  }}
                >
                  {admin?.role || 'Quản trị viên'}
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            style={{
              padding: screenSize === 'mobile' ? 'var(--admin-space-sm)' : 'var(--admin-space-sm) var(--admin-space-md)',
              background: 'rgba(255, 77, 79, 0.1)',
              border: '1px solid rgba(255, 77, 79, 0.3)',
              borderRadius: 'var(--admin-radius-md)',
              color: 'var(--admin-primary-light)',
              fontSize: 'var(--admin-font-size-sm)',
              fontWeight: 'var(--admin-font-weight-semibold)',
              cursor: 'pointer',
              transition: 'var(--admin-transition-base)',
              display: 'flex',
              alignItems: 'center',
              gap: screenSize === 'mobile' ? '0' : 'var(--admin-space-xs)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 77, 79, 0.2)';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = 'var(--admin-shadow-sm)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 77, 79, 0.1)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {screenSize !== 'mobile' && <span>Đăng xuất</span>}
            <span>{screenSize === 'mobile' ? '🚪' : '→'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Mobile Overlay */}
        {screenSize === 'mobile' && isOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(2px)',
              zIndex: 'var(--admin-z-modal-backdrop)',
              transition: 'var(--admin-transition-base)'
            }}
            onClick={closeSidebar}
          />
        )}
        
        <AdminSidebar />
        
        {/* Content Area */}
        <main 
          style={{
            flex: 1,
            padding: screenSize === 'mobile' ? 'var(--admin-space-md)' : 'var(--admin-space-xl)',
            overflow: 'auto',
            background: 'var(--admin-bg-secondary)',
            minHeight: 0,
            marginLeft: screenSize === 'desktop' ? 0 : (isOpen && screenSize === 'mobile' ? 0 : (isCollapsed && screenSize === 'tablet' ? 'var(--admin-sidebar-collapsed-width)' : 0)),
            transition: 'var(--admin-transition-base)'
          }}
          className="admin-animate-fade-in"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AdminLayout = () => {
  return (
    <SidebarProvider>
      <AdminLayoutContent />
    </SidebarProvider>
  );
};

export default AdminLayout;
