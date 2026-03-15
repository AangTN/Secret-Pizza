import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { fetchOrders, api } from '../../services/api';
import { subscribeOrderChanges } from '../../services/orderRealtime';
import OrderDetail from '../../components/ui/OrderDetail';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';

const statusVariant = {
  'Đang xử lý': 'warning',
  'Chờ giao hàng': 'info',
  'Đang giao': 'primary',
  'Đá giao': 'success',
  'Đã hủy': 'secondary',
};

const statusIcons = {
  'Đang xử lý': '⏳',
  'Chờ giao hàng': '📦',
  'Đang giao': '🚚',
  'Đã giao': '✅',
  'Đã hủy': '❌',
};

const BranchOrders = () => {
  const { admin } = useAdminAuth();
  const branchId = admin?.maCoSo;
  const location = useLocation();

  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [selectedStatusValue, setSelectedStatusValue] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelingOrderId, setCancelingOrderId] = useState(null);

  useEffect(() => {
    if (!branchId) {
      setError('Không tìm thấy thông tin chi nhánh');
      setLoading(false);
      return;
    }

    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const ordersRes = await fetchOrders();
        const ordersData = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data || ordersRes;

        if (!mounted) return;
        
        // Filter orders by branch
        const branchOrders = ordersData.filter(order => order.MaCoSo === branchId);
        setOrders(branchOrders);
      } catch (err) {
        console.error('Error loading orders:', err);
        if (mounted) setError('Không thể tải danh sách đơn hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [branchId]);

  useEffect(() => {
    const openId = location?.state?.openOrderId;
    if (openId) {
      setSelectedOrderId(openId);
      setShowDetailModal(true);
    }
  }, [location?.state?.openOrderId]);

  useEffect(() => {
    if (!branchId || !admin?.maTaiKhoan) {
      return undefined;
    }

    return subscribeOrderChanges(
      {
        maTaiKhoan: admin.maTaiKhoan,
        maNguoiDung: admin.maNguoiDung,
        maCoSo: admin.maCoSo,
        role: admin.role,
      },
      (payload) => {
        const incomingOrder = payload?.order;
        if (!incomingOrder?.MaDonHang) {
          return;
        }

        setOrders((prev) => {
          const current = Array.isArray(prev) ? prev : [];
          const orderId = Number(incomingOrder.MaDonHang);
          const index = current.findIndex((order) => Number(order?.MaDonHang) === orderId);
          const sameBranch = Number(incomingOrder.MaCoSo) === Number(branchId);

          if (!sameBranch) {
            if (index < 0) {
              return current;
            }
            return current.filter((order) => Number(order?.MaDonHang) !== orderId);
          }

          if (index >= 0) {
            const next = [...current];
            next[index] = incomingOrder;
            return next;
          }

          return [incomingOrder, ...current];
        });
      }
    );
  }, [admin?.maTaiKhoan, admin?.maNguoiDung, admin?.maCoSo, admin?.role, branchId]);

  const allowedStatuses = ['Đang chờ xác nhận', 'Đang xử lý', 'Chờ giao hàng', 'Đang giao', 'Đã giao'];

  const getLatestStatus = (order) => {
    const h = order?.LichSuTrangThaiDonHang;
    if (!Array.isArray(h) || h.length === 0) return null;
    try {
      const sorted = [...h].sort((a, b) => new Date(a.ThoiGianCapNhat || 0) - new Date(b.ThoiGianCapNhat || 0));
      return sorted[sorted.length - 1]?.TrangThai || null;
    } catch (e) {
      return h[0]?.TrangThai || null;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    // DB stores VN time but with Z suffix, so we use UTC getters to get the actual stored values
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  const filteredOrders = useMemo(() => {
    if (filter === 'all') {
      return orders.filter(o => allowedStatuses.includes(getLatestStatus(o)));
    }
    return orders.filter(order => getLatestStatus(order) === filter);
  }, [filter, orders]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const processing = filteredOrders.filter(o => getLatestStatus(o) === 'Đang xử lý').length;
    const delivering = filteredOrders.filter(o => getLatestStatus(o) === 'Đang giao').length;
    const completed = filteredOrders.filter(o => getLatestStatus(o) === 'Đã giao').length;
    const cancelled = filteredOrders.filter(o => getLatestStatus(o) === 'Đã hủy').length;
    const totalRevenue = filteredOrders
      .filter(o => getLatestStatus(o) === 'Đã giao')
      .reduce((sum, o) => sum + Number(o.TongTien || 0), 0);

    return { total, processing, delivering, completed, cancelled, totalRevenue };
  }, [filteredOrders]);

  // Action handlers
  const handleView = (order) => {
    if (!order || !order.MaDonHang) return;
    setSelectedOrder(null);
    setSelectedOrderId(order.MaDonHang);
    setShowDetailModal(true);
  };

  const handleEdit = (orderId) => {
    const order = orders.find(o => o.MaDonHang === orderId);
    if (!order) return alert('Không tìm thấy đơn hàng');
    const latest = getLatestStatus(order) || null;
    const orderedStatuses = allowedStatuses;
    const curIdx = orderedStatuses.indexOf(latest);
    const possible = curIdx === -1 ? orderedStatuses : orderedStatuses.slice(curIdx + 1);
    if (possible.length === 0) return alert('Đơn hàng đã ở trạng thái cuối, không thể cập nhật thêm.');
    setEditingOrderId(orderId);
    setSelectedStatusValue(possible[0]);
  };

  const cancelEdit = () => {
    setEditingOrderId(null);
    setSelectedStatusValue('');
  };

  const confirmUpdateStatus = async (orderId) => {
    if (!orderId || !selectedStatusValue) return;
    setUpdatingStatus(true);
    try {
      await api.post(`/api/orders/${orderId}/status`, { TrangThai: selectedStatusValue });
      const res = await api.get(`/api/orders/${orderId}`);
      const updated = res.data?.data;
      if (updated) setOrders(prev => prev.map(o => o.MaDonHang === orderId ? updated : o));
      alert('Cập nhật trạng thái thành công');
      cancelEdit();
    } catch (err) {
      console.error('Status update failed', err);
      alert('Không thể cập nhật trạng thái: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancel = async (orderId) => {
    if (!orderId) return;
    if (!confirm(`Bạn có chắc chắn muốn hủy đơn hàng ${orderId} không?`)) return;
    setCancelingOrderId(orderId);
    try {
      const res = await api.post(`/api/orders/${orderId}/cancel-staff`);
      if (res.status === 200) {
        const r2 = await api.get(`/api/orders/${orderId}`);
        const updated = r2.data?.data;
        if (updated) setOrders(prev => prev.map(o => o.MaDonHang === orderId ? updated : o));
        alert(res.data?.message || 'Hủy đơn hàng thành công');
      } else {
        alert(res.data?.message || 'Hủy đơn không thành công');
      }
    } catch (err) {
      console.error('Cancel order failed', err);
      alert('Không thể hủy đơn hàng: ' + (err.response?.data?.message || err.message));
    } finally {
      setCancelingOrderId(null);
    }
  };

  const handlePrintInvoice = async (order) => {
    if (!order || !order.MaDonHang) return;
    try {
      const res = await api.get(`/api/orders/${order.MaDonHang}`);
      const fullOrder = res.data?.data || order;
      const pdfHtml = generateOrderPDF(fullOrder);
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(pdfHtml);
        newWindow.document.close();
        newWindow.onload = () => setTimeout(() => newWindow.print(), 500);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
      alert('Không thể tải chi tiết đơn hàng: ' + (err.response?.data?.message || err.message));
    }
  };

  const generateOrderPDF = (order) => {
    const formatVnd = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
    const formatDate = (d) => {
      if (!d) return '—';
      const date = new Date(d);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
    };
    
    let lastStatus = 'Đang xử lý';
    if (Array.isArray(order.LichSuTrangThaiDonHang) && order.LichSuTrangThaiDonHang.length > 0) {
      const sorted = [...order.LichSuTrangThaiDonHang].sort((a, b) => 
        new Date(a.ThoiGianCapNhat || 0) - new Date(b.ThoiGianCapNhat || 0)
      );
      lastStatus = sorted[sorted.length - 1].TrangThai || lastStatus;
    }
    
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

    const chiTietHTML = Array.isArray(order.ChiTietDonHang) ? order.ChiTietDonHang.map(item => {
      let tenMon = '—';
      let size = '';
      let deBanh = '';
      
      if (item.Loai === 'SP' && item.BienTheMonAn?.MonAn) {
        tenMon = item.BienTheMonAn.MonAn.TenMonAn || '—';
        size = item.BienTheMonAn?.Size?.TenSize ? ` (${item.BienTheMonAn.Size.TenSize})` : '';
        deBanh = item.DeBanh?.TenDeBanh ? ` - ${item.DeBanh.TenDeBanh}` : '';
      } else if (item.Loai === 'CB' && item.Combo) {
        tenMon = item.Combo.TenCombo || '—';
      }
      
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
      <div>${coSoInfo}</div>
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
      <tbody>${chiTietHTML}</tbody>
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

  if (error) {
    return (
      <div className="alert alert-danger m-4" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="admin-animate-fade-in">
      {/* Header Section */}
      <div className={`${cardStyles.cardPremium} mb-4`}>
        <div className={cardStyles.cardHeaderPremium}>
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <div>
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Quản lý đơn hàng chi nhánh</h2>
              <p className={cardStyles.cardSubtitle}>Chi nhánh #{branchId} - {admin?.hoTen || 'Chi nhánh'}</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className={formStyles.formFilter}>
                <div className={formStyles.formFilterGroup}>
                  <span className={formStyles.formFilterLabel}>Trạng thái:</span>
                  <select 
                    className={formStyles.formSelect}
                    value={filter} 
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Tất cả (Đang chờ xác nhận, Đang xử lý, Chờ giao hàng, Đang giao, Đã giao)</option>
                    <option value="Đang chờ xác nhận">Đang chờ xác nhận</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Chờ giao hàng">Chờ giao hàng</option>
                    <option value="Đang giao">Đang giao</option>
                    <option value="Đã giao">Đã giao</option>
                  </select>
                </div>
              </div>
              <button className={`${buttonStyles.button} ${buttonStyles.buttonPrimary}`} onClick={() => window.location.reload()}>
                🔄 Tải lại
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className={`${styles.tableContainerPremium} ${styles.tableAnimateIn}`}>
          <div className={styles.tableResponsive}>
            <table className={`${styles.table} ${styles.tableRowHover}`}>
              <thead className={styles.tableHeaderPrimary}>
                <tr>
                  <th style={{ width: 120 }}>
                    <div className={styles.tableSortable}>
                      <span>Mã đơn</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Khách hàng</span>
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
                      <span>Cơ sở</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Tổng tiền</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Trạng thái</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Thời gian</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th style={{ width: 200 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8}>
                      <div className={styles.tableEmpty}>Đang tải...</div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className={styles.tableEmpty}>
                        <div className={styles.tableEmptyIcon}>📦</div>
                        <div className={styles.tableEmptyTitle}>Không tìm thấy đơn hàng</div>
                        <div className={styles.tableEmptyDescription}>
                          {filter !== 'all' ? 'Thử chọn trạng thái khác' : 'Chưa có đơn hàng nào'}
                        </div>
                        <button 
                          className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                          onClick={() => setFilter('all')}
                        >
                          Xem tất cả đơn hàng
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => {
                    const id = order.MaDonHang;
                    const customer = order.NguoiDung_DonHang_MaNguoiDungToNguoiDung?.HoTen || order.TenNguoiNhan || 'Khách vãng lai';
                    const phone = order.SoDienThoaiGiaoHang;
                    const branch = order.CoSo?.TenCoSo || '—';
                    const total = Number(order.TongTien || 0).toLocaleString();
                    const latestStatus = getLatestStatus(order) || 'Đang xử lý';
                    const createdAt = formatDateTime(order.NgayDat);

                    return (
                      <tr key={id} className="admin-animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                        <td className={styles.tableCellBold}>
                          <span className="badge bg-light text-dark border">{id}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #ff4d4f 0%, #ff6b6b 100%)', color: 'white', fontSize: 14, fontWeight: 'bold' }}
                            >
                              {String(customer).charAt(0)}
                            </div>
                            <div>
                              <div className={styles.tableCellBold}>{customer}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.tableCellMuted}>📞 {phone}</div>
                        </td>
                        <td>
                          <div className={styles.tableCellMuted}>{branch}</div>
                        </td>
                        <td>
                          <div className={`${styles.tableCellBold} ${styles.tableCellSuccess}`}>{total} đ</div>
                        </td>
                        <td>
                          <span className={`${styles.tableBadge} ${styles[`tableBadge${statusVariant[latestStatus] === 'warning' ? 'Warning' : statusVariant[latestStatus] === 'info' ? 'Info' : statusVariant[latestStatus] === 'primary' ? 'Active' : statusVariant[latestStatus] === 'success' ? 'Success' : 'Secondary'}`]}`}>
                            <span className="me-1">{statusIcons[latestStatus]}</span>
                            {latestStatus}
                          </span>
                        </td>
                        <td>
                          <div className={styles.tableCellMuted}>🕒 {createdAt}</div>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            <button className={`${styles.tableAction} ${styles.tableActionSuccess}`} title="Xem chi tiết" onClick={() => handleView(order)}>👁️</button>
                            <button className={`${styles.tableAction} ${styles.tableActionSecondary}`} title="In hóa đơn" onClick={() => handlePrintInvoice(order)}>🖨️</button>

                            {editingOrderId === id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <select
                                  value={selectedStatusValue}
                                  onChange={(e) => setSelectedStatusValue(e.target.value)}
                                  style={{ padding: '4px 6px', minWidth: 160 }}
                                >
                                  {(() => {
                                    const latest = getLatestStatus(order) || null;
                                    const curIdx = allowedStatuses.indexOf(latest);
                                    const possible = curIdx === -1 ? allowedStatuses : allowedStatuses.slice(curIdx + 1);
                                    return possible.map(s => <option key={s} value={s}>{s}</option>);
                                  })()}
                                </select>
                                <button className={`${styles.tableAction} ${styles.tableActionSuccess}`} title="Xác nhận" onClick={() => confirmUpdateStatus(id)} disabled={updatingStatus}>✅</button>
                                <button className={styles.tableAction} title="Hủy" onClick={cancelEdit}>✖️</button>
                              </div>
                            ) : (
                              <>
                                <button className={styles.tableAction} title="Cập nhật trạng thái" onClick={() => handleEdit(id)}>📝</button>
                              </>
                            )}

                            <button className={`${styles.tableAction} ${styles.tableActionDanger}`} title="Hủy đơn hàng" onClick={() => handleCancel(id)} disabled={cancelingOrderId === id || latestStatus === 'Đã giao'}>{cancelingOrderId === id ? 'Đang…' : '❌'}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer with Pagination */}
          {filteredOrders.length > 0 && (
            <div className={styles.tablePagination}>
              <div className={styles.tablePaginationInfo}>
                Hiển thị {filteredOrders.length} trên {orders.length} đơn hàng
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
              {/* Order Detail Modal */}
              <OrderDetail 
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
                orderId={selectedOrderId}
                initialData={null}
                modalZIndex={1400}
                isAdmin={true}
              />
            </div>
          )}
        </div>
    </div>
  );
};

export default BranchOrders;
