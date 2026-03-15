import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import { AdminResponsiveContainer } from '../../components/admin/AdminResponsiveContainer';
import { BusinessCard } from '../../components/admin/AdminTableCard';
import { api } from '../../services/api';

const ManagePromotions = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/promotions');
      setPromotions(response.data);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      alert('Lỗi khi tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const getPromotionStatus = (promo) => {
    const now = new Date();
    const startDate = new Date(promo.KMBatDau);
    const endDate = new Date(promo.KMKetThuc);

    if (endDate < now) return { text: 'Đã hết hạn', variant: 'Error', icon: '❌' };
    if (promo.TrangThai === 'Inactive') return { text: 'Bị khóa', variant: 'Error', icon: '🔒' };
    if (startDate > now) return { text: 'Chưa bắt đầu', variant: 'Pending', icon: '⏳' };
    return { text: 'Đang áp dụng', variant: 'Active', icon: '✅' };
  };

  const filteredPromotions = useMemo(() => {
    return promotions.filter((promo) => {
      const status = getPromotionStatus(promo);
      const matchQuery = [promo.MaKhuyenMai?.toString(), promo.TenKhuyenMai]
        .some((field) => field?.toLowerCase().includes(query.toLowerCase()));
      const matchStatus = statusFilter === 'all' || status.text === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [promotions, query, statusFilter]);

  const formatDiscount = (promo) => {
    if (promo.KMLoai === 'PERCENT') return `${promo.KMGiaTri}%`;
    return `${Number(promo.KMGiaTri).toLocaleString()} đ`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const handleToggleStatus = async (promotion) => {
    if (processingId) return;
    
    const newStatus = promotion.TrangThai === 'Active' ? 'Inactive' : 'Active';
    const confirmMessage = newStatus === 'Inactive' 
      ? 'Bạn có chắc muốn khóa khuyến mãi này?' 
      : 'Bạn có chắc muốn mở khóa khuyến mãi này?';
    
    if (!confirm(confirmMessage)) return;

    try {
      setProcessingId(promotion.MaKhuyenMai);
      await api.patch(`/api/promotions/${promotion.MaKhuyenMai}/status`, { TrangThai: newStatus });
      fetchPromotions();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeletePromotion = async (promotion) => {
    if (processingId) return;
    if (!confirm('Bạn có chắc muốn xóa khuyến mãi này? Hành động này sẽ không thể hoàn tác.')) return;

    try {
      setProcessingId(promotion.MaKhuyenMai);
      await api.delete(`/api/promotions/${promotion.MaKhuyenMai}`);
      // refresh list
      fetchPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert(error.response?.data?.message || 'Có lỗi khi xóa khuyến mãi');
    } finally {
      setProcessingId(null);
    }
  };

  // Card component for responsive view
  const cardComponent = (
    <div className={styles.adminTableCards}>
      {filteredPromotions.map((promotion, index) => {
        const status = getPromotionStatus(promotion);
        return (
          <BusinessCard
            key={promotion.MaKhuyenMai}
            data={{
              ...promotion,
              code: String(promotion.MaKhuyenMai),
              title: promotion.TenKhuyenMai,
              status: status.text,
              value: formatDiscount(promotion),
            }}
            type="promotion"
            onEdit={() => navigate(`/admin/promotions/${promotion.MaKhuyenMai}`)}
            onToggleStatus={() => handleToggleStatus(promotion)}
            index={index}
            animate={true}
            compact={true}
          />
        );
      })}
    </div>
  );

  return (
    <div className="admin-animate-fade-in">
      {/* Header Section */}
      <div className={`${cardStyles.cardPremium} mb-4`}>
        <div className={cardStyles.cardHeaderPremium}>
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <div>
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Chương trình khuyến mãi</h2>
              <p className={cardStyles.cardSubtitle}>Quản lý mã giảm giá và ưu đãi</p>
            </div>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <div className={formStyles.formSearch}>
                <span className={formStyles.formSearchIcon}>🔍</span>
                <input
                  type="search"
                  className={`${formStyles.formInput} ${formStyles.formSearchInput}`}
                  placeholder="Tìm theo mã hoặc tên chương trình..."
                  style={{ minWidth: 280 }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className={formStyles.formSearchClear}
                    onClick={() => setQuery('')}
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
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Đang áp dụng">Đang áp dụng</option>
                  <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                  <option value="Bị khóa">Bị khóa</option>
                  <option value="Đã hết hạn">Đã hết hạn</option>
                </select>
              </div>
              <button 
                className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge}`}
                onClick={() => navigate('/admin/promotions/new')}
              >
                <span>+</span> Tạo khuyến mãi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section with Enhanced Responsive Container */}
      <AdminResponsiveContainer 
        data={filteredPromotions}
        loading={loading}
        empty={filteredPromotions.length === 0}
        cardComponent={cardComponent}
        onResponsiveChange={(responsiveInfo) => {
          console.log('Promotions view changed:', responsiveInfo);
        }}
        accessibility={{
          announceViewChanges: true,
          viewChangeMessage: 'Promotions view changed to {view}'
        }}
        className="promotions-responsive-container"
      >
        <div className={`${styles.tableContainerPremium} ${styles.tableAnimateIn}`}>
          <div className={styles.tableResponsive}>
            <table className={`${styles.table} ${styles.tableRowHover}`}>
              <thead className={styles.tableHeaderPrimary}>
                <tr>
                  <th style={{ width: 80 }}>Mã KM</th>
                  <th>Tên chương trình</th>
                  <th style={{ width: 100 }}>Giá trị</th>
                  <th style={{ width: 180 }}>Thời gian</th>
                  <th style={{ width: 100 }}>Món áp dụng</th>
                  <th style={{ width: 120 }}>Trạng thái</th>
                  <th style={{ width: 150 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromotions.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className={styles.tableEmpty}>
                        <div className={styles.tableEmptyIcon}>🎁</div>
                        <div className={styles.tableEmptyTitle}>Không tìm thấy khuyến mãi</div>
                        <div className={styles.tableEmptyDescription}>
                          {query || statusFilter !== 'all' 
                            ? 'Thử thay đổi bộ lọc tìm kiếm' 
                            : 'Chưa có chương trình khuyến mãi nào'}
                        </div>
                        <button 
                          className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                          onClick={() => {
                            setQuery('');
                            setStatusFilter('all');
                          }}
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPromotions.map((promo, index) => {
                    const status = getPromotionStatus(promo);
                    return (
                      <tr key={promo.MaKhuyenMai} className="admin-animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                        <td className={styles.tableCellBold}>
                          <span className={`${styles.tableBadge} ${styles.tableBadgeInfo}`}>
                            {promo.MaKhuyenMai}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div 
                              className="rounded-2 bg-gradient d-flex align-items-center justify-content-center"
                              style={{ 
                                width: 40, 
                                height: 40,
                                background: 'linear-gradient(135deg, #ff4d4f 0%, #ff6b6b 100%)'
                              }}
                            >
                              <span style={{ fontSize: 18 }}>🎁</span>
                            </div>
                            <div>
                              <div className={styles.tableCellBold}>{promo.TenKhuyenMai}</div>
                              {promo.MoTa && <small className={styles.tableCellMuted}>{promo.MoTa}</small>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={`${styles.tableCellBold} ${styles.tableCellSuccess}`}>
                            {formatDiscount(promo)}
                          </div>
                        </td>
                        <td>
                          <div className={styles.tableCellMuted}>
                            <small>{formatDate(promo.KMBatDau)}</small>
                            <br />
                            <small>→ {formatDate(promo.KMKetThuc)}</small>
                          </div>
                        </td>
                        <td>
                          <div className={styles.tableCellBold}>
                            {promo.totalFoods || 0}
                          </div>
                          <small className={styles.tableCellMuted}>món</small>
                        </td>
                        <td>
                          <span className={`${styles.tableBadge} ${styles[`tableBadge${status.variant}`]}`}>
                            <span className="me-1">{status.icon}</span>
                            {status.text}
                          </span>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            <button 
                              className={`${styles.tableAction} ${styles.tableActionSuccess}`}
                              title="Chỉnh sửa"
                              onClick={() => navigate(`/admin/promotions/${promo.MaKhuyenMai}`)}
                            >
                              ✏️
                            </button>
                            <button 
                              className={`${styles.tableAction} ${promo.TrangThai === 'Active' ? styles.tableActionDanger : styles.tableActionWarning}`}
                              title={promo.TrangThai === 'Active' ? 'Khóa' : 'Mở khóa'}
                              onClick={() => handleToggleStatus(promo)}
                              disabled={processingId === promo.MaKhuyenMai}
                            >
                              {processingId === promo.MaKhuyenMai ? '⏳' : (promo.TrangThai === 'Active' ? '🔒' : '🔓')}
                            </button>
                            <button
                              className={`${styles.tableAction} ${styles.tableActionDanger}`}
                              title="Xóa"
                              onClick={() => handleDeletePromotion(promo)}
                              disabled={processingId === promo.MaKhuyenMai}
                            >
                              {processingId === promo.MaKhuyenMai ? '⏳' : '🗑️'}
                            </button>
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
          {filteredPromotions.length > 0 && (
            <div className={styles.tablePagination}>
              <div className={styles.tablePaginationInfo}>
                Hiển thị {filteredPromotions.length} trên {promotions.length} khuyến mãi
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

export default ManagePromotions;
