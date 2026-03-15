import React, { useEffect, useState } from 'react';
import { fetchCategories, api } from '../../services/api';
import { AdminResponsiveContainer } from '../../components/admin/AdminResponsiveContainer';
import { SimpleEntityCard } from '../../components/admin/AdminTableCard';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ tenDanhMuc: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetchCategories().catch(() => []);
      setCategories(Array.isArray(res) ? res : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await loadCategories();
    })();
    return () => { mounted = false; };
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ tenDanhMuc: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({ tenDanhMuc: category.TenDanhMuc || '' });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ tenDanhMuc: '' });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const tenDanhMuc = formData.tenDanhMuc.trim();
    if (!tenDanhMuc) {
      setFormError('Vui lòng nhập tên danh mục');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        // Update existing category
        const res = await api.put(`/api/categories/${editingCategory.MaDanhMuc}`, { tenDanhMuc });
        alert(res?.data?.message || 'Cập nhật danh mục thành công');
      } else {
        // Create new category
        const res = await api.post('/api/categories', { tenDanhMuc });
        alert(res?.data?.message || 'Thêm danh mục thành công');
      }
      closeModal();
      // Reload all categories after successful add/edit
      await loadCategories();
    } catch (err) {
      console.error('Lỗi khi lưu danh mục:', err);
      setFormError(err?.response?.data?.message || err.message || 'Không thể lưu danh mục');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    openEditModal(category);
  };

  const handleDelete = async (category) => {
    if (!category || !category.MaDanhMuc) return;
    const confirmed = window.confirm(`Bạn có chắc muốn xóa danh mục "${category.TenDanhMuc}"?`);
    if (!confirmed) return;
    try {
      const res = await api.delete(`/api/categories/${category.MaDanhMuc}`);
      alert(res?.data?.message || 'Xóa danh mục thành công');
      // Reload all categories after successful delete
      await loadCategories();
    } catch (err) {
      console.error('Lỗi khi xóa danh mục:', err);
      alert(err?.response?.data?.message || err.message || 'Không thể xóa danh mục');
    }
  };

  // Card component for mobile view
  const cardComponent = (
    <div className={styles.adminTableCards}>
      {categories.map((category, index) => (
        <SimpleEntityCard
          key={category.MaDanhMuc}
          data={category}
          type="category"
          onEdit={() => handleEdit(category)}
          onDelete={() => handleDelete(category)}
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
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>Quản lý danh mục</h2>
              <p className={cardStyles.cardSubtitle}>Tổng số: {categories.length} danh mục</p>
            </div>
            <button 
              className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge}`}
              onClick={openAddModal}
            >
              <span>+</span> Thêm danh mục
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Table/Card Section */}
      <AdminResponsiveContainer
        data={categories}
        loading={loading}
        empty={categories.length === 0}
        cardComponent={cardComponent}
        onResponsiveChange={(responsiveInfo) => {
          console.log('Categories view changed:', responsiveInfo);
        }}
        accessibility={{
          announceViewChanges: true,
          viewChangeMessage: 'Categories view changed to {view}'
        }}
        className="categories-responsive-container"
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
                      <span>Tên danh mục</span>
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
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className={styles.tableEmpty}>
                        <div className={styles.tableEmptyIcon}>📁</div>
                        <div className={styles.tableEmptyTitle}>Chưa có danh mục</div>
                        <div className={styles.tableEmptyDescription}>
                          Bắt đầu thêm danh mục đầu tiên để quản lý sản phẩm của bạn
                        </div>
                        <button 
                          className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                          onClick={openAddModal}
                        >
                          Thêm danh mục mới
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  categories.map((cat, idx) => (
                    <tr key={cat.MaDanhMuc} className="admin-animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
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
                              background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
                            }}
                          >
                            <span style={{ fontSize: 18 }}>📁</span>
                          </div>
                          <div>
                            <div className={styles.tableCellBold}>{cat.TenDanhMuc}</div>
                            <small className={styles.tableCellMuted}>Mã: {cat.MaDanhMuc}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button 
                            className={`${styles.tableAction} ${styles.tableActionSuccess}`}
                            title="Chỉnh sửa"
                            onClick={() => handleEdit(cat)}
                          >
                            ✏️
                          </button>
                          <button 
                            className={`${styles.tableAction} ${styles.tableActionDanger}`}
                            title="Xóa"
                            onClick={() => handleDelete(cat)}
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
          {!loading && categories.length > 0 && (
            <div className={styles.tablePagination}>
              <div className={styles.tablePaginationInfo}>
                Hiển thị {categories.length} danh mục
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
                  {editingCategory ? '✏️ Chỉnh sửa danh mục' : '➕ Thêm danh mục mới'}
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
                      Tên danh mục <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`${formStyles.formInput}`}
                      placeholder="VD: Hải Sản, Bò, Gà, Bán Chạy..."
                      value={formData.tenDanhMuc}
                      onChange={(e) => setFormData({ tenDanhMuc: e.target.value })}
                      disabled={submitting}
                      autoFocus
                      required
                    />
                    <small className="text-muted d-block mt-1">
                      Danh mục giúp phân loại và tìm kiếm sản phẩm dễ dàng hơn
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
                        {editingCategory ? '💾 Cập nhật' : '➕ Thêm mới'}
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

export default ManageCategories;
