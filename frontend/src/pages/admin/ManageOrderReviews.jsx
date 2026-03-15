import React, { useEffect, useState, useMemo } from 'react';
import OrderDetail from '../../components/ui/OrderDetail';
import ReviewAnalytics from './ReviewAnalytics';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import { AdminResponsiveContainer } from '../../components/admin/AdminResponsiveContainer';
import { fetchOrderReviews } from '../../services/api';

const ManageOrderReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchOrderReviews();
        const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : res.data || []);
        if (!mounted) return;
        setReviews(data);
      } catch (err) {
        console.error('fetchOrderReviews error', err);
        if (!mounted) return;
        setError(err.message || 'Lỗi khi tải đánh giá đơn hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    return reviews.filter(r => {
      if (!q) return true;
      const orderId = String(r.MaDonHang || r.DonHang?.MaDonHang || '').toLowerCase();
      const customer = String(r.DonHang?.NguoiDung_DonHang_MaNguoiDungToNguoiDung?.HoTen || r.DonHang?.TenNguoiNhan || '').toLowerCase();
      return orderId.includes(q) || customer.includes(q);
    });
  }, [reviews, search]);

  // Modal state for viewing order details inline
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const handleViewOrder = (orderSummary) => {
    const orderId = orderSummary?.MaDonHang || orderSummary?.DonHang?.MaDonHang || orderSummary?.MaDonHang;
    if (!orderId) return alert('Không xác định được mã đơn');
    setSelectedOrderId(orderId);
    setShowDetailModal(true);
  };

  return (
    <div className="admin-animate-fade-in">
      <div className={`${cardStyles.cardPremium} mb-4`}>
        <div className={cardStyles.cardHeaderPremium}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Đánh giá đơn hàng</h2>
              <p className={cardStyles.cardSubtitle}>Danh sách đánh giá liên quan đến đơn hàng</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className={formStyles.formSearch}>
                <span className={formStyles.formSearchIcon}>🔍</span>
                <input type="search" className={`${formStyles.formInput} ${formStyles.formSearchInput}`} placeholder="Tìm mã đơn hoặc tên khách" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 280 }} />
                {search && <button type="button" className={formStyles.formSearchClear} onClick={() => setSearch('')}>✕</button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analytics Section */}
      <ReviewAnalytics />

      <AdminResponsiveContainer data={filtered} loading={loading} empty={filtered.length===0} cardComponent={null}>
        <div className={`${styles.tableContainerPremium} ${styles.tableAnimateIn}`}>
          <div className={styles.tableResponsive}>
            <table className={`${styles.table} ${styles.tableRowHover}`}>
              <thead className={styles.tableHeaderPrimary}>
                <tr>
                  <th style={{ width: 80 }}><span>#</span></th>
                  <th style={{ width: 120 }}><span>Mã đơn</span></th>
                  <th>Khách hàng</th>
                  <th style={{ width: 120 }}>Số sao</th>
                  <th>Nhận xét</th>
                  <th style={{ width: 160 }}>Ngày đánh giá</th>
                  <th style={{ width: 160 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}><div className={styles.tableEmpty}>Đang tải...</div></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7}><div className={styles.tableEmpty}>Không tìm thấy đánh giá</div></td></tr>
                ) : filtered.map((r, idx) => {
                  const id = r.MaDanhGiaDonHang || r.MaDanhGia || idx;
                  const order = r.DonHang || {};
                  const customer = order.NguoiDung_DonHang_MaNguoiDungToNguoiDung?.HoTen || order.TenNguoiNhan || 'Khách';
                  const date = r.NgayDanhGia ? new Date(r.NgayDanhGia).toLocaleString('vi-VN') : '';
                  return (
                    <tr key={id}>
                      <td className={styles.tableCellBold}><span className={`${styles.tableBadge} ${styles.tableBadgeInfo}`}>{id}</span></td>
                      <td><div className={styles.tableCellMuted}>{order.MaDonHang || r.MaDonHang}</div></td>
                      <td><div className={styles.tableCellBold}>{customer}</div><div className={styles.tableCellMuted}>{order.SoDienThoaiGiaoHang || ''}</div></td>
                      <td><div className="d-flex align-items-center">{Array.from({length: (r.SoSao||r.rating||0)}).map((_,i)=><span key={i}>⭐</span>)}</div></td>
                      <td><div className={styles.tableCellMuted} style={{ maxWidth: 360 }}>{r.BinhLuan || r.comment || ''}</div></td>
                      <td>{date}</td>
                      <td>
                        <div className={styles.tableActions}>
                          <button className={`${styles.tableAction} ${styles.tableActionSecondary}`} title="Xem chi tiết" onClick={() => handleViewOrder(order)}>🧾</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </AdminResponsiveContainer>
          {/* Order detail modal shown inline */}
          <OrderDetail 
            show={showDetailModal}
            onHide={() => setShowDetailModal(false)}
            orderId={selectedOrderId}
            initialData={null}
            modalZIndex={1400}
            isAdmin={true}
          />
    </div>
  );
};

export default ManageOrderReviews;
