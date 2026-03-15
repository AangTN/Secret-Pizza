import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCombosAdmin, fetchComboById, assetUrl, api } from '../../services/api';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import { AdminResponsiveContainer } from '../../components/admin/AdminResponsiveContainer';

const ManageCombos = () => {
  const [combos, setCombos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const navigate = useNavigate();

  // Format datetime helper
  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchCombosAdmin().catch(() => ({ data: [] }));
        if (!mounted) return;
        // Backend returns { data: [...] }
        const list = res?.data || [];
        console.log('Fetched combos:', list);
        setCombos(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error loading combos:', err);
        if (mounted) setCombos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredCombos = combos.filter(combo =>
    combo.TenCombo?.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewDetail = async (combo) => {
    if (!combo || !combo.MaCombo) return;
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const detail = await fetchComboById(combo.MaCombo);
      setSelectedCombo(detail);
    } catch (err) {
      console.error('Lỗi khi tải chi tiết combo:', err);
      alert('Không thể tải chi tiết combo');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedCombo(null);
  };

  const handleEdit = (combo) => {
    if (!combo || !combo.MaCombo) return;
    navigate(`/admin/combos/edit/${combo.MaCombo}`);
  };

  const handleToggleStatus = async (combo) => {
    if (!combo || !combo.MaCombo) return;
    const newStatus = combo.TrangThai === 'Active' ? 'Inactive' : 'Active';
    const actionText = newStatus === 'Active' ? 'mở khóa' : 'khóa';
    const confirmed = window.confirm(`Bạn có chắc muốn ${actionText} combo "${combo.TenCombo}"?`);
    if (!confirmed) return;
    
    try {
      const res = await api.patch(`/api/combos/${combo.MaCombo}/status`, { status: newStatus });
      setCombos(prev => prev.map(c => c.MaCombo === combo.MaCombo ? { ...c, TrangThai: newStatus } : c));
      alert(res.data?.message || `${actionText === 'khóa' ? 'Khóa' : 'Mở khóa'} combo thành công`);
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái combo:', err);
      alert(err?.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleDelete = async (combo) => {
    if (!combo || !combo.MaCombo) return;
    const confirmed = window.confirm(`Bạn có chắc muốn xóa combo "${combo.TenCombo}"?`);
    if (!confirmed) return;
    try {
      await api.delete(`/api/combos/${combo.MaCombo}`);
      setCombos(prev => prev.filter(c => c.MaCombo !== combo.MaCombo));
      alert('Xóa combo thành công');
    } catch (err) {
      console.error('Lỗi khi xóa combo:', err);
      alert(err?.response?.data?.message || 'Không thể xóa combo');
    }
  };

  const ComboCard = ({ combo, index }) => (
    <div
      className={`${styles.adminTableCard} admin-animate-slide-up`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={styles.cardImageWrapper}>
        <img
          src={assetUrl(combo.HinhAnh)}
          alt={combo.TenCombo}
          className={styles.cardImageSmall}
          onError={(e) => { e.target.src = '/placeholder.png'; }}
        />
      </div>
      <div className={styles.cardContent}>
        <h5 className={styles.cardTitle} title={combo.TenCombo}>{combo.TenCombo}</h5>
        {combo.MoTa && (
          <p className={styles.cardSubtitleSmall}>
            {combo.MoTa.length > 80 ? combo.MoTa.slice(0, 80) + '...' : combo.MoTa}
          </p>
        )}
        <div className={styles.cardDetails}>
          <div className={styles.cardDetailRow}>
            <span className={styles.cardLabel}>Giá:</span>
            <span className={styles.cardValue}>{Number(combo.GiaCombo).toLocaleString('vi-VN')}đ</span>
          </div>
          <div className={styles.cardDetailRow}>
            <span className={styles.cardLabel}>Trạng thái:</span>
            <span className={`${styles.badge} ${combo.TrangThai === 'Active' ? styles.badgeSuccess : styles.badgeWarning}`}>
              {combo.TrangThai}
            </span>
          </div>
          <div className={styles.cardDetailRow}>
            <span className={styles.cardLabel}>Ngày tạo:</span>
            <span className={styles.cardValue}>{new Date(combo.NgayTao).toLocaleDateString('vi-VN')}</span>
          </div>
          <div className={styles.cardDetailRow}>
            <span className={styles.cardLabel}>Ngày hết hạn:</span>
            <span className={styles.cardValue}>{formatDateTime(combo.ThoiGianHetHan)}</span>
          </div>
        </div>
        <div className={styles.cardActions}>
          <button
            onClick={() => handleEdit(combo)}
            className={`${buttonStyles.button} ${buttonStyles.buttonSuccess} ${buttonStyles.buttonIcon} ${buttonStyles.buttonIconSmall}`}
            title="Chỉnh sửa"
          >
            ✏️
          </button>
          <button
            onClick={() => handleToggleStatus(combo)}
            className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonIcon} ${buttonStyles.buttonIconSmall}`}
            title={combo.TrangThai === 'Active' ? 'Khóa' : 'Mở khóa'}
          >
            {combo.TrangThai === 'Active' ? '🔒' : '🔓'}
          </button>
          <button
            onClick={() => handleDelete(combo)}
            className={`${buttonStyles.button} ${buttonStyles.buttonDanger} ${buttonStyles.buttonIcon} ${buttonStyles.buttonIconSmall}`}
            title="Xóa"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );

  const cardComponent = (
    <div className={styles.adminTableCards}>
      {filteredCombos.map((combo, index) => (
        <ComboCard key={combo.MaCombo} combo={combo} index={index} />
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
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Quản lý Combo</h2>
              <p className={cardStyles.cardSubtitle}>Tổng số: {combos.length} combo</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className={formStyles.formSearch}>
                <span className={formStyles.formSearchIcon}>🔍</span>
                <input
                  type="search"
                  className={`${formStyles.formInput} ${formStyles.formSearchInput}`}
                  placeholder="Tìm combo..."
                  style={{ minWidth: 280 }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
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
              <button
                className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge}`}
                onClick={() => navigate('/admin/combos/add')}
              >
                <span>+</span> Thêm combo
              </button>
            </div>
          </div>
        </div>

        <div className={cardStyles.cardBodyPremium}>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          ) : filteredCombos.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <p className="text-muted mt-3">Không tìm thấy combo nào</p>
            </div>
          ) : (
            <AdminResponsiveContainer
              data={filteredCombos}
              loading={loading}
              empty={filteredCombos.length === 0}
              cardComponent={cardComponent}
            >
              <div className={`${styles.tableContainerPremium} ${styles.tableAnimateIn}`}>
                <div className={styles.tableResponsive}>
                  <table className={`${styles.table} ${styles.tableRowHover}`}>
                    <thead className={styles.tableHeaderPrimary}>
                      <tr>
                        <th style={{ width: 80 }}>
                          <div className={styles.tableSortable}>
                            <span>#</span>
                            <span className={styles.tableSortIcon}></span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.tableSortable}>
                            <span>Tên combo</span>
                            <span className={styles.tableSortIcon}></span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.tableSortable}>
                            <span>Giá</span>
                            <span className={styles.tableSortIcon}></span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.tableSortable}>
                            <span>Trạng thái</span>
                            <span className={styles.tableSortIcon}></span>
                          </div>
                        </th>
                        <th style={{ width: 120 }}>Ngày tạo</th>
                        <th style={{ width: 120 }}>Ngày hết hạn</th>
                        <th style={{ width: 180 }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="text-center py-5">
                            <div className={styles.tableLoadingOverlay}>
                              <div className={styles.tableLoadingSpinner}></div>
                            </div>
                            <div className="mt-3">
                              <small className="text-muted">Đang tải dữ liệu...</small>
                            </div>
                          </td>
                        </tr>
                      ) : filteredCombos.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <div className={styles.tableEmpty}>
                              <div className={styles.tableEmptyIcon}>📦</div>
                              <div className={styles.tableEmptyTitle}>Không tìm thấy combo</div>
                              <div className={styles.tableEmptyDescription}>
                                {search ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có dữ liệu combo'}
                              </div>
                              <button
                                className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                                onClick={() => setSearch('')}
                              >
                                Xóa bộ lọc
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredCombos.map((combo, index) => (
                          <tr key={combo.MaCombo} className="admin-animate-slide-up">
                            <td className={styles.tableCellBold}>
                              <span className="badge bg-light text-dark border">{index + 1}</span>
                            </td>
                            <td>
                              <div className="d-flex align-items-start gap-3">
                                <div className="flex-shrink-0">
                                  {(() => {
                                    const rawImg = combo.HinhAnh;
                                    const imgPath = rawImg ? (String(rawImg).startsWith('/') ? String(rawImg) : `/images/AnhCombo/${rawImg}`) : null;
                                    const imgSrc = imgPath ? assetUrl(imgPath) : '/placeholder.svg';
                                    return (
                                      <div style={{ width: 56, height: 56 }} className="overflow-hidden rounded-2 bg-light d-flex align-items-center justify-content-center">
                                        <img src={imgSrc} alt={combo.TenCombo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { try { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; } catch {} }} />
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <div className="fw-semibold">{combo.TenCombo}</div>
                                  <div className={styles.tableCellMuted}>
                                    <small>Mã: {combo.MaCombo}</small>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={styles.tableCellText}>{Number(combo.GiaCombo).toLocaleString('vi-VN')}đ</span>
                            </td>
                            <td>
                              {combo.TrangThai ? (
                                <span className={`${styles.tableBadge} ${combo.TrangThai === 'Active' ? styles.tableBadgeActive : styles.tableBadgeInactive}`}>
                                  {combo.TrangThai}
                                </span>
                              ) : (
                                <span className={styles.tableCellMuted}>—</span>
                              )}
                            </td>
                            <td>
                              <small>{new Date(combo.NgayTao).toLocaleDateString('vi-VN')}</small>
                            </td>
                            <td>
                              <small>{formatDateTime(combo.ThoiGianHetHan)}</small>
                            </td>
                            <td>
                              <div className={styles.tableActions}>
                                <button
                                  className={`${styles.tableAction} ${styles.tableActionSuccess}`}
                                  title="Chỉnh sửa"
                                  onClick={() => handleEdit(combo)}
                                >
                                  ✏️
                                </button>
                                <button
                                  className={`${styles.tableAction}`}
                                  title={combo.TrangThai === 'Active' ? 'Khóa' : 'Mở khóa'}
                                  onClick={() => handleToggleStatus(combo)}
                                >
                                  {combo.TrangThai === 'Active' ? '🔒' : '🔓'}
                                </button>
                                <button
                                  className={`${styles.tableAction} ${styles.tableActionDanger}`}
                                  title="Xóa"
                                  onClick={() => handleDelete(combo)}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {!loading && filteredCombos.length > 0 && (
                  <div className={styles.tablePagination}>
                    <div className={styles.tablePaginationInfo}>
                      Hiển thị {filteredCombos.length} trên {combos.length} combo
                    </div>
                    <div className={styles.tablePaginationControls}>
                      <button className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`} disabled>←</button>
                      <span className="px-3 py-1"><strong>1</strong> / 1</span>
                      <button className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`} disabled>→</button>
                    </div>
                  </div>
                )}
              </div>
            </AdminResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết Combo</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                {detailLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                  </div>
                ) : selectedCombo ? (
                  <div>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <img
                          src={assetUrl(selectedCombo.HinhAnh)}
                          alt={selectedCombo.TenCombo}
                          className="img-fluid rounded"
                          onError={(e) => { e.target.src = '/placeholder.png'; }}
                        />
                      </div>
                      <div className="col-md-8">
                        <h4>{selectedCombo.TenCombo}</h4>
                        <p className="text-muted">{selectedCombo.MoTa}</p>
                        <div className="mb-2">
                          <strong>Giá: </strong>
                          <span className="text-success fs-5">{Number(selectedCombo.GiaCombo).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="mb-2">
                          <strong>Trạng thái: </strong>
                          <span className={`badge ${selectedCombo.TrangThai === 'Active' ? 'bg-success' : 'bg-warning'}`}>
                            {selectedCombo.TrangThai}
                          </span>
                        </div>
                        <div className="mb-2">
                          <strong>Ngày tạo: </strong>
                          {new Date(selectedCombo.NgayTao).toLocaleString('vi-VN')}
                        </div>
                        <div className="mb-2">
                          <strong>Ngày cập nhật: </strong>
                          {new Date(selectedCombo.NgayCapNhat).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>

                    <hr />

                    <h5 className="mb-3">Món ăn trong Combo</h5>
                    {selectedCombo.Items && selectedCombo.Items.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th>Hình ảnh</th>
                              <th>Tên món</th>
                              <th>Size</th>
                              <th>Đế bánh</th>
                              <th>Giá gốc</th>
                              <th>Số lượng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCombo.Items.map((item, idx) => (
                              <tr key={idx}>
                                <td>
                                  {item.BienTheMonAn?.MonAn?.HinhAnh && (
                                    <img
                                      src={assetUrl(item.BienTheMonAn.MonAn.HinhAnh)}
                                      alt={item.BienTheMonAn.MonAn.TenMonAn}
                                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                                      onError={(e) => { e.target.src = '/placeholder.png'; }}
                                    />
                                  )}
                                </td>
                                <td>{item.BienTheMonAn?.MonAn?.TenMonAn || 'N/A'}</td>
                                <td>{item.BienTheMonAn?.Size?.TenSize || 'N/A'}</td>
                                <td>{item.DeBanh?.TenDeBanh || 'N/A'}</td>
                                <td>{Number(item.BienTheMonAn?.GiaBan || 0).toLocaleString('vi-VN')}đ</td>
                                <td className="text-center">{item.SoLuong}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted">Không có món ăn nào trong combo này</p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted">Không có dữ liệu</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
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

export default ManageCombos;
