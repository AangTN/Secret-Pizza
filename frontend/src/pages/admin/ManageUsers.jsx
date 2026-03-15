import React, { useMemo, useState, useEffect } from 'react';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import OrderDetail from '../../components/ui/OrderDetail';

import { fetchAllAccounts, fetchBranches, api } from '../../services/api';

// Server-driven users list will replace the previous mock data
const mockUsers = [];

const roleLabels = {
  customer: 'Khách hàng',
  admin: 'Quản trị viên',
  shipper: 'Shipper',
  super_admin: 'Siêu quản trị'
};

const statusLabels = {
  active: 'Hoạt động',
  block: 'Bị khóa',
};

const statusVariant = {
  active: 'tableBadgeActive',
  block: 'tableBadgeError',
};

const ManageUsers = () => {
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    matKhau: '',
    hoTen: '',
    soDienThoai: '',
    role: 'customer',
    maCoSo: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderList, setOrderList] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processingUser, setProcessingUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchAllAccounts();
        // support both shapes: { data: [...] } or [...]
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!mounted) return;
        // map server shape to UI shape used in this component
        const mapped = list.map((a) => {
          const rawRole = String(a.Role || 'CUSTOMER');
          const role = rawRole.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          const rawStatus = String(a.TrangThai || 'Active');
            // Only support 'Block' and 'Active' from API. Map any non-block value to 'active'.
            const status = String(rawStatus || '').toLowerCase() === 'block' ? 'block' : 'active';
          const totalAmount = Number(a.TongTienDonHang ?? a.tongTienDonHang ?? 0) || 0;

          return {
            id: String(a.MaTaiKhoan),
            name: a.NguoiDung?.HoTen || '—',
            email: a.Email || '—',
            phone: a.NguoiDung?.SoDienThoai || '—',
            role,
            status,
            totalOrders: a.SoLuongDonHang ?? 0,
            totalAmount,
            raw: a,
          };
        });
        setUsers(mapped);
      } catch (err) {
        console.error('load accounts error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Debounce the search input for a smoother UX
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    let mounted = true;
    async function loadBranches() {
      try {
        const res = await fetchBranches();
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!mounted) return;
        setBranches(list);
      } catch (err) {
        console.error('load branches error', err);
      }
    }
    loadBranches();
    return () => { mounted = false; };
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === 'active').length;
  const staffUsers = users.filter((user) => user.role !== 'customer').length;

  // Filter mock users by search term, role, and status selections.
  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch = normalizedSearch.length === 0
        || [user.name, user.email, user.phone].some((field) => String(field || '').toLowerCase().includes(normalizedSearch));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, roleFilter, search, statusFilter]);

  // Action handlers - per request, edit/delete/lock not enabled yet
  const handleViewOrders = async (userId) => {
    const u = users.find((x) => x.id === userId);
    const maNguoiDung = u?.raw?.NguoiDung?.MaNguoiDung;
    if (!maNguoiDung) {
      alert('Người dùng này chưa có thông tin chi tiết');
      return;
    }
    setSelectedUserName(u.name || 'Người dùng');
    setShowOrderModal(true);
    setOrderLoading(true);
    setOrderList([]);
    try {
      const res = await api.get(`/api/orders/user/${maNguoiDung}`);
      const data = res.data?.data;
      setOrderList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('load orders error', err);
      setOrderList([]);
    } finally {
      setOrderLoading(false);
    }
  };

  const handleViewDetail = async (userId) => {
    const u = users.find((x) => x.id === userId);
    const maNguoiDung = u?.raw?.NguoiDung?.MaNguoiDung;
    if (!maNguoiDung) {
      alert('Người dùng này chưa có thông tin chi tiết');
      return;
    }
    setSelectedUserName(u.name || 'Người dùng');
    setSelectedOrder(null);
    try {
      const res = await api.get(`/api/orders/user/${maNguoiDung}`);
      const data = res.data?.data;
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) {
        setSelectedOrder(null);
      } else {
        // choose most recent by NgayDat if available
        const latest = list.reduce((best, cur) => {
          const bestTime = new Date(best.NgayDat || 0).getTime();
          const curTime = new Date(cur.NgayDat || 0).getTime();
          return curTime > bestTime ? cur : best;
        }, list[0]);
        setSelectedOrder(latest);
      }
    } catch (err) {
      console.error('load order detail error', err);
      setSelectedOrder(null);
    }
  };

  // Open detail modal for a specific order - show OrderDetail modal like TrackOrderPage
  const handleOpenOrderDetail = (order) => {
    if (!order || !order.MaDonHang) return;
    setSelectedOrder(order);
    setSelectedUserName(order.TenNguoiNhan || order.TenNguoiDung || selectedUserName || 'Người dùng');
    setShowDetailModal(true);
  };

  // Print invoice - open PDF in new tab
  const handlePrintInvoice = async (order) => {
    if (!order || !order.MaDonHang) return;
    
    try {
      // Fetch full order details from API
      const res = await api.get(`/api/orders/${order.MaDonHang}`);
      const fullOrder = res.data?.data || order;
      
      // Generate PDF HTML content
      const pdfHtml = generateOrderPDF(fullOrder);
      
      // Open in new tab
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(pdfHtml);
        newWindow.document.close();
        // Auto print dialog after content loads
        newWindow.onload = () => {
          setTimeout(() => newWindow.print(), 500);
        };
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
      alert('Không thể tải chi tiết đơn hàng: ' + (err.response?.data?.message || err.message));
    }
  };

  // Generate print-friendly PDF HTML for order
  const generateOrderPDF = (order) => {
    const formatVnd = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
    const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';
    
    // Calculate latest status
    let lastStatus = 'Đang xử lý';
    if (Array.isArray(order.LichSuTrangThaiDonHang) && order.LichSuTrangThaiDonHang.length > 0) {
      const sorted = [...order.LichSuTrangThaiDonHang].sort((a, b) => 
        new Date(a.ThoiGianCapNhat || 0) - new Date(b.ThoiGianCapNhat || 0)
      );
      lastStatus = sorted[sorted.length - 1].TrangThai || lastStatus;
    }
    
    // Calculate latest payment status
    let lastPaymentStatus = 'Chưa thanh toán';
    let paymentMethod = 'Chuyển Khoản';
    if (Array.isArray(order.ThanhToan) && order.ThanhToan.length > 0) {
      const sorted = [...order.ThanhToan].sort((a, b) => 
        new Date(a.ThoiGian || 0) - new Date(b.ThoiGian || 0)
      );
      const latest = sorted[sorted.length - 1];
      lastPaymentStatus = latest.TrangThai || lastPaymentStatus;
      paymentMethod = latest.PhuongThuc || paymentMethod;
    }

    // Build item details with full information
    const chiTietHTML = Array.isArray(order.ChiTietDonHang) ? order.ChiTietDonHang.map(item => {
      let tenMon = '—';
      let size = '';
      let deBanh = '';
      
      // Get item name based on type
      if (item.Loai === 'SP' && item.BienTheMonAn?.MonAn) {
        tenMon = item.BienTheMonAn.MonAn.TenMonAn || '—';
        size = item.BienTheMonAn?.Size?.TenSize ? ` (${item.BienTheMonAn.Size.TenSize})` : '';
        deBanh = item.DeBanh?.TenDeBanh ? ` - ${item.DeBanh.TenDeBanh}` : '';
      } else if (item.Loai === 'CB' && item.Combo) {
        tenMon = item.Combo.TenCombo || '—';
      }
      
      // Get options/toppings
      let tuyChon = '';
      if (Array.isArray(item.ChiTietDonHang_TuyChon) && item.ChiTietDonHang_TuyChon.length > 0) {
        const opts = item.ChiTietDonHang_TuyChon.map(tc => tc.TuyChon?.TenTuyChon || '').filter(Boolean).join(', ');
        if (opts) tuyChon = `<br><small style="color: #666;">+ ${opts}</small>`;
      }
      
      return `
      <tr>
        <td>${tenMon}${size}${deBanh}${tuyChon}</td>
        <td style="text-align: center;">${item.SoLuong || 0}</td>
        <td style="text-align: right;">${formatVnd(item.DonGia || 0)}</td>
        <td style="text-align: right;">${formatVnd(item.ThanhTien || 0)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="4" style="text-align: center; color: #999;">Không có chi tiết món ăn</td></tr>';

    const coSoInfo = order.CoSo ? `
      <div class="info-item"><span class="info-label">Cơ sở:</span> ${order.CoSo.TenCoSo || '—'}</div>
      <div class="info-item"><span class="info-label">SĐT cơ sở:</span> ${order.CoSo.SoDienThoai || '—'}</div>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đơn hàng #${order.MaDonHang}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; color: #333; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #dc3545; margin-bottom: 10px; font-size: 28px; text-align: center; }
    h2 { color: #333; margin: 20px 0 10px; font-size: 18px; border-bottom: 2px solid #dc3545; padding-bottom: 5px; }
    .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #ddd; }
    .info-section { margin-bottom: 15px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .info-item { margin-bottom: 10px; line-height: 1.6; }
    .info-label { font-weight: 600; color: #555; display: inline-block; min-width: 130px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: #dc3545; color: white; padding: 10px; text-align: left; font-weight: 600; font-size: 13px; }
    td { padding: 10px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
    tr:nth-child(even) { background: #f9f9f9; }
    .total-section { margin-top: 15px; padding: 15px; background: #f8f9fa; border-left: 4px solid #dc3545; border-radius: 4px; }
    .total-row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 15px; }
    .total-row.grand { font-size: 20px; font-weight: bold; color: #dc3545; margin-top: 12px; padding-top: 12px; border-top: 2px solid #dc3545; }
    .payment-info { background: #fff3cd; padding: 12px; border-radius: 4px; border-left: 4px solid #ffc107; margin: 15px 0; }
    .footer { margin-top: 25px; padding-top: 15px; border-top: 2px solid #ddd; text-align: center; color: #999; font-size: 13px; }
    @media print {
      body { padding: 10px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍕 HÓA ĐƠN ĐẶT HÀNG</h1>
      <p style="color: #666; font-size: 18px; margin-top: 8px;">Mã đơn hàng: <strong>#${order.MaDonHang}</strong></p>
      <p style="color: #666; margin-top: 5px;">Ngày đặt: <strong>${formatDate(order.NgayDat)}</strong></p>
    </div>

    <div class="info-section">
      <h2>Thông tin cơ sở</h2>
      <div>
        ${coSoInfo}
      </div>
    </div>

    <div class="info-section">
      <h2>Thông tin khách hàng</h2>
      <div>
        <div class="info-item"><span class="info-label">Họ tên:</span> ${order.TenNguoiNhan || '—'}</div>
        <div class="info-item"><span class="info-label">Số điện thoại:</span> ${order.SoDienThoaiGiaoHang || '—'}</div>
        <div class="info-item"><span class="info-label">Địa chỉ:</span> ${`${order.SoNhaDuongGiaoHang || ''}, ${order.PhuongXaGiaoHang || ''}, ${order.QuanHuyenGiaoHang || ''}, ${order.ThanhPhoGiaoHang || ''}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',') || '—'}</div>
        ${order.GhiChu ? `<div class="info-item"><span class="info-label">Ghi chú:</span> ${order.GhiChu}</div>` : ''}
      </div>
    </div>

    <h2>Chi tiết đơn hàng</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 50%;">Món ăn</th>
          <th style="text-align: center; width: 12%;">Số lượng</th>
          <th style="text-align: right; width: 19%;">Đơn giá</th>
          <th style="text-align: right; width: 19%;">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${chiTietHTML}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <span>Tiền trước giảm giá:</span>
        <span>${formatVnd(order.TienTruocGiamGia || 0)}</span>
      </div>
      ${(order.TienGiamGia && Number(order.TienGiamGia) > 0) ? `
      <div class="total-row">
        <span>Giảm giá:</span>
        <span>-${formatVnd(order.TienGiamGia)}</span>
      </div>` : ''}
      <div class="total-row">
        <span>Phí vận chuyển:</span>
        <span>${formatVnd(order.PhiShip || 0)}</span>
      </div>
      <div class="total-row grand">
        <span>TỔNG CỘNG:</span>
        <span>${formatVnd(order.TongTien)}</span>
      </div>
    </div>

    <div class="payment-info">
      <strong>Phương thức thanh toán:</strong> ${paymentMethod}
    </div>

    <div class="footer">
      <p style="font-weight: 600; color: #dc3545; margin-bottom: 8px;">Cảm ơn quý khách đã đặt hàng!</p>
      <p>Hotline: ${order.CoSo?.SoDienThoai || '1900xxxx'}</p>
      <p style="margin-top: 15px; font-size: 12px;">In lúc: ${new Date().toLocaleString('vi-VN')}</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleToggleLock = (userId) => {
    // Toggle lock/unlock by calling backend APIs: POST /api/users/:MaNguoiDung/block or /unblock
    (async () => {
      if (processingUser) return; // prevent concurrent actions
      const u = users.find((x) => x.id === userId);
      const maNguoiDung = u?.raw?.NguoiDung?.MaNguoiDung;
      if (!maNguoiDung) {
        alert('Người dùng này chưa có thông tin chi tiết để thực hiện thao tác.');
        return;
      }

      const wantToUnblock = u.status === 'block';
      const action = wantToUnblock ? 'unblock' : 'block';
      const optimisticStatus = wantToUnblock ? 'active' : 'block';

      const prevStatus = u.status;
      // optimistic UI
      setUsers((prev) => prev.map((it) => (it.id === userId ? { ...it, status: optimisticStatus } : it)));
      setProcessingUser(userId);

      try {
        const res = await api.post(`/api/users/${maNguoiDung}/${action}`);
        // Expect updated account in res.data.data
        const updated = res.data?.data || res.data;
        const trangThai = updated?.TrangThai || updated?.TrangThai || (wantToUnblock ? 'Active' : 'Block');
        const mappedStatus = String(trangThai || '').toLowerCase() === 'block' ? 'block' : 'active';

        setUsers((prev) => prev.map((it) => (it.id === userId ? { ...it, status: mappedStatus, raw: { ...it.raw, TaiKhoan: updated } } : it)));
      } catch (err) {
        console.error('Failed to toggle lock:', err);
        // revert optimistic change
        setUsers((prev) => prev.map((it) => (it.id === userId ? { ...it, status: prevStatus } : it)));
        alert('Thao tác không thành công: ' + (err.response?.data?.message || err.message));
      } finally {
        setProcessingUser(null);
      }
    })();
  };

  // Add User modal handlers (UI-only)
  const handleNewUserChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  const validateNewUser = () => {
    const errs = {};
    if (!newUser.email || String(newUser.email).trim() === '') errs.email = 'Email là bắt buộc';
    if (!newUser.matKhau || String(newUser.matKhau).trim() === '') errs.matKhau = 'Mật khẩu là bắt buộc';
    if (!newUser.hoTen || String(newUser.hoTen).trim() === '') errs.hoTen = 'Họ tên là bắt buộc';
    if (!newUser.soDienThoai || String(newUser.soDienThoai).trim() === '') errs.soDienThoai = 'Số điện thoại là bắt buộc';
    if (!newUser.role || String(newUser.role).trim() === '') errs.role = 'Vai trò là bắt buộc';
    const roleNorm = String(newUser.role).toLowerCase();
    if ((roleNorm === 'admin' || roleNorm === 'shipper') && !newUser.maCoSo) {
      errs.maCoSo = 'Cơ sở là bắt buộc cho Quản trị viên và Shipper';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateNewUser()) return;

    try {
      // Map role to proper case for backend
      const roleMap = {
        'customer': 'CUSTOMER',
        'shipper': 'SHIPPER',
        'admin': 'ADMIN',
        'super_admin': 'SUPER_ADMIN'
      };

      const payload = {
        Email: newUser.email,
        MatKhau: newUser.matKhau,
        HoTen: newUser.hoTen,
        SoDienThoai: newUser.soDienThoai,
        Role: roleMap[newUser.role] || 'CUSTOMER',
      };

      // Add MaCoSo for ADMIN and SHIPPER roles
      if ((newUser.role === 'admin' || newUser.role === 'shipper') && newUser.maCoSo) {
        payload.MaCoSo = Number(newUser.maCoSo);
      }

      // Call API to create user
      const res = await api.post('/api/users', payload);
      const created = res.data?.data;

      if (!created) {
        throw new Error('Không nhận được dữ liệu người dùng mới');
      }

      // Map created user to UI format
      const rawRole = String(created.taiKhoan?.Role || 'User');
      const role = rawRole.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      
      const userItem = {
        id: String(created.taiKhoan?.MaTaiKhoan || Date.now()),
        name: created.nguoiDung?.HoTen || newUser.hoTen,
        email: created.taiKhoan?.Email || newUser.email,
        phone: created.nguoiDung?.SoDienThoai || newUser.soDienThoai,
        role,
        status: 'active',
        totalOrders: 0,
        totalAmount: 0,
        raw: {
          MaTaiKhoan: created.taiKhoan?.MaTaiKhoan,
          Email: created.taiKhoan?.Email,
          Role: created.taiKhoan?.Role,
          TrangThai: created.taiKhoan?.TrangThai || 'Active',
          NguoiDung: {
            MaNguoiDung: created.nguoiDung?.MaNguoiDung,
            HoTen: created.nguoiDung?.HoTen,
            SoDienThoai: created.nguoiDung?.SoDienThoai,
          }
        },
      };

      setUsers((prev) => [userItem, ...prev]);
      setShowAddModal(false);
      setNewUser({ email: '', matKhau: '', hoTen: '', soDienThoai: '', role: 'customer', maCoSo: '' });
      alert('Tạo người dùng thành công!');
    } catch (err) {
      console.error('Failed to create user:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Không thể tạo người dùng';
      alert('Lỗi: ' + errorMsg);
    }
  };

  return (
    <div className="admin-animate-fade-in">
      {/* Header Section */}
      <div className={`${cardStyles.cardPremium} mb-4`}>
        <div className={cardStyles.cardHeaderPremium}>
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <div>
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Quản lý người dùng</h2>
              <p className={cardStyles.cardSubtitle}>Tổng số: {totalUsers} tài khoản • {activeUsers} đang hoạt động • {staffUsers} nhân sự</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className={formStyles.formSearch}>
                <span className={formStyles.formSearchIcon}>🔍</span>
                <input
                  type="search"
                  className={`${formStyles.formInput} ${formStyles.formSearchInput}`}
                  placeholder="Tìm theo tên, email, số điện thoại..."
                  style={{ minWidth: 280 }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className={formStyles.formSearchClear}
                    onClick={() => { setSearchTerm(''); setSearch(''); }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                className={`${formStyles.formSelect}`}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                style={{ minWidth: 150 }}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="customer">Khách hàng</option>
                <option value="shipper">Shipper</option>
                <option value="admin">Quản trị viên</option>
                <option value="super_admin">Siêu quản trị</option>
              </select>
              <select
                className={`${formStyles.formSelect}`}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={{ minWidth: 150 }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="block">Bị khóa</option>
              </select>
              <button
                className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge}`}
                onClick={() => { setShowAddModal(true); setFormErrors({}); }}
              >
                <span>+</span> Thêm người dùng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal (UI only) */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 720, background: '#fff', borderRadius: 8, padding: 20 }}>
            <h4 style={{ marginBottom: 8 }}>Thêm người dùng</h4>
            <form onSubmit={handleCreateUser}>
              <div className="mb-2">
                <label className="form-label">Email *</label>
                <input type="email" className="form-control" value={newUser.email} onChange={(e) => handleNewUserChange('email', e.target.value)} />
                {formErrors.email && <div className="text-danger small">{formErrors.email}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Mật khẩu *</label>
                <input type="password" className="form-control" value={newUser.matKhau} onChange={(e) => handleNewUserChange('matKhau', e.target.value)} />
                {formErrors.matKhau && <div className="text-danger small">{formErrors.matKhau}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Họ tên *</label>
                <input type="text" className="form-control" value={newUser.hoTen} onChange={(e) => handleNewUserChange('hoTen', e.target.value)} />
                {formErrors.hoTen && <div className="text-danger small">{formErrors.hoTen}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Số điện thoại *</label>
                <input type="text" className="form-control" value={newUser.soDienThoai} onChange={(e) => handleNewUserChange('soDienThoai', e.target.value)} />
                {formErrors.soDienThoai && <div className="text-danger small">{formErrors.soDienThoai}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Vai trò *</label>
                <select className="form-select" value={newUser.role} onChange={(e) => handleNewUserChange('role', e.target.value)}>
                  <option value="customer">Khách hàng</option>
                  <option value="shipper">Shipper</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="super_admin">Siêu quản trị</option>
                </select>
                {formErrors.role && <div className="text-danger small">{formErrors.role}</div>}
              </div>
              {(newUser.role === 'admin' || newUser.role === 'shipper') && (
                <div className="mb-3">
                  <label className="form-label">Cơ sở *</label>
                  <select className="form-select" value={newUser.maCoSo} onChange={(e) => handleNewUserChange('maCoSo', e.target.value)}>
                    <option value="">-- Chọn cơ sở --</option>
                    {branches.map((b) => (
                      <option key={b.MaCoSo} value={b.MaCoSo}>{b.TenCoSo}</option>
                    ))}
                  </select>
                  {formErrors.maCoSo && <div className="text-danger small">{formErrors.maCoSo}</div>}
                </div>
              )}
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`} onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className={`${buttonStyles.button} ${buttonStyles.buttonPrimary}`}>Tạo người dùng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className={`${styles.tableContainerPremium} ${styles.tableAnimateIn}`}>
          <div className={styles.tableResponsive}>
            <table className={`${styles.table} ${styles.tableRowHover}`}>
              <thead className={styles.tableHeaderPrimary}>
                <tr>
                  <th style={{ width: 120 }}>
                    <div className={styles.tableSortable}>
                      <span>Mã người dùng</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Họ tên</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Email</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Số điện thoại</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Vai trò</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Đơn đã đặt</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Tổng tiền đơn hàng</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Trạng thái</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  
                  <th style={{ width: 200 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className={styles.tableEmpty}>
                        <div className={styles.tableEmptyIcon}>👥</div>
                        <div className={styles.tableEmptyTitle}>Không có người dùng</div>
                        <div className={styles.tableEmptyDescription}>
                          {search || roleFilter !== 'all' || statusFilter !== 'all' 
                            ? 'Chưa có người dùng phù hợp với bộ lọc được chọn.' 
                            : 'Chưa có dữ liệu người dùng.'}
                        </div>
                        <button 
                          className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                          onClick={() => {
                            setSearch('');
                            setRoleFilter('all');
                            setStatusFilter('all');
                          }}
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    </td>
                  </tr>
                    ) : (
                      filteredUsers.map((user) => (
                    <tr key={user.id} className="admin-animate-slide-up">
                      <td className={styles.tableCellBold}>
                        <span className="badge bg-light text-dark border">
                          {user.id}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-start gap-3">
                          <div className="flex-shrink-0">
                            <div 
                              className="rounded-2 bg-gradient d-flex align-items-center justify-content-center"
                              style={{ 
                                width: 48, 
                                height: 48,
                              background: user.role === 'super_admin'
                                ? 'linear-gradient(135deg, #8e44ad 0%, #bb8fce 100%)'
                                : user.role === 'admin'
                                ? 'linear-gradient(135deg, #ff4d4f 0%, #ff6b6b 100%)'
                                : user.role === 'shipper'
                                ? 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)'
                                : 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                              }}
                            >
                              <span style={{ fontSize: 20 }}>
                                  {user.role === 'super_admin' ? '👑' : user.role === 'admin' ? '🛠️' : user.role === 'shipper' ? '🚚' : '👤'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className={`${styles.tableCellBold} mb-1`}>{user.name}</div>
                            <small className={styles.tableCellMuted}>ID: {user.id}</small>
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCellText}>{user.email}</td>
                      <td className={styles.tableCellMuted}>{user.phone}</td>
                      <td>
                        <span className={`${styles.tableBadge} ${
                          user.role === 'super_admin' ? styles.tableBadgeWarning :
                          user.role === 'admin' ? styles.tableBadgeWarning :
                          user.role === 'shipper' ? styles.tableBadgeInfo :
                          styles.tableBadgeActive
                        }`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className={styles.tableCellSuccess}>{user.totalOrders}</td>
                      <td className={styles.tableCellMuted}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user.totalAmount || 0)}
                      </td>
                      <td>
                        <span className={`${styles.tableBadge} ${user.status === 'active' ? styles.tableBadgeActive : styles.tableBadgeError}`}>
                          {statusLabels[user.status] || user.status}
                        </span>
                      </td>
                     
                      <td>
                        <div className={styles.tableActions}>
                          <button 
                            className={`${styles.tableAction} ${styles.tableActionSuccess}`}
                            title="Xem đơn hàng"
                            onClick={() => handleViewOrders(user.id)}
                          >
                            📦
                          </button>
                          <button 
                            className={`${styles.tableAction} ${user.status === 'active' ? styles.tableActionSuccess : styles.tableActionDanger}`}
                            title={user.status === 'block' ? 'Mở khóa' : 'Khóa tài khoản'}
                            onClick={() => handleToggleLock(user.id)}
                            disabled={processingUser === user.id}
                          >
                            {user.status === 'block' ? '🔓' : '🔒'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer with Pagination */}
          {filteredUsers.length > 0 && (
            <div className={styles.tablePagination}>
              <div className={styles.tablePaginationInfo}>
                Hiển thị {filteredUsers.length} trên {totalUsers} người dùng
              </div>
              <div className={styles.tablePaginationControls}>
                <button 
                  className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`}
                  disabled
                >
                  ←
                </button>
                <span className="px-3 py-1">
                  <strong>1</strong> / 1
                </span>
                <button 
                  className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`}
                  disabled
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>

      {/* Quick Stats */}
      <div className="row g-3 mt-4">
        <div className="col-md-3">
          <div className={`${cardStyles.card} ${cardStyles.cardAnimateHover}`}>
            <div className={cardStyles.cardBody}>
              <div className={cardStyles.cardStats}>
                <div>
                  <div className={cardStyles.cardStatValue}>{totalUsers}</div>
                  <div className={cardStyles.cardStatLabel}>Tổng tài khoản</div>
                </div>
                <div className={`${cardStyles.cardStatIcon} ${cardStyles.cardStatIconPrimary}`}>
                  👥
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className={`${cardStyles.card} ${cardStyles.cardAnimateHover}`}>
            <div className={cardStyles.cardBody}>
              <div className={cardStyles.cardStats}>
                <div>
                  <div className={cardStyles.cardStatValue}>{activeUsers}</div>
                  <div className={cardStyles.cardStatLabel}>Đang hoạt động</div>
                </div>
                <div className={`${cardStyles.cardStatIcon} ${cardStyles.cardStatIconSuccess}`}>
                  ✅
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className={`${cardStyles.card} ${cardStyles.cardAnimateHover}`}>
            <div className={cardStyles.cardBody}>
              <div className={cardStyles.cardStats}>
                <div>
                  <div className={cardStyles.cardStatValue}>{staffUsers}</div>
                  <div className={cardStyles.cardStatLabel}>Nhân sự nội bộ</div>
                </div>
                <div className={`${cardStyles.cardStatIcon} ${cardStyles.cardStatIconInfo}`}>
                  👨‍💼
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className={`${cardStyles.card} ${cardStyles.cardAnimateHover}`}>
            <div className={cardStyles.cardBody}>
              <div className={cardStyles.cardStats}>
                <div>
                  <div className={cardStyles.cardStatValue}>{filteredUsers.length}</div>
                  <div className={cardStyles.cardStatLabel}>Kết quả tìm kiếm</div>
                </div>
                <div className={`${cardStyles.cardStatIcon} ${cardStyles.cardStatIconWarning}`}>
                  🔍
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowOrderModal(false)}>
          <div style={{ width: '90%', maxWidth: 1200, maxHeight: '90vh', background: '#fff', borderRadius: 8, padding: 24, overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0 }}>Đơn hàng của {selectedUserName}</h4>
              <button type="button" className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`} onClick={() => setShowOrderModal(false)}>Đóng</button>
            </div>
            {orderLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>Đang tải...</div>
            ) : orderList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Người dùng này chưa có đơn hàng nào</div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={`${styles.table} ${styles.tableRowHover}`}>
                  <thead className={styles.tableHeaderPrimary}>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Ngày đặt</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                      <th>Trạng thái thanh toán</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderList.map((order) => {
                      // Determine latest order status by newest timestamp in LichSuTrangThaiDonHang
                      let lastStatus = 'Chưa xác định';
                      if (Array.isArray(order.LichSuTrangThaiDonHang) && order.LichSuTrangThaiDonHang.length > 0) {
                        const latest = order.LichSuTrangThaiDonHang.reduce((best, cur) => {
                          const bestTime = new Date(best.ThoiGianCapNhat || best.ThoiGian || 0).getTime();
                          const curTime = new Date(cur.ThoiGianCapNhat || cur.ThoiGian || 0).getTime();
                          return curTime > bestTime ? cur : best;
                        }, order.LichSuTrangThaiDonHang[0]);
                        lastStatus = latest.TrangThai || lastStatus;
                      }

                      // Determine latest payment status by newest timestamp in ThanhToan
                      let lastPaymentStatus = 'Chưa thanh toán';
                      if (Array.isArray(order.ThanhToan) && order.ThanhToan.length > 0) {
                        const latestPay = order.ThanhToan.reduce((best, cur) => {
                          const bestTime = new Date(best.ThoiGian || best.ThoiGianCapNhat || 0).getTime();
                          const curTime = new Date(cur.ThoiGian || cur.ThoiGianCapNhat || 0).getTime();
                          return curTime > bestTime ? cur : best;
                        }, order.ThanhToan[0]);
                        lastPaymentStatus = latestPay.TrangThai || lastPaymentStatus;
                      }

                      return (
                        <tr key={order.MaDonHang}>
                          <td>{order.MaDonHang}</td>
                          <td>{new Date(order.NgayDat).toLocaleDateString('vi-VN')}</td>
                          <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.TongTien || 0)}</td>
                          <td><span className={styles.tableBadge}>{lastStatus}</span></td>
                          <td><span className={styles.tableBadge}>{lastPaymentStatus}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`}
                                onClick={() => handleOpenOrderDetail(order)}
                              >
                                Xem chi tiết
                              </button>
                              <button
                                className={`${buttonStyles.button} ${buttonStyles.buttonSecondary} ${buttonStyles.buttonSmall}`}
                                onClick={() => handlePrintInvoice(order)}
                              >
                                In hóa đơn
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Detail Modal - using OrderDetail component like TrackOrderPage */}
      <OrderDetail 
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        orderId={selectedOrder?.MaDonHang}
        initialData={null}
        modalZIndex={1400}
        isAdmin={true}
      />
    </div>
  );
};

export default ManageUsers;
