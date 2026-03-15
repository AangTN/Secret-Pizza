import React, { useMemo, useState, useEffect } from 'react';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import { AdminResponsiveContainer } from '../../components/admin/AdminResponsiveContainer';
import { BusinessCard } from '../../components/admin/AdminTableCard';
import { api } from '../../services/api';

const ManageVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedVoucherToGift, setSelectedVoucherToGift] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    MoTa: '',
    LoaiGiamGia: 'AMOUNT',
    GiaTri: '',
    DieuKienApDung: '',
    NgayBatDau: '',
    NgayKetThuc: '',
    SoLuong: '',
    TrangThai: 'Active'
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadVouchers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/vouchers');
      const list = res.data?.data || [];
      setVouchers(list);
    } catch (err) {
      console.error('Failed to load vouchers:', err);
      alert('Không thể tải danh sách voucher: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const totalVouchers = vouchers.length;
  const activeVouchers = vouchers.filter(v => v.TrangThai === 'Active').length;

  const filteredVouchers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return vouchers.filter((voucher) => {
      const matchesSearch = normalizedSearch.length === 0
        || [voucher.code, voucher.MoTa].some((field) => String(field || '').toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === 'all' || voucher.TrangThai === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vouchers, search, statusFilter]);

  const formatDiscount = (voucher) => {
    if (voucher.LoaiGiamGia === 'PERCENT') {
      return `${voucher.GiaTri}%`;
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.GiaTri);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const getVoucherStatus = (voucher) => {
    const now = new Date();
    const endDate = voucher.NgayKetThuc ? new Date(voucher.NgayKetThuc) : null;
    const startDate = voucher.NgayBatDau ? new Date(voucher.NgayBatDau) : null;

    // Priority 1: Check if expired
    if (endDate && now > endDate) {
      return { text: 'Ngoài hạn', variant: 'error' };
    }

    // Priority 2: Check if not started yet
    if (startDate && now < startDate) {
      return { text: 'Chưa bắt đầu', variant: 'pending' };
    }

    // Priority 3: Check if out of stock
    const remaining = (voucher.SoLuong || 0) - (voucher.usedCount || 0);
    if (remaining <= 0) {
      return { text: 'Hết số lượng', variant: 'error' };
    }

    // Priority 4: Check if inactive/blocked
    if (voucher.TrangThai !== 'Active') {
      return { text: 'Bị khóa', variant: 'error' };
    }

    // Default: Active
    return { text: 'Hoạt động', variant: 'active' };
  };

  const handleOpenAddModal = () => {
    setEditingVoucher(null);
    setFormData({
      code: '',
      MoTa: '',
      LoaiGiamGia: 'AMOUNT',
      GiaTri: '',
      DieuKienApDung: '',
      NgayBatDau: '',
      NgayKetThuc: '',
      SoLuong: '',
      TrangThai: 'Active'
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleOpenEditModal = (voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      code: voucher.code,
      MoTa: voucher.MoTa || '',
      LoaiGiamGia: voucher.LoaiGiamGia || 'AMOUNT',
      GiaTri: String(voucher.GiaTri || ''),
      DieuKienApDung: String(voucher.DieuKienApDung || ''),
      NgayBatDau: voucher.NgayBatDau ? new Date(voucher.NgayBatDau).toISOString().split('T')[0] : '',
      NgayKetThuc: voucher.NgayKetThuc ? new Date(voucher.NgayKetThuc).toISOString().split('T')[0] : '',
      SoLuong: String(voucher.SoLuong || ''),
      TrangThai: voucher.TrangThai || 'Active'
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenGiftModal = async (voucher) => {
    setSelectedVoucherToGift(voucher);
    setShowGiftModal(true);
    
    // Load users
    setLoadingUsers(true);
    try {
      const res = await api.get('/api/users/admin/all-accounts');
      const userList = res.data?.data || [];
      // Sort by TongTienDonHang descending
      const sortedUsers = userList.sort((a, b) => (b.TongTienDonHang || 0) - (a.TongTienDonHang || 0));
      setUsers(sortedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      alert('Không thể tải danh sách người dùng: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCloseGiftModal = () => {
    setShowGiftModal(false);
    setSelectedVoucherToGift(null);
    setUsers([]);
    setSelectedUserIds([]);
    setSelectAllChecked(false);
    setGiftMessage('');
  };

  const remainingForVoucher = (voucher) => {
    if (!voucher) return 0;
    return Math.max(0, (voucher.SoLuong || 0) - (voucher.usedCount || 0));
  };

  const isVoucherValidForGift = (voucher) => {
    if (!voucher) return false;
    
    // Check status is Active
    if (voucher.TrangThai !== 'Active') return false;
    
    // Check usedCount < SoLuong
    const remaining = remainingForVoucher(voucher);
    if (remaining <= 0) return false;
    
    // Check date range is valid
    const now = new Date();
    const startDate = voucher.NgayBatDau ? new Date(voucher.NgayBatDau) : null;
    const endDate = voucher.NgayKetThuc ? new Date(voucher.NgayKetThuc) : null;
    
    if (startDate && now < startDate) return false; // Not started
    if (endDate && now > endDate) return false; // Expired
    
    return true;
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      // prevent selecting more than remaining vouchers
      const remain = remainingForVoucher(selectedVoucherToGift);
      if (prev.length >= remain) return prev;
      return [...prev, userId];
    });
  };

  const handleSelectAll = () => {
    const remain = remainingForVoucher(selectedVoucherToGift);
    if (selectAllChecked) {
      setSelectedUserIds([]);
      setSelectAllChecked(false);
      return;
    }
    // select up to `remain` users from the sorted list
    const ids = users.slice(0, remain).map(u => u.MaTaiKhoan);
    setSelectedUserIds(ids);
    setSelectAllChecked(true);
  };

  const handleGiftSelected = async () => {
    if (!selectedVoucherToGift) return alert('Không có voucher để tặng');
    if (selectedUserIds.length === 0) return alert('Vui lòng chọn ít nhất 1 người nhận');
    
    // Validate voucher before gifting
    if (!isVoucherValidForGift(selectedVoucherToGift)) {
      return alert('Voucher không hợp lệ để tặng. Vui lòng kiểm tra trạng thái, số lượng và thời gian.');
    }

    if (!confirm(`Bạn có chắc muốn tặng voucher ${selectedVoucherToGift.code} cho ${selectedUserIds.length} người?`)) return;

    try {
      // Payload: { voucherCode, userIds, message }
      await api.post('/api/vouchers/gift', {
        voucherCode: selectedVoucherToGift.code,
        userIds: selectedUserIds,
        message: giftMessage.trim() || 'Chúc bạn có trải nghiệm tuyệt vời!'
      });
      alert('Đã gửi voucher qua email thành công!');
      handleCloseGiftModal();
      loadVouchers();
    } catch (err) {
      console.error('Failed to gift vouchers:', err);
      alert('Không thể tặng voucher: ' + (err.response?.data?.message || err.message));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.code || formData.code.trim() === '') errors.code = 'Mã voucher là bắt buộc';
    if (!formData.MoTa || formData.MoTa.trim() === '') errors.MoTa = 'Mô tả là bắt buộc';
    if (!formData.GiaTri || formData.GiaTri.trim() === '') errors.GiaTri = 'Giá trị giảm là bắt buộc';
    if (!formData.DieuKienApDung || formData.DieuKienApDung.trim() === '') errors.DieuKienApDung = 'Điều kiện áp dụng là bắt buộc';
    if (!formData.NgayBatDau) errors.NgayBatDau = 'Ngày bắt đầu là bắt buộc';
    if (!formData.NgayKetThuc) errors.NgayKetThuc = 'Ngày kết thúc là bắt buộc';
    if (!formData.SoLuong || formData.SoLuong.trim() === '') errors.SoLuong = 'Số lượng là bắt buộc';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        code: formData.code.trim(),
        MoTa: formData.MoTa.trim(),
        LoaiGiamGia: formData.LoaiGiamGia,
        GiaTri: Number(formData.GiaTri),
        DieuKienApDung: Number(formData.DieuKienApDung),
        NgayBatDau: new Date(formData.NgayBatDau).toISOString(),
        NgayKetThuc: new Date(formData.NgayKetThuc).toISOString(),
        SoLuong: Number(formData.SoLuong),
        TrangThai: formData.TrangThai
      };

      if (editingVoucher) {
        await api.put(`/api/vouchers/${editingVoucher.code}`, payload);
        alert('Cập nhật voucher thành công!');
      } else {
        await api.post('/api/vouchers', payload);
        alert('Thêm voucher thành công!');
      }

      setShowAddModal(false);
      loadVouchers();
    } catch (err) {
      console.error('Failed to save voucher:', err);
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleStatus = async (voucher) => {
    const status = getVoucherStatus(voucher);
    
    // Only allow toggle if voucher is not expired and not out of stock
    if (status.text === 'Ngoài hạn' || status.text === 'Hết số lượng') {
      alert(`Không thể thay đổi trạng thái voucher ${status.text.toLowerCase()}`);
      return;
    }

    const newStatus = voucher.TrangThai === 'Active' ? 'Inactive' : 'Active';
    const action = newStatus === 'Active' ? 'mở khóa' : 'khóa';
    
    if (!confirm(`Bạn có chắc muốn ${action} voucher "${voucher.code}"?`)) return;

    try {
      await api.patch(`/api/vouchers/${voucher.code}/status`, { TrangThai: newStatus });
      alert(`${action === 'mở khóa' ? 'Mở khóa' : 'Khóa'} voucher thành công!`);
      loadVouchers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Không thể thay đổi trạng thái: ' + (err.response?.data?.message || err.message));
    }
  };

  const cardComponent = (
    <div className={styles.adminTableCards}>
      {filteredVouchers.map((voucher, index) => (
        <BusinessCard
          key={voucher.code}
          data={voucher}
          type="voucher"
          onEdit={() => handleOpenEditModal(voucher)}
          index={index}
          animate={true}
        />
      ))}
    </div>
  );

  return (
    <div className="admin-animate-fade-in">
      {/* Header Section */}
      <div className={`${cardStyles.cardPremium} mb-4`}>
        <div className={cardStyles.cardHeaderPremium}>
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <div>
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Quản lý Voucher</h2>
              <p className={cardStyles.cardSubtitle}>
                Tổng số: {totalVouchers} voucher • {activeVouchers} đang hoạt động
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className={formStyles.formSearch}>
                <span className={formStyles.formSearchIcon}>🔍</span>
                <input
                  type="search"
                  className={`${formStyles.formInput} ${formStyles.formSearchInput}`}
                  placeholder="Tìm theo mã, mô tả..."
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ minWidth: 150 }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Active">Đang hoạt động</option>
                <option value="Inactive">Không hoạt động</option>
              </select>
              <button
                className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge}`}
                onClick={handleOpenAddModal}
              >
                <span>+</span> Thêm voucher
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 720, background: '#fff', borderRadius: 8, padding: 20, maxHeight: '90vh', overflow: 'auto' }}>
            <h4 style={{ marginBottom: 16 }}>{editingVoucher ? 'Chỉnh sửa voucher' : 'Thêm voucher mới'}</h4>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Mã voucher *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.code}
                  onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                  disabled={!!editingVoucher}
                />
                {formErrors.code && <div className="text-danger small">{formErrors.code}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label">Mô tả *</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.MoTa}
                  onChange={(e) => handleFormChange('MoTa', e.target.value)}
                />
                {formErrors.MoTa && <div className="text-danger small">{formErrors.MoTa}</div>}
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Loại giảm giá *</label>
                  <select
                    className="form-select"
                    value={formData.LoaiGiamGia}
                    onChange={(e) => handleFormChange('LoaiGiamGia', e.target.value)}
                  >
                    <option value="AMOUNT">Số tiền cố định</option>
                    <option value="PERCENT">Phần trăm</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Giá trị giảm *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.GiaTri}
                    onChange={(e) => handleFormChange('GiaTri', e.target.value)}
                    placeholder={formData.LoaiGiamGia === 'PERCENT' ? '0-100' : 'VNĐ'}
                  />
                  {formErrors.GiaTri && <div className="text-danger small">{formErrors.GiaTri}</div>}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Điều kiện áp dụng (VNĐ) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.DieuKienApDung}
                  onChange={(e) => handleFormChange('DieuKienApDung', e.target.value)}
                  placeholder="Giá trị đơn hàng tối thiểu"
                />
                {formErrors.DieuKienApDung && <div className="text-danger small">{formErrors.DieuKienApDung}</div>}
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.NgayBatDau}
                    onChange={(e) => handleFormChange('NgayBatDau', e.target.value)}
                  />
                  {formErrors.NgayBatDau && <div className="text-danger small">{formErrors.NgayBatDau}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Ngày kết thúc *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.NgayKetThuc}
                    onChange={(e) => handleFormChange('NgayKetThuc', e.target.value)}
                  />
                  {formErrors.NgayKetThuc && <div className="text-danger small">{formErrors.NgayKetThuc}</div>}
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Số lượng *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.SoLuong}
                    onChange={(e) => handleFormChange('SoLuong', e.target.value)}
                    placeholder="Số voucher khả dụng"
                  />
                  {formErrors.SoLuong && <div className="text-danger small">{formErrors.SoLuong}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Trạng thái *</label>
                  <select
                    className="form-select"
                    value={formData.TrangThai}
                    onChange={(e) => handleFormChange('TrangThai', e.target.value)}
                  >
                    <option value="Active">Đang hoạt động</option>
                    <option value="Inactive">Không hoạt động</option>
                  </select>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={`${buttonStyles.button} ${buttonStyles.buttonPrimary}`}>
                  {editingVoucher ? 'Cập nhật' : 'Tạo voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Section */}
      <AdminResponsiveContainer 
        data={filteredVouchers}
        loading={loading}
        empty={filteredVouchers.length === 0}
        cardComponent={cardComponent}
        className="vouchers-responsive-container"
      >
        <div className={`${styles.tableContainerPremium} ${styles.tableAnimateIn}`}>
          <div className={styles.tableResponsive}>
            <table className={`${styles.table} ${styles.tableRowHover}`}>
              <thead className={styles.tableHeaderPrimary}>
                <tr>
                  <th style={{ width: 120 }}>Mã voucher</th>
                  <th>Mô tả</th>
                  <th style={{ width: 120 }}>Loại</th>
                  <th style={{ width: 100 }}>Giảm giá</th>
                  <th style={{ width: 140 }}>Đơn tối thiểu</th>
                  <th style={{ width: 100 }}>Số lượng</th>
                  <th style={{ width: 100 }}>Đã dùng</th>
                  <th style={{ width: 110 }}>Bắt đầu</th>
                  <th style={{ width: 110 }}>Kết thúc</th>
                  <th style={{ width: 120 }}>Trạng thái</th>
                  <th style={{ width: 180 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={11}>
                      <div className={styles.tableEmpty}>
                        <div className={styles.tableEmptyIcon}>🎟️</div>
                        <div className={styles.tableEmptyTitle}>Không có voucher</div>
                        <div className={styles.tableEmptyDescription}>
                          {search || statusFilter !== 'all'
                            ? 'Không tìm thấy voucher phù hợp với bộ lọc.'
                            : 'Chưa có voucher nào. Hãy thêm voucher mới.'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((voucher) => (
                    <tr key={voucher.code} className="admin-animate-slide-up">
                      <td className={styles.tableCellBold}>
                        <span className="badge bg-primary">{voucher.code}</span>
                      </td>
                      <td className={styles.tableCellText}>{voucher.MoTa}</td>
                      <td>
                        <span className={`${styles.tableBadge} ${styles.tableBadgeInfo}`}>
                          {voucher.LoaiGiamGia === 'PERCENT' ? 'Phần trăm' : 'Số tiền'}
                        </span>
                      </td>
                      <td className={styles.tableCellBold}>{formatDiscount(voucher)}</td>
                      <td className={styles.tableCellMuted}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.DieuKienApDung || 0)}
                      </td>
                      <td className={styles.tableCellSuccess}>{voucher.SoLuong}</td>
                      <td className={styles.tableCellMuted}>{voucher.usedCount || 0}</td>
                      <td className={styles.tableCellMuted}>{formatDate(voucher.NgayBatDau)}</td>
                      <td className={styles.tableCellMuted}>{formatDate(voucher.NgayKetThuc)}</td>
                      <td>
                        {(() => {
                          const status = getVoucherStatus(voucher);
                          const variantClass = status.variant === 'active' ? styles.tableBadgeActive 
                            : status.variant === 'pending' ? styles.tableBadgePending 
                            : styles.tableBadgeError;
                          return (
                            <span className={`${styles.tableBadge} ${variantClass}`}>
                              {status.text}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button
                            className={`${styles.tableAction} ${styles.tableActionInfo}`}
                            title="Chỉnh sửa"
                            onClick={() => handleOpenEditModal(voucher)}
                          >
                            ✏️
                          </button>
                          <button
                            className={`${styles.tableAction} ${styles.tableActionInfo}`}
                            title="Tặng voucher"
                            onClick={() => handleOpenGiftModal(voucher)}
                          >
                            🎁 Tặng
                          </button>
                          <button
                            className={`${styles.tableAction} ${voucher.TrangThai === 'Active' ? styles.tableActionDanger : styles.tableActionSuccess}`}
                            title={voucher.TrangThai === 'Active' ? 'Khóa' : 'Mở khóa'}
                            onClick={() => handleToggleStatus(voucher)}
                          >
                            {voucher.TrangThai === 'Active' ? '🔒' : '🔓'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredVouchers.length > 0 && (
            <div className={styles.tablePagination}>
              <div className={styles.tablePaginationInfo}>
                Hiển thị {filteredVouchers.length} trên {totalVouchers} voucher
              </div>
            </div>
          )}
        </div>
      </AdminResponsiveContainer>

      {/* Quick Stats */}
      <div className="row g-3 mt-4">
        <div className="col-md-4">
          <div className={`${cardStyles.card} ${cardStyles.cardAnimateHover}`}>
            <div className={cardStyles.cardBody}>
              <div className={cardStyles.cardStats}>
                <div>
                  <div className={cardStyles.cardStatValue}>{totalVouchers}</div>
                  <div className={cardStyles.cardStatLabel}>Tổng voucher</div>
                </div>
                <div className={`${cardStyles.cardStatIcon} ${cardStyles.cardStatIconPrimary}`}>
                  🎟️
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className={`${cardStyles.card} ${cardStyles.cardAnimateHover}`}>
            <div className={cardStyles.cardBody}>
              <div className={cardStyles.cardStats}>
                <div>
                  <div className={cardStyles.cardStatValue}>{activeVouchers}</div>
                  <div className={cardStyles.cardStatLabel}>Đang hoạt động</div>
                </div>
                <div className={`${cardStyles.cardStatIcon} ${cardStyles.cardStatIconSuccess}`}>
                  ✅
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className={`${cardStyles.card} ${cardStyles.cardAnimateHover}`}>
            <div className={cardStyles.cardBody}>
              <div className={cardStyles.cardStats}>
                <div>
                  <div className={cardStyles.cardStatValue}>
                    {vouchers.reduce((sum, v) => sum + ((v.SoLuong || 0) - (v.usedCount || 0)), 0)}
                  </div>
                  <div className={cardStyles.cardStatLabel}>Voucher còn lại</div>
                </div>
                <div className={`${cardStyles.cardStatIcon} ${cardStyles.cardStatIconInfo}`}>
                  📊
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gift Modal - Danh sách người dùng */}
      {showGiftModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={handleCloseGiftModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '1200px',
              width: '95%',
              maxHeight: '85vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                🎁 Tặng Voucher
              </h3>
              {selectedVoucherToGift && (
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  <strong>Voucher:</strong> {selectedVoucherToGift.code} - {selectedVoucherToGift.MoTa}
                  <br />
                  <strong>Giảm giá:</strong> {formatDiscount(selectedVoucherToGift)}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
                Nội dung tặng kèm:
              </label>
              <textarea
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                placeholder="Nhập lời nhắn gửi kèm voucher (tùy chọn)..."
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
              />
            </div>

            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p style={{ marginTop: '12px', color: '#6c757d' }}>Đang tải danh sách người dùng...</p>
              </div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                <p>Không có người dùng nào</p>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px', fontWeight: '600', color: '#2c3e50' }}>
                  Danh sách người dùng ({users.length})
                </div>
                <div style={{ 
                  maxHeight: '400px', 
                  overflow: 'auto',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ 
                      position: 'sticky', 
                      top: 0, 
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #dee2e6',
                    }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>
                          <input
                            type="checkbox"
                            checked={selectAllChecked}
                            onChange={handleSelectAll}
                            title="Chọn tất cả (bị giới hạn bởi số lượng voucher còn)"
                          />
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>ID</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Tên</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>SĐT</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Số ĐH</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Tổng tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr 
                          key={user.MaTaiKhoan}
                          style={{ 
                            borderBottom: '1px solid #f0f0f0',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '12px' }}>
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.MaTaiKhoan)}
                              onChange={() => toggleUserSelection(user.MaTaiKhoan)}
                            />
                          </td>
                          <td style={{ padding: '12px' }}>{user.MaTaiKhoan}</td>
                          <td style={{ padding: '12px', fontWeight: '500' }}>{user.NguoiDung?.HoTen || '—'}</td>
                          <td style={{ padding: '12px', color: '#6c757d' }}>{user.Email}</td>
                          <td style={{ padding: '12px', color: '#6c757d' }}>{user.NguoiDung?.SoDienThoai || '—'}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#0d6efd' }}>{user.SoLuongDonHang || 0}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500', color: '#198754' }}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user.TongTienDonHang || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <div style={{ color: '#6c757d', fontSize: '14px' }}>
                <div style={{ marginBottom: '4px' }}>
                  Số lượng voucher còn: <strong style={{ color: isVoucherValidForGift(selectedVoucherToGift) ? '#198754' : '#dc3545' }}>{remainingForVoucher(selectedVoucherToGift)}</strong>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  Đã chọn: <strong>{selectedUserIds.length}</strong> người
                </div>
                {!isVoucherValidForGift(selectedVoucherToGift) && (
                  <div style={{ color: '#dc3545', fontWeight: '500', marginTop: '8px' }}>
                    ⚠️ Voucher không hợp lệ (kiểm tra trạng thái, số lượng, thời gian)
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`${buttonStyles.button} ${buttonStyles.buttonPrimary}`}
                  onClick={handleGiftSelected}
                  disabled={selectedUserIds.length === 0 || !isVoucherValidForGift(selectedVoucherToGift)}
                  style={{
                    opacity: (selectedUserIds.length === 0 || !isVoucherValidForGift(selectedVoucherToGift)) ? 0.5 : 1,
                    cursor: (selectedUserIds.length === 0 || !isVoucherValidForGift(selectedVoucherToGift)) ? 'not-allowed' : 'pointer'
                  }}
                >
                  🎁 Tặng ({selectedUserIds.length})
                </button>
                <button
                  type="button"
                  className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                  onClick={handleCloseGiftModal}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageVouchers;
