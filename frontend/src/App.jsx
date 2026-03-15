import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage.jsx';
import MenuPage from './pages/MenuPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrderSuccessPage from './pages/OrderSuccessPage.jsx';
import PaymentFailedPage from './pages/PaymentFailedPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import TrackOrderPage from './pages/TrackOrderPage.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import CombosPage from './pages/CombosPage.jsx';
import ComboDetailPage from './pages/ComboDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import EmailVerificationPage from './pages/EmailVerificationPage.jsx';
import ProfileEditPage from './pages/ProfileEditPage.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ManageProducts from './pages/admin/ManageProducts.jsx';
import AddProduct from './pages/admin/AddProduct.jsx';
import EditProduct from './pages/admin/EditProduct.jsx';
import ManageCategories from './pages/admin/ManageCategories.jsx';
import ManageTypes from './pages/admin/ManageTypes.jsx';
import ManageOrders from './pages/admin/ManageOrders.jsx';
import ManageOptions from './pages/admin/ManageOptions.jsx';
import AddOption from './pages/admin/AddOption.jsx';
import EditOption from './pages/admin/EditOption.jsx';
import ManageReviews from './pages/admin/ManageReviews.jsx';
import ManageOrderReviews from './pages/admin/ManageOrderReviews.jsx';
import ManagePromotions from './pages/admin/ManagePromotions.jsx';
import ManageCombos from './pages/admin/ManageCombos.jsx';
import AddCombo from './pages/admin/AddCombo.jsx';
import EditCombo from './pages/admin/EditCombo.jsx';
import PromotionDetail from './pages/admin/PromotionDetail.jsx';
import ManageVouchers from './pages/admin/ManageVouchers.jsx';
import ManageBanners from './pages/admin/ManageBanners.jsx';
import ManageUsers from './pages/admin/ManageUsers.jsx';
import ManageGifts from './pages/admin/ManageGifts.jsx';
import BranchDashboard from './pages/admin/BranchDashboard.jsx';
import BranchOrders from './pages/admin/BranchOrders.jsx';
import BranchOrderReviews from './pages/admin/BranchOrderReviews.jsx';
import ShipperAvailableOrders from './pages/admin/ShipperAvailableOrders.jsx';
import ShipperMyOrders from './pages/admin/ShipperMyOrders.jsx';
import RequireAdmin from './components/admin/RequireAdmin.jsx';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.add('theme-standard');
    return () => {
      document.body.classList.remove('theme-standard');
    };
  }, []);

  return (
    <div className="App">
      {!isAdminRoute && <Header />}
      <main className={isAdminRoute ? 'bg-light' : ''}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/foods/:id" element={<ProductDetail />} />
          <Route path="/combos/:id" element={<ComboDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="/payment-failed" element={<PaymentFailedPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={(
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            )}
          >
            <Route index element={
              <RequireAdmin requiredPermission="Tổng quan">
                <AdminDashboard />
              </RequireAdmin>
            } />
            <Route path="branch-dashboard" element={
              <RequireAdmin requiredPermission="Tổng quan chi nhánh">
                <BranchDashboard />
              </RequireAdmin>
            } />
            <Route path="branch-orders" element={
              <RequireAdmin requiredPermission="Quản lý đơn hàng chi nhánh">
                <BranchOrders />
              </RequireAdmin>
            } />
            <Route path="branch-order-reviews" element={
              <RequireAdmin requiredPermission="Quản lý đánh giá đơn hàng chi nhánh">
                <BranchOrderReviews />
              </RequireAdmin>
            } />
            <Route path="shipper-available-orders" element={
              <RequireAdmin requiredPermission="Quản lý giao hàng">
                <ShipperAvailableOrders />
              </RequireAdmin>
            } />
            <Route path="shipper-my-orders" element={
              <RequireAdmin requiredPermission="Quản lý giao hàng">
                <ShipperMyOrders />
              </RequireAdmin>
            } />
            <Route path="products" element={
              <RequireAdmin requiredPermission="Quản lý sản phẩm">
                <ManageProducts />
              </RequireAdmin>
            } />
            <Route path="products/add" element={
              <RequireAdmin requiredPermission="Quản lý sản phẩm">
                <AddProduct />
              </RequireAdmin>
            } />
            <Route path="products/edit/:id" element={
              <RequireAdmin requiredPermission="Quản lý sản phẩm">
                <EditProduct />
              </RequireAdmin>
            } />
            <Route path="categories" element={
              <RequireAdmin requiredPermission="Quản lý danh mục">
                <ManageCategories />
              </RequireAdmin>
            } />
            <Route path="types" element={
              <RequireAdmin requiredPermission="Quản lý thể loại">
                <ManageTypes />
              </RequireAdmin>
            } />
            <Route path="orders" element={
              <RequireAdmin requiredPermission="Quản lý đơn hàng">
                <ManageOrders />
              </RequireAdmin>
            } />
            <Route path="order-reviews" element={
              <RequireAdmin requiredPermission="Quản lý đánh giá đơn hàng">
                <ManageOrderReviews />
              </RequireAdmin>
            } />
            <Route path="users" element={
              <RequireAdmin requiredPermission="Quản lý người dùng">
                <ManageUsers />
              </RequireAdmin>
            } />
            <Route path="options" element={
              <RequireAdmin requiredPermission="Quản lý tùy chọn">
                <ManageOptions />
              </RequireAdmin>
            } />
            <Route path="options/add" element={
              <RequireAdmin requiredPermission="Quản lý tùy chọn">
                <AddOption />
              </RequireAdmin>
            } />
            <Route path="options/edit/:id" element={
              <RequireAdmin requiredPermission="Quản lý tùy chọn">
                <EditOption />
              </RequireAdmin>
            } />
            <Route path="reviews" element={
              <RequireAdmin requiredPermission="Quản lý đánh giá đơn hàng">
                <ManageReviews />
              </RequireAdmin>
            } />
            <Route path="promotions" element={
              <RequireAdmin requiredPermission="Quản lý khuyến mãi">
                <ManagePromotions />
              </RequireAdmin>
            } />
            <Route path="promotions/:id" element={
              <RequireAdmin requiredPermission="Quản lý khuyến mãi">
                <PromotionDetail />
              </RequireAdmin>
            } />
            <Route path="vouchers" element={
              <RequireAdmin requiredPermission="Quản lý voucher">
                <ManageVouchers />
              </RequireAdmin>
            } />
            <Route path="banners" element={
              <RequireAdmin requiredPermission="Quản lý banner">
                <ManageBanners />
              </RequireAdmin>
            } />
            <Route path="gifts" element={
              <RequireAdmin requiredPermission="Quản lý quà tặng">
                <ManageGifts />
              </RequireAdmin>
            } />
            <Route path="combos" element={
              <RequireAdmin requiredPermission="Quản lý sản phẩm">
                <ManageCombos />
              </RequireAdmin>
            } />
            <Route path="combos/add" element={
              <RequireAdmin requiredPermission="Quản lý sản phẩm">
                <AddCombo />
              </RequireAdmin>
            } />
            <Route path="combos/edit/:id" element={
              <RequireAdmin requiredPermission="Quản lý sản phẩm">
                <EditCombo />
              </RequireAdmin>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
}

export default App;