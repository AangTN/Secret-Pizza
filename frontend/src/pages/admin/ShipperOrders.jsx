import React, { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { fetchOrders, api } from '../../services/api';
import OrderDetail from '../../components/ui/OrderDetail';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import { AdminResponsiveContainer } from '../../components/admin/AdminResponsiveContainer';
import { BusinessCard } from '../../components/admin/AdminTableCard';

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

const ShipperOrders = () => {
  const { admin } = useAdminAuth();
  const shipperId = admin?.maNguoiDung;

  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [selectedStatusValue, setSelectedStatusValue] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState(null);

  useEffect(() => {
    if (!shipperId) {
      setError('Không tìm thấy thông tin shipper');
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
        setOrders(ordersData);
      } catch (err) {
        console.error('Error loading orders:', err);
        if (mounted) setError('Không thể tải danh sách đơn hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [shipperId]);

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
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  const isMyOrder = (order) => {
    return order.MaNguoiDungGiaoHang === shipperId;
  };

  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filter by status
    if (filter === 'available') {
      // Đơn chờ giao hàng chưa có shipper nhận
      result = orders.filter(o => getLatestStatus(o) === 'Chờ giao hàng' && !o.MaNguoiDungGiaoHang);
    } else if (filter === 'my-orders') {
      // Đơn đã nhận (đang giao hoặc đã giao)
      result = orders.filter(o => isMyOrder(o) && ['Chờ giao hàng', 'Đang giao', 'Đã giao'].includes(getLatestStatus(o)));
    } else if (filter === 'delivering') {
      result = orders.filter(o => isMyOrder(o) && getLatestStatus(o) === 'Đang giao');
    } else if (filter === 'completed') {
      result = orders.filter(o => isMyOrder(o) && getLatestStatus(o) === 'Đã giao');
    } else {
      // all: Tất cả đơn chờ giao hàng + đơn của tôi
      result = orders.filter(o => {
        const status = getLatestStatus(o);
        return (status === 'Chờ giao hàng' && !o.MaNguoiDungGiaoHang) || isMyOrder(o);
      });
    }

    return result;
  }, [filter, orders, shipperId]);

  const handleView = (order) => {
    if (!order || !order.MaDonHang) return;
    setSelectedOrderId(order.MaDonHang);
    setShowDetailModal(true);
  };

  const handleAcceptOrder = async (orderId) => {
    if (!orderId) return;
    if (!confirm(`Bạn có chắc chắn muốn nhận đơn hàng ${orderId} không?`)) return;
    
    setAcceptingOrderId(orderId);
    try {
      // Gọi API để gán shipper cho đơn hàng
      await api.patch(`/api/orders/${orderId}/assign-shipper`, { 
        maNguoiDungGiaoHang: shipperId 
      });
      
      // Reload order data
      const res = await api.get(`/api/orders/${orderId}`);
      const updated = res.data?.data;
      if (updated) {
        setOrders(prev => prev.map(o => o.MaDonHang === orderId ? updated : o));
      }
      alert('Nhận đơn hàng thành công');
    } catch (err) {
      console.error('Accept order failed', err);
      alert('Không thể nhận đơn hàng: ' + (err.response?.data?.message || err.message));
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const handleEdit = (orderId) => {
    const order = orders.find(o => o.MaDonHang === orderId);
    if (!order) return alert('Không tìm thấy đơn hàng');
    
    // Chỉ cho phép shipper cập nhật đơn của mình
    if (!isMyOrder(order)) {
      return alert('Bạn chỉ có thể cập nhật đơn hàng đã nhận');
    }

    const latest = getLatestStatus(order) || null;
    const allowedStatuses = ['Chờ giao hàng', 'Đang giao', 'Đã giao'];
    const curIdx = allowedStatuses.indexOf(latest);
    const possible = curIdx === -1 ? [] : allowedStatuses.slice(curIdx + 1);
    
    if (possible.length === 0) {
      return alert('Đơn hàng đã ở trạng thái cuối, không thể cập nhật thêm.');
    }
    
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

  const cardComponent = (
    <div className={styles.adminTableCards}>
      {filteredOrders.map((order, index) => {
        const id = order.MaDonHang;
        const customer = order.NguoiDung_DonHang_MaNguoiDungToNguoiDung?.HoTen || order.TenNguoiNhan || 'Khách vãng lai';
        const phone = order.SoDienThoaiGiaoHang;
        const branch = order.CoSo?.TenCoSo || '—';
        const total = Number(order.TongTien || 0);
        const latestStatus = getLatestStatus(order) || 'Chờ giao hàng';
        const createdAt = formatDateTime(order.NgayDat);

        return (
          <BusinessCard
            key={id}
            data={{ id, customer, phone, branch, total, status: latestStatus, createdAt, address: branch }}
            type="order"
            onView={() => handleView(order)}
            onEdit={() => handleEdit(id)}
            index={index}
            animate={true}
            showTimeline={true}
          />
        );
      })}
    </div>
  );

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
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Quản lý giao hàng</h2>
              <p className={cardStyles.cardSubtitle}>Shipper: {admin?.hoTen}</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className={formStyles.formFilter}>
                <div className={formStyles.formFilterGroup}>
                  <span className={formStyles.formFilterLabel}>Lọc:</span>
                  <select 
                    className={formStyles.formSelect}
                    value={filter} 
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="available">Đơn có thể nhận</option>
                    <option value="my-orders">Đơn của tôi</option>
                    <option value="delivering">Đang giao</option>
                    <option value="completed">Đã giao</option>
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
      <AdminResponsiveContainer 
        data={filteredOrders}
        loading={false}
        empty={filteredOrders.length === 0}
        cardComponent={cardComponent}
        className="shipper-orders-container"
      >
        <div className={`${styles.tableContainerPremium} ${styles.tableAnimateIn}`}>
          <div className={styles.tableResponsive}>
            <table className={`${styles.table} ${styles.tableRowHover}`}>
              <thead className={styles.tableHeaderPrimary}>
                <tr>
                  <th style={{ width: 100 }}>
                    <div className={styles.tableSortable}>
                      <span>Mã đơn</span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Khách hàng</span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Điện thoại</span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Địa chỉ giao</span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Tổng tiền</span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Trạng thái</span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Thời gian</span>
                    </div>
                  </th>
                  <th style={{ width: 220 }}>Thao tác</th>
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
                          {filter === 'available' ? 'Chưa có đơn hàng nào cần giao' : 
                           filter === 'my-orders' ? 'Bạn chưa nhận đơn hàng nào' : 
                           'Thử chọn bộ lọc khác'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => {
                    const id = order.MaDonHang;
                    const customer = order.NguoiDung_DonHang_MaNguoiDungToNguoiDung?.HoTen || order.TenNguoiNhan || 'Khách vãng lai';
                    const phone = order.SoDienThoaiGiaoHang;
                    const address = `${order.SoNhaDuongGiaoHang || ''}, ${order.PhuongXaGiaoHang || ''}, ${order.QuanHuyenGiaoHang || ''}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',');
                    const total = Number(order.TongTien || 0).toLocaleString();
                    const latestStatus = getLatestStatus(order) || 'Chờ giao hàng';
                    const createdAt = formatDateTime(order.NgayDat);
                    const canAccept = latestStatus === 'Chờ giao hàng' && !order.MaNguoiDungGiaoHang;
                    const isMine = isMyOrder(order);

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
                          <div className={styles.tableCellMuted} style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={address}>
                            📍 {address}
                          </div>
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

                            {canAccept ? (
                              <button 
                                className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonSmall}`}
                                onClick={() => handleAcceptOrder(id)}
                                disabled={acceptingOrderId === id}
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                              >
                                {acceptingOrderId === id ? 'Đang nhận...' : '✓ Nhận đơn'}
                              </button>
                            ) : isMine ? (
                              editingOrderId === id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <select
                                    value={selectedStatusValue}
                                    onChange={(e) => setSelectedStatusValue(e.target.value)}
                                    style={{ padding: '4px 6px', minWidth: 140 }}
                                  >
                                    {(() => {
                                      const latest = getLatestStatus(order) || null;
                                      const allowedStatuses = ['Chờ giao hàng', 'Đang giao', 'Đã giao'];
                                      const curIdx = allowedStatuses.indexOf(latest);
                                      const possible = curIdx === -1 ? [] : allowedStatuses.slice(curIdx + 1);
                                      return possible.map(s => <option key={s} value={s}>{s}</option>);
                                    })()}
                                  </select>
                                  <button className={`${styles.tableAction} ${styles.tableActionSuccess}`} title="Xác nhận" onClick={() => confirmUpdateStatus(id)} disabled={updatingStatus}>✅</button>
                                  <button className={styles.tableAction} title="Hủy" onClick={cancelEdit}>✖️</button>
                                </div>
                              ) : (
                                <button className={styles.tableAction} title="Cập nhật trạng thái" onClick={() => handleEdit(id)}>📝</button>
                              )
                            ) : (
                              <span className="text-muted" style={{ fontSize: '12px' }}>Đơn của shipper khác</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {filteredOrders.length > 0 && (
            <div className={styles.tablePagination}>
              <div className={styles.tablePaginationInfo}>
                Hiển thị {filteredOrders.length} đơn hàng
              </div>
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
      </AdminResponsiveContainer>
    </div>
  );
};

export default ShipperOrders;
