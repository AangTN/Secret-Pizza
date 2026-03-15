import React, { useEffect, useState } from 'react';
import { fetchTypes, api } from '../../services/api';
import { AdminResponsiveContainer } from '../../components/admin/AdminResponsiveContainer';
import { SimpleEntityCard } from '../../components/admin/AdminTableCard';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';

const ManageTypes = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({ tenLoaiMonAn: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadTypes = async () => {
    try {
      setLoading(true);
      const res = await fetchTypes().catch(() => []);
      setTypes(Array.isArray(res) ? res : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await loadTypes();
    })();
    return () => { mounted = false; };
  }, []);

  const openAddModal = () => {
    setEditingType(null);
    setFormData({ tenLoaiMonAn: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (type) => {
    setEditingType(type);
    setFormData({ tenLoaiMonAn: type.TenLoaiMonAn || '' });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({ tenLoaiMonAn: '' });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const tenLoaiMonAn = formData.tenLoaiMonAn.trim();
    if (!tenLoaiMonAn) {
      setFormError('Vui lòng nhập tên thể loại');
      return;
    }

    setSubmitting(true);
    try {
      if (editingType) {
        // Update existing type
        const res = await api.put(`/api/types/${editingType.MaLoaiMonAn}`, { tenLoaiMonAn });
        alert(res?.data?.message || 'Cập nhật thể loại thành công');
      } else {
        // Create new type
        const res = await api.post('/api/types', { tenLoaiMonAn });
        alert(res?.data?.message || 'Thêm thể loại thành công');
      }
      closeModal();
      // Reload all types after successful add/edit
      await loadTypes();
    } catch (err) {
      console.error('Lỗi khi lưu thể loại:', err);
      setFormError(err?.response?.data?.message || err.message || 'Không thể lưu thể loại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (type) => {
    openEditModal(type);
  };

  const handleDelete = async (type) => {
    if (!type || !type.MaLoaiMonAn) return;
    const confirmed = window.confirm(`Bạn có chắc muốn xóa thể loại "${type.TenLoaiMonAn}"?`);
    if (!confirmed) return;
    try {
      const res = await api.delete(`/api/types/${type.MaLoaiMonAn}`);
      alert(res?.data?.message || 'Xóa thể loại thành công');
      // Reload all types after successful delete
      await loadTypes();
    } catch (err) {
      console.error('Lỗi khi xóa thể loại:', err);
      alert(err?.response?.data?.message || err.message || 'Không thể xóa thể loại');
    }
  };

  // Card component for mobile view
  const cardComponent = (
    <div className={styles.adminTableCards}>
      {types.map((type, index) => (
        <SimpleEntityCard
          key={type.MaLoaiMonAn}
          data={type}
          type="type"
          onEdit={() => handleEdit(type)}
          onDelete={() => handleDelete(type)}
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
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Quản lý thể loại món</h2>
              <p className={cardStyles.cardSubtitle}>Tổng số: {types.length} thể loại</p>
            </div>
            <button 
              className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge}`}
              onClick={openAddModal}
            >
              <span>+</span> Thêm thể loại
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Table/Card Section */}
      <AdminResponsiveContainer
        data={types}
        loading={loading}
        empty={types.length === 0}
        cardComponent={cardComponent}
        onResponsiveChange={(responsiveInfo) => {
          console.log('Types view changed:', responsiveInfo);
        }}
        accessibility={{
          announceViewChanges: true,
          viewChangeMessage: 'Types view changed to {view}'
        }}
        className="types-responsive-container"
      >
        {/* Table Section - Desktop View */}
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
                      <span>Tên thể loại</span>
                      <span className={styles.tableSortIcon}></span>
                    </div>
                  </th>
                  <th style={{ width: 180 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-5">
                      <div className={styles.tableLoadingOverlay}>
                        <div className={styles.tableLoadingSpinner}></div>
                      </div>
                      <div className="mt-3">
                        <small className="text-muted">Đang tải dữ liệu...</small>
                      </div>
                    </td>
                  </tr>
                ) : types.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className={styles.tableEmpty}>
                        <div className={styles.tableEmptyIcon}>📂</div>
                        <div className={styles.tableEmptyTitle}>Chưa có thể loại món</div>
                        <div className={styles.tableEmptyDescription}>
                          Tạo thể loại đầu tiên để phân loại các món ăn của bạn
                        </div>
                        <button 
                          className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                          onClick={openAddModal}
                        >
                          Thêm thể loại mới
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  types.map((type, idx) => (
                    <tr key={type.MaLoaiMonAn} className="admin-animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <td className={styles.tableCellBold}>
                        <span className="badge bg-light text-dark border">
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div 
                            className="rounded-2 bg-gradient d-flex align-items-center justify-content-center"
                            style={{ 
                              width: 40, 
                              height: 40,
                              background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                            }}
                          >
                            <span style={{ fontSize: 18 }}>📂</span>
                          </div>
                          <div>
                            <div className={styles.tableCellBold}>{type.TenLoaiMonAn}</div>
                            <small className={styles.tableCellMuted}>Mã: {type.MaLoaiMonAn}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button 
                            className={`${styles.tableAction} ${styles.tableActionSuccess}`}
                            title="Chỉnh sửa"
                            onClick={() => handleEdit(type)}
                          >
                            ✏️
                          </button>
                          <button 
                            className={`${styles.tableAction} ${styles.tableActionDanger}`}
                            title="Xóa"
                            onClick={() => handleDelete(type)}
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
          
          {/* Table Footer with Pagination */}
          {!loading && types.length > 0 && (
            <div className={styles.tablePagination}>
              <div className={styles.tablePaginationInfo}>
                Hiển thị {types.length} thể loại
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  {editingType ? '✏️ Chỉnh sửa thể loại' : '➕ Thêm thể loại mới'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={closeModal}
                  disabled={submitting}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
                      <span>⚠️</span>
                      <span>{formError}</span>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className={`${formStyles.formLabel} fw-semibold mb-2`}>
                      Tên thể loại <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`${formStyles.formInput}`}
                      placeholder="VD: Pizza, Món chính, Đồ uống..."
                      value={formData.tenLoaiMonAn}
                      onChange={(e) => setFormData({ tenLoaiMonAn: e.target.value })}
                      disabled={submitting}
                      autoFocus
                      required
                    />
                    <small className="text-muted d-block mt-1">
                      Tên thể loại sẽ hiển thị trong menu và phân loại sản phẩm
                    </small>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={`${buttonStyles.button} ${buttonStyles.buttonPrimary}`}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        {editingType ? '💾 Cập nhật' : '➕ Thêm mới'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTypes;
