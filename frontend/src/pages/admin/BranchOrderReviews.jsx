import React, { useEffect, useState, useMemo } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import OrderDetail from '../../components/ui/OrderDetail';
import ReviewAnalytics from './ReviewAnalytics';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import { fetchOrderReviews } from '../../services/api';

const BranchOrderReviews = () => {
  const { admin } = useAdminAuth();
  const branchId = admin?.maCoSo;

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!branchId) {
      setError('Không tìm thấy thông tin chi nhánh');
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchOrderReviews();
        const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : res.data || []);
        if (!mounted) return;
        
        // Filter reviews for orders from this branch only
        const branchReviews = data.filter(r => r.DonHang?.MaCoSo === branchId);
        setReviews(branchReviews);
      } catch (err) {
        console.error('fetchOrderReviews error', err);
        if (!mounted) return;
        setError(err.message || 'Lỗi khi tải đánh giá đơn hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [branchId]);

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    return reviews.filter(r => {
      if (!q) return true;
      const orderId = String(r.MaDonHang || r.DonHang?.MaDonHang || '').toLowerCase();
      const customer = String(r.DonHang?.NguoiDung_DonHang_MaNguoiDungToNguoiDung?.HoTen || r.DonHang?.TenNguoiNhan || '').toLowerCase();
      return orderId.includes(q) || customer.includes(q);
    });
  }, [reviews, search]);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const handleViewOrder = (reviewData) => {
    const orderId = reviewData?.MaDonHang || reviewData?.DonHang?.MaDonHang || reviewData?.MaDonHang;
    if (!orderId) return alert('Không xác định được mã đơn');
    setSelectedOrderId(orderId);
    setShowDetailModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? '#fbbf24' : '#d1d5db', fontSize: '1.25rem' }}>
          ★
        </span>
      );
    }
    return stars;
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
      <div className={`${cardStyles.cardPremium} mb-4`}>
        <div className={cardStyles.cardHeaderPremium}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Đánh giá đơn hàng chi nhánh</h2>
              <p className={cardStyles.cardSubtitle}>Chi nhánh #{branchId} - {admin?.tenCoSo || 'Chi nhánh'}</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className={formStyles.formSearch}>
                <span className={formStyles.formSearchIcon}>🔍</span>
                <input 
                  type="search" 
                  className={`${formStyles.formInput} ${formStyles.formSearchInput}`} 
                  placeholder="Tìm mã đơn hoặc tên khách" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  style={{ minWidth: 280 }} 
                />
                {search && <button type="button" className={formStyles.formSearchClear} onClick={() => setSearch('')}>✕</button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analytics Section */}
      <ReviewAnalytics branchId={branchId} />

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

                  return (
                    <tr key={id} className="admin-animate-slide-up">
                      <td className={styles.tableCellBold}>
                        <span className="badge bg-light text-dark border">{idx + 1}</span>
                      </td>
                      <td className={styles.tableCellBold}>#{r.MaDonHang}</td>
                      <td>{customer}</td>
                      <td>
                        <div className="d-flex gap-1">
                          {renderStars(r.SoSao || 0)}
                        </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.BinhLuan || <span className="text-muted">Không có nhận xét</span>}
                        </div>
                      </td>
                      <td>
                        <small>{formatDate(r.NgayDanhGia)}</small>
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button
                            className={`${styles.tableAction} ${styles.tableActionPrimary}`}
                            title="Xem đơn hàng"
                            onClick={() => handleViewOrder(r)}
                          >
                            👁️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrderId && (
        <OrderDetail
          orderId={selectedOrderId}
          show={showDetailModal}
          onHide={() => {
            setShowDetailModal(false);
            setSelectedOrderId(null);
          }}
          isAdmin={true}
        />
      )}
    </div>
  );
};

export default BranchOrderReviews;
