import React, { useMemo, useState, useEffect } from 'react';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import { AdminResponsiveContainer } from '../../components/admin/AdminResponsiveContainer';
import { ReviewCard } from '../../components/admin/AdminTableCard';
import { fetchReviews, api, assetUrl } from '../../services/api';

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const mockReviews = [
  {
    id: 'RV001',
    orderId: 'DH1001',
    customer: 'Nguyễn Văn A',
    rating: 5,
    comment: 'Pizza ngon, giao hàng nhanh!'
  },
  {
    id: 'RV002',
    orderId: 'DH0999',
    customer: 'Lê Minh C',
    rating: 4,
    comment: 'Ngon nhưng hơi nguội tí, shipper thân thiện.'
  },
  {
    id: 'RV003',
    orderId: 'DH0995',
    customer: 'Trần Thị B',
    rating: 2,
    comment: 'Giao chậm 15 phút, mong cải thiện.'
  }
];

const ManageReviews = () => {
  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Chờ duyệt');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchReviews();
        const data = Array.isArray(res.data) ? res.data : res.data || res;
        if (!mounted) return;
        setReviews(data);
      } catch (err) {
        console.error('fetchReviews error', err);
        if (!mounted) return;
        setError(err.message || 'Lỗi khi tải đánh giá');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filteredReviews = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    return reviews.filter((review) => {
      const rating = review.SoSao ?? review.rating;
      const matchRating = ratingFilter === 'all' || Number(rating) === Number(ratingFilter);
      const status = review.TrangThai || '';
      const matchStatus = statusFilter === 'all' || status === statusFilter;
      const food = review.MonAn?.TenMonAn || '';
      const matchText = !q || String(food).toLowerCase().includes(q);
      return matchRating && matchText && matchStatus;
    });
  }, [ratingFilter, search, reviews, statusFilter]);

  const getRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? '#faad14' : '#d9d9d9', fontSize: '16px' }}>
          {i <= rating ? '⭐' : '☆'}
        </span>
      );
    }
    return stars;
  };

  const getRatingVariant = (rating) => {
    if (rating === 5) return 'Active';
    if (rating === 4) return 'Active';
    if (rating === 3) return 'Pending';
    return 'Error';
  };

  // Action handlers (call backend endpoints)
  const handleApprove = async (reviewId) => {
    if (!confirm('Duyệt đánh giá này?')) return;
    try {
      await api.put(`/api/reviews/${reviewId}/approve`);
      // refresh full list
      const r = await api.get('/api/reviews');
      const data = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : r.data || []);
      setReviews(data);
      alert('Đã duyệt');
    } catch (err) {
      console.error(err);
      alert('Không thể duyệt: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = async (reviewId) => {
    if (!confirm('Từ chối đánh giá này?')) return;
    try {
      await api.put(`/api/reviews/${reviewId}/reject`);
      const r = await api.get('/api/reviews');
      const data = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : r.data || []);
      setReviews(data);
      alert('Đã từ chối');
    } catch (err) {
      console.error(err);
      alert('Không thể từ chối: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (reviewId) => {
    if (!confirm('Xóa đánh giá này? Hành động không thể hoàn tác.')) return;
    try {
      await api.delete(`/api/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => (r.MaDanhGiaMonAn || r.id) !== reviewId));
      alert('Đã xóa');
    } catch (err) {
      console.error(err);
      alert('Không thể xóa: ' + (err.response?.data?.message || err.message));
    }
  };

  // Small stubs used by card view to avoid undefined handlers
  const handleReply = (reviewId) => { alert('Chưa có chức năng trả lời'); };
  const handleHide = (reviewId) => { /* reuse reject */ handleReject(reviewId); };
  const handleView = (reviewId) => { alert('Xem chi tiết: ' + reviewId); };

  // Card component for responsive view
  const cardComponent = (
    <div className={styles.adminTableCards}>
      {filteredReviews.map((review, index) => (
        <ReviewCard
          key={review.id}
          data={review}
          onReply={() => handleReply(review.id)}
          onHide={() => handleHide(review.id)}
          onView={() => handleView(review.id)}
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
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Đánh giá món ăn</h2>
              <p className={cardStyles.cardSubtitle}>Theo dõi phản hồi của khách hàng về món ăn</p>
            </div>
            <div className="d-flex gap-2 align-items-center flex-wrap">
                <div className={formStyles.formSearch}>
                <span className={formStyles.formSearchIcon}>🔍</span>
                <input
                  type="search"
                  className={`${formStyles.formInput} ${formStyles.formSearchInput}`}
                  placeholder="Tìm theo tên món ăn..."
                  style={{ minWidth: 280 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className={formStyles.formSearchClear}
                    onClick={() => setSearch('')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className={formStyles.formFilter}>
                <select
                  className={formStyles.formSelect}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Chờ duyệt">Chờ duyệt</option>
                  <option value="Hiển thị">Hiển thị</option>
                  <option value="Ẩn">Ẩn</option>
                  <option value="all">Tất cả</option>
                </select>
              </div>
              <div className={formStyles.formFilter}>
                <select
                  className={formStyles.formSelect}
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                >
                  <option value="all">Tất cả sao</option>
                  <option value="5">5 sao</option>
                  <option value="4">4 sao</option>
                  <option value="3">3 sao</option>
                  <option value="2">2 sao</option>
                  <option value="1">1 sao</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section with Enhanced Responsive Container */}
      <AdminResponsiveContainer 
        data={filteredReviews}
        loading={loading}
        empty={filteredReviews.length === 0}
        cardComponent={cardComponent}
        onResponsiveChange={(responsiveInfo) => {
          console.log('Reviews view changed:', responsiveInfo);
        }}
        accessibility={{
          announceViewChanges: true,
          viewChangeMessage: 'Reviews view changed to {view}'
        }}
        className="reviews-responsive-container"
      >
        <div className={`${styles.tableContainerPremium} ${styles.tableAnimateIn}`}>
          <div className={styles.tableResponsive}>
            <table className={`${styles.table} ${styles.tableRowHover}`}>
              <thead className={styles.tableHeaderPrimary}>
                <tr>
                  <th style={{ width: 120 }}>
                    <div className={styles.tableSortable}>
                      <span>#</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th style={{ width: 120 }}>
                    <div className={styles.tableSortable}>
                      <span>Món ăn</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Khách hàng</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th style={{ width: 120 }}>
                    <div className={styles.tableSortable}>
                      <span>Số sao</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.tableSortable}>
                      <span>Nhận xét</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th style={{ width: 120 }}>
                    <div className={styles.tableSortable}>
                      <span>Trạng thái</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th style={{ width: 160 }}>
                    <div className={styles.tableSortable}>
                      <span>Thời gian đánh giá</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th style={{ width: 160 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}><div className={styles.tableEmpty}>Đang tải...</div></td></tr>
                ) : filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className={styles.tableEmpty}>
                        <div className={styles.tableEmptyIcon}>⭐</div>
                        <div className={styles.tableEmptyTitle}>Chưa có đánh giá phù hợp</div>
                        <div className={styles.tableEmptyDescription}>
                          {search || ratingFilter !== 'all'
                            ? 'Thử thay đổi bộ lọc tìm kiếm'
                            : 'Chưa có đánh giá nào từ khách hàng'}
                        </div>
                        <button
                          className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                          onClick={() => {
                            setSearch('');
                            setRatingFilter('all');
                          }}
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((review, index) => {
                    const id = review.MaDanhGiaMonAn || review.id;
                    const customer = review.TaiKhoan?.NguoiDung?.HoTen || review.TaiKhoan?.Email || 'Khách';
                    const rating = review.SoSao || review.rating || 0;
                    const comment = review.NoiDung || review.comment || '';
                    const food = review.MonAn?.TenMonAn || '';
                    const date = review.NgayDanhGia ? new Date(review.NgayDanhGia).toLocaleString('vi-VN') : '';

                    return (
                      <tr key={id} className="admin-animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                        <td className={styles.tableCellBold}>
                          <span className={`${styles.tableBadge} ${styles.tableBadgeInfo}`}>{id}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div style={{ width: 56, height: 56, minWidth: 56, minHeight: 56, overflow: 'hidden', borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 56px' }}>
                              {(() => {
                                const raw = review.MonAn?.HinhAnh;
                                if (!raw) return <div style={{ color: '#9ca3af', fontSize: 12 }}>No image</div>;
                                // If it's an absolute URL (http/https) use as-is, otherwise normalize to backend asset path
                                const isAbsolute = String(raw).startsWith('http://') || String(raw).startsWith('https://');
                                const path = isAbsolute ? String(raw) : (String(raw).startsWith('/') ? String(raw) : `/images/AnhMonAn/${raw}`);
                                const src = isAbsolute ? path : assetUrl(path);
                                return <img src={src} alt={food} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 6 }} loading="lazy" />;
                              })()}
                            </div>
                            <div className={styles.tableCellMuted} style={{ minWidth: 140 }}>{food}</div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className={styles.tableCellBold}>{customer}</div>
                            <div className={styles.tableCellMuted}>{review.TaiKhoan?.Email}</div>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="d-flex">{getRatingStars(rating)}</div>
                            <span className={`${styles.tableBadge} ${styles[`tableBadge${getRatingVariant(rating)}`]}`}>{rating}/5</span>
                          </div>
                        </td>
                        <td>
                          <div className={`${styles.tableCellMuted}`} style={{ maxWidth: 360 }} dangerouslySetInnerHTML={{ __html: escapeHtml(comment) }} />
                        </td>
                        <td>
                          {(() => {
                            const status = review.TrangThai || 'Chờ duyệt';
                            const baseStyle = { display: 'inline-block', padding: '6px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 };
                            if (status === 'Chờ duyệt') return <span style={{ ...baseStyle, background: '#fff7e6', color: '#ad6800', border: '1px solid #ffe7ba' }}>{status}</span>;
                            if (status === 'Hiển thị') return <span style={{ ...baseStyle, background: '#f6ffed', color: '#237804', border: '1px solid #b7eb8f' }}>{status}</span>;
                            if (status === 'Ẩn') return <span style={{ ...baseStyle, background: '#fff1f0', color: '#a8071a', border: '1px solid #ffccc7' }}>{status}</span>;
                            return <span style={{ ...baseStyle, background: '#f0f0f0', color: '#444' }}>{status}</span>;
                          })()}
                        </td>
                        <td>{date}</td>
                        <td>
                          <div className={styles.tableActions}>
                            <button className={`${styles.tableAction} ${styles.tableActionSuccess}`} title="Duyệt" onClick={() => handleApprove(id)}>✅</button>
                            <button className={`${styles.tableAction} ${styles.tableActionDanger}`} title="Từ chối" onClick={() => handleReject(id)}>❌</button>
                            <button className={styles.tableAction} title="Xóa" onClick={() => handleDelete(id)}>🗑️</button>
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
          {filteredReviews.length > 0 && (
            <div className={styles.tablePagination}>
              <div className={styles.tablePaginationInfo}>
                Hiển thị {filteredReviews.length} trên {reviews.length} đánh giá
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
      </AdminResponsiveContainer>
    </div>
  );
};

export default ManageReviews;
