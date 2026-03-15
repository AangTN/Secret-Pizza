import React, { useEffect, useState } from 'react';
import { api, fetchGifts, assetUrl } from '../../services/api';
import { AdminResponsiveContainer } from '../../components/admin/AdminResponsiveContainer';
import { SimpleEntityCard } from '../../components/admin/AdminTableCard';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';

const RARITY_LEVELS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Secret'];

const ManageGifts = () => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [deletingGift, setDeletingGift] = useState(null);
  const [formData, setFormData] = useState({
    tenQuaTang: '',
    moTa: '',
    capDo: 'Common'
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [allPercentages, setAllPercentages] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadGifts = async () => {
    try {
      setLoading(true);
      const data = await fetchGifts();
      setGifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load gifts:', err);
      setGifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await loadGifts();
    })();
    return () => { mounted = false; };
  }, []);

  const getExistingRarities = () => {
    return new Set(gifts.map(g => g.CapDo));
  };

  const getAvailableRarities = () => {
    const existing = getExistingRarities();
    return RARITY_LEVELS.filter(r => !existing.has(r));
  };

  const canAddGift = () => {
    return getAvailableRarities().length > 0;
  };

  const openAddModal = () => {
    if (!canAddGift()) {
      alert('Đã có đủ 5 cấp độ hiếm. Vui lòng xóa một quà tặng trước khi thêm mới.');
      return;
    }

    const available = getAvailableRarities();
    setEditingGift(null);
    setFormData({
      tenQuaTang: '',
      moTa: '',
      capDo: available[0] || 'Common'
    });

    // Initialize percentages for all existing gifts
    const percentages = {};
    gifts.forEach(g => {
      percentages[g.CapDo] = g.TyLeXuatHien || '';
    });
    // Add empty for new gift
    percentages[available[0] || 'Common'] = '';
    setAllPercentages(percentages);
    
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (gift) => {
    setEditingGift(gift);
    setFormData({
      tenQuaTang: gift.TenQuaTang || '',
      moTa: gift.MoTa || '',
      capDo: gift.CapDo || 'Common'
    });
    setImageFile(null);
    setImagePreview(null);

    // Initialize percentages for all existing gifts
    const percentages = {};
    gifts.forEach(g => {
      percentages[g.CapDo] = g.TyLeXuatHien || '';
    });
    setAllPercentages(percentages);
    
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGift(null);
    setFormData({
      tenQuaTang: '',
      moTa: '',
      capDo: 'Common'
    });
    setImageFile(null);
    setImagePreview(null);
    setAllPercentages({});
    setFormError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const openDeleteModal = (gift) => {
    setDeletingGift(gift);
    
    // Initialize percentages for all gifts EXCEPT the one being deleted
    const percentages = {};
    gifts.filter(g => g.MaQuaTang !== gift.MaQuaTang).forEach(g => {
      percentages[g.CapDo] = g.TyLeXuatHien || '';
    });
    setAllPercentages(percentages);
    
    setFormError('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingGift(null);
    setAllPercentages({});
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const tenQuaTang = formData.tenQuaTang.trim();
    const moTa = formData.moTa.trim();

    if (!tenQuaTang) {
      setFormError('Vui lòng nhập tên quà tặng');
      return;
    }
    if (!moTa) {
      setFormError('Vui lòng nhập mô tả');
      return;
    }

    // Validate all percentages
    const rarities = Object.keys(allPercentages);
    let totalPercent = 0;
    
    for (const rarity of rarities) {
      const val = parseFloat(allPercentages[rarity]);
      if (!val || val <= 0 || val > 100) {
        setFormError(`Tỷ lệ xuất hiện của ${rarity} phải từ 0 đến 100`);
        return;
      }
      totalPercent += val;
    }

    if (Math.abs(totalPercent - 100) > 0.01) {
      setFormError(`Tổng tỷ lệ phải bằng 100% (hiện tại: ${totalPercent.toFixed(2)}%)`);
      return;
    }

    setSubmitting(true);
    try {
      if (editingGift) {
        // Edit gift - use FormData
        const formDataObj = new FormData();
        formDataObj.append('MaQuaTang', editingGift.MaQuaTang);
        formDataObj.append('MoTa', moTa);
        formDataObj.append('percentages', JSON.stringify(allPercentages));
        if (imageFile) {
          formDataObj.append('file', imageFile);
        }
        
        const percentagesLog = gifts.map(g => ({
          MaQuaTang: g.MaQuaTang,
          TyLe: allPercentages[g.CapDo] + '%'
        }));
        console.log('📝 SỬA QUÀ TẶNG - Payload gửi đi:', {
          MaQuaTang: editingGift.MaQuaTang,
          hasImage: !!imageFile,
          percentages: percentagesLog
        });
        
        await api.put('/api/gifts', formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        alert('Cập nhật quà tặng thành công');
      } else {
        // Add new gift - use FormData
        const formDataObj = new FormData();
        formDataObj.append('TenQuaTang', tenQuaTang);
        formDataObj.append('MoTa', moTa);
        formDataObj.append('CapDo', formData.capDo);
        formDataObj.append('percentages', JSON.stringify(allPercentages));
        if (imageFile) {
          formDataObj.append('file', imageFile);
        }
        
        const percentagesLog = gifts.map(g => ({
          MaQuaTang: g.MaQuaTang,
          TyLe: allPercentages[g.CapDo] + '%'
        }));
        percentagesLog.push({
          MaQuaTang: 'NEW',
          TenQuaTang: tenQuaTang,
          CapDo: formData.capDo,
          TyLe: allPercentages[formData.capDo] + '%'
        });
        console.log('➕ THÊM QUÀ TẶNG MỚI - Payload gửi đi:', {
          hasImage: !!imageFile,
          percentages: percentagesLog
        });
        
        await api.post('/api/gifts', formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        alert('Thêm quà tặng thành công');
      }
      closeModal();
      await loadGifts();
    } catch (err) {
      console.error('Error saving gift:', err);
      setFormError(err?.response?.data?.message || err.message || 'Không thể lưu quà tặng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (gift) => {
    openEditModal(gift);
  };

  const handleDeleteClick = (gift) => {
    if (!gift || !gift.MaQuaTang) return;
    openDeleteModal(gift);
  };

  const handleDeleteConfirm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!deletingGift) return;

    // Validate all percentages
    const rarities = Object.keys(allPercentages);
    let totalPercent = 0;
    
    for (const rarity of rarities) {
      const val = parseFloat(allPercentages[rarity]);
      if (!val || val <= 0 || val > 100) {
        setFormError(`Tỷ lệ xuất hiện của ${rarity} phải từ 0 đến 100`);
        return;
      }
      totalPercent += val;
    }

    if (Math.abs(totalPercent - 100) > 0.01) {
      setFormError(`Tổng tỷ lệ phải bằng 100% (hiện tại: ${totalPercent.toFixed(2)}%)`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        MaQuaTang: deletingGift.MaQuaTang,
        percentages: allPercentages
      };

      const percentagesLog = gifts.filter(g => g.MaQuaTang !== deletingGift.MaQuaTang).map(g => ({
        MaQuaTang: g.MaQuaTang,
        TyLe: allPercentages[g.CapDo] + '%'
      }));
      console.log('🗑️ XÓA QUÀ TẶNG - Payload gửi đi:', {
        MaQuaTang: deletingGift.MaQuaTang,
        percentages: percentagesLog
      });

      await api.delete('/api/gifts', { data: payload });
      alert('Xóa quà tặng thành công');
      closeDeleteModal();
      await loadGifts();
    } catch (err) {
      console.error('Error deleting gift:', err);
      setFormError(err?.response?.data?.message || err.message || 'Không thể xóa quà tặng');
    } finally {
      setSubmitting(false);
    }
  };

  // Card component for mobile view
  const cardComponent = (
    <div className={styles.adminTableCards}>
      {gifts.map((gift, index) => (
        <div key={gift.MaQuaTang} className="card mb-3 shadow-sm" style={{ animationDelay: `${index * 0.05}s` }}>
          <div className="card-body">
            <div className="d-flex align-items-start gap-3 mb-3">
              <img 
                src={assetUrl(gift.HinhAnh)} 
                alt={gift.TenQuaTang}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
                onError={(e) => { e.target.src = assetUrl('/images/placeholder.png'); }}
              />
              <div className="flex-grow-1">
                <h5 className="mb-1">{gift.TenQuaTang}</h5>
                <div className="d-flex gap-2 mb-2">
                  <span className={`badge ${gift.CapDo === 'Secret' ? 'bg-danger' : gift.CapDo === 'Epic' ? 'bg-warning text-dark' : gift.CapDo === 'Rare' ? 'bg-info' : gift.CapDo === 'Uncommon' ? 'bg-success' : 'bg-secondary'}`}>
                    {gift.CapDo}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-muted small mb-2">{gift.MoTa}</p>
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">Tỷ lệ: {gift.TyLeXuatHien}%</small>
              <div className={styles.tableActions}>
                <button 
                  className={`${styles.tableAction} ${styles.tableActionSuccess}`}
                  title="Chỉnh sửa"
                  onClick={() => handleEdit(gift)}
                >
                  ✏️
                </button>
                <button 
                  className={`${styles.tableAction} ${styles.tableActionDanger}`}
                  title="Xóa"
                  onClick={() => handleDeleteClick(gift)}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
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
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>🎁 Quản lý quà tặng</h2>
              <p className={cardStyles.cardSubtitle}>Tổng số: {gifts.length} quà tặng</p>
            </div>
            <button 
              className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge}`}
              onClick={openAddModal}
              disabled={!canAddGift()}
              title={!canAddGift() ? 'Đã có đủ 5 cấp độ hiếm' : ''}
            >
              <span>+</span> Thêm quà tặng {!canAddGift() && '(Đã đủ 5 cấp độ)'}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Table/Card Section */}
      <AdminResponsiveContainer
        data={gifts}
        loading={loading}
        empty={gifts.length === 0}
        cardComponent={cardComponent}
        className="gifts-responsive-container"
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
                    </div>
                  </th>
                  <th style={{ width: 100 }}>Hình ảnh</th>
                  <th>Tên quà tặng</th>
                  <th>Mô tả</th>
                  <th style={{ width: 120 }}>Cấp độ</th>
                  <th style={{ width: 100 }}>Tỷ lệ (%)</th>
                  <th style={{ width: 150 }}>Thao tác</th>
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
                ) : gifts.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className={styles.tableEmpty}>
                        <div className={styles.tableEmptyIcon}>🎁</div>
                        <div className={styles.tableEmptyTitle}>Chưa có quà tặng</div>
                        <div className={styles.tableEmptyDescription}>
                          Bắt đầu thêm quà tặng đầu tiên cho khách hàng của bạn
                        </div>
                        <button 
                          className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                          onClick={openAddModal}
                        >
                          Thêm quà tặng mới
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  gifts.map((gift, idx) => (
                    <tr key={gift.MaQuaTang} className="admin-animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <td className={styles.tableCellBold}>
                        <span className="badge bg-light text-dark border">
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <img 
                          src={assetUrl(gift.HinhAnh)} 
                          alt={gift.TenQuaTang}
                          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }}
                          onError={(e) => { e.target.src = assetUrl('/images/placeholder.png'); }}
                        />
                      </td>
                      <td>
                        <div className={styles.tableCellBold}>{gift.TenQuaTang}</div>
                        <small className={styles.tableCellMuted}>Mã: {gift.MaQuaTang}</small>
                      </td>
                      <td>
                        <div className={styles.tableCellTruncate} style={{ maxWidth: 250 }}>
                          {gift.MoTa}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          gift.CapDo === 'Secret' ? 'bg-danger' : 
                          gift.CapDo === 'Epic' ? 'bg-warning text-dark' : 
                          gift.CapDo === 'Rare' ? 'bg-info' : 
                          gift.CapDo === 'Uncommon' ? 'bg-success' : 
                          'bg-secondary'
                        }`}>
                          {gift.CapDo}
                        </span>
                      </td>
                      <td className={styles.tableCellBold}>
                        {gift.TyLeXuatHien}%
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button 
                            className={`${styles.tableAction} ${styles.tableActionSuccess}`}
                            title="Chỉnh sửa"
                            onClick={() => handleEdit(gift)}
                          >
                            ✏️
                          </button>
                          <button 
                            className={`${styles.tableAction} ${styles.tableActionDanger}`}
                            title="Xóa"
                            onClick={() => handleDeleteClick(gift)}
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
          
          {/* Table Footer */}
          {!loading && gifts.length > 0 && (
            <div className={styles.tablePagination}>
              <div className={styles.tablePaginationInfo}>
                Hiển thị {gifts.length} quà tặng
              </div>
            </div>
          )}
        </div>
      </AdminResponsiveContainer>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  {editingGift ? '✏️ Chỉnh sửa quà tặng' : '➕ Thêm quà tặng mới'}
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
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className={`${formStyles.formLabel} fw-semibold mb-2`}>
                        Tên quà tặng <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`${formStyles.formInput}`}
                        placeholder="VD: Baby Pizza Santa"
                        value={formData.tenQuaTang}
                        onChange={(e) => setFormData({ ...formData, tenQuaTang: e.target.value })}
                        disabled={submitting || editingGift}
                        required
                      />
                      {editingGift && (
                        <small className="text-muted d-block mt-1">
                          Tên quà tặng không thể chỉnh sửa
                        </small>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className={`${formStyles.formLabel} fw-semibold mb-2`}>
                        Cấp độ <span className="text-danger">*</span>
                      </label>
                      {editingGift ? (
                        <input
                          type="text"
                          className={`${formStyles.formInput}`}
                          value={formData.capDo}
                          disabled
                        />
                      ) : (
                        <select
                          className={`${formStyles.formInput}`}
                          value={formData.capDo}
                          onChange={(e) => {
                            const newCapDo = e.target.value;
                            const oldCapDo = formData.capDo;
                            const newPercentages = { ...allPercentages };
                            
                            // Move percentage to new rarity
                            if (allPercentages[oldCapDo]) {
                              newPercentages[newCapDo] = allPercentages[oldCapDo];
                              delete newPercentages[oldCapDo];
                            } else {
                              newPercentages[newCapDo] = '';
                            }
                            
                            setAllPercentages(newPercentages);
                            setFormData({ ...formData, capDo: newCapDo });
                          }}
                          disabled={submitting}
                          required
                        >
                          {getAvailableRarities().map(rarity => (
                            <option key={rarity} value={rarity}>{rarity}</option>
                          ))}
                        </select>
                      )}
                      {editingGift && (
                        <small className="text-muted d-block mt-1">
                          Cấp độ không thể chỉnh sửa
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className={`${formStyles.formLabel} fw-semibold mb-2`}>
                      Mô tả <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className={`${formStyles.formInput}`}
                      placeholder="Mô tả chi tiết về quà tặng"
                      value={formData.moTa}
                      onChange={(e) => setFormData({ ...formData, moTa: e.target.value })}
                      disabled={submitting}
                      rows={3}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className={`${formStyles.formLabel} fw-semibold mb-2`}>
                      Hình ảnh {!editingGift && <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="file"
                      className={`${formStyles.formInput}`}
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      disabled={submitting}
                      required={!editingGift}
                    />
                    {editingGift && (
                      <small className="text-muted d-block mt-1">
                        Để trống nếu không muốn thay đổi hình ảnh
                      </small>
                    )}
                    {(imagePreview || (editingGift && editingGift.HinhAnh)) && (
                      <div className="mt-2">
                        <img
                          src={imagePreview || assetUrl(editingGift.HinhAnh)}
                          alt="Preview"
                          style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                          className="border rounded p-2"
                        />
                      </div>
                    )}
                  </div>

                  <hr className="my-4" />

                  <div className="mb-3">
                    <label className={`${formStyles.formLabel} fw-semibold mb-2`}>
                      Tỷ lệ xuất hiện tất cả các cấp độ (%) <span className="text-danger">*</span>
                    </label>
                    <small className="text-muted d-block mb-3">
                      Tổng tỷ lệ của tất cả quà tặng phải bằng 100%. Hiện tại: {Object.values(allPercentages).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)}%
                    </small>
                    <div className="row">
                      {Object.keys(allPercentages).sort((a, b) => RARITY_LEVELS.indexOf(a) - RARITY_LEVELS.indexOf(b)).map(rarity => (
                        <div key={rarity} className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">
                            {rarity} {editingGift && rarity === editingGift.CapDo && '(Đang sửa)'}
                            {!editingGift && rarity === formData.capDo && '(Mới)'}
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0-100"
                            value={allPercentages[rarity] || ''}
                            onChange={(e) => setAllPercentages({ ...allPercentages, [rarity]: e.target.value })}
                            disabled={submitting}
                            min="0"
                            max="100"
                            step="0.01"
                            required
                          />
                        </div>
                      ))}
                    </div>
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
                        {editingGift ? '💾 Cập nhật' : '➕ Thêm mới'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal with Percentage Adjustment */}
      {showDeleteModal && deletingGift && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeDeleteModal}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  🗑️ Xóa quà tặng: {deletingGift.TenQuaTang}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={closeDeleteModal}
                  disabled={submitting}
                ></button>
              </div>
              <form onSubmit={handleDeleteConfirm}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
                      <span>⚠️</span>
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="alert alert-warning d-flex align-items-start gap-2 mb-3">
                    <span>⚠️</span>
                    <div>
                      <strong>Cảnh báo:</strong> Bạn đang xóa quà tặng cấp độ <strong>{deletingGift.CapDo}</strong>.
                      <br />
                      Vui lòng phân phối lại tỷ lệ xuất hiện cho các quà tặng còn lại sao cho tổng bằng 100%.
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className={`${formStyles.formLabel} fw-semibold mb-2`}>
                      Tỷ lệ xuất hiện các cấp độ còn lại (%) <span className="text-danger">*</span>
                    </label>
                    <small className="text-muted d-block mb-3">
                      Tổng tỷ lệ phải bằng 100%. Hiện tại: {Object.values(allPercentages).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)}%
                    </small>
                    <div className="row">
                      {Object.keys(allPercentages).sort((a, b) => RARITY_LEVELS.indexOf(a) - RARITY_LEVELS.indexOf(b)).map(rarity => (
                        <div key={rarity} className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">
                            {rarity}
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0-100"
                            value={allPercentages[rarity] || ''}
                            onChange={(e) => setAllPercentages({ ...allPercentages, [rarity]: e.target.value })}
                            disabled={submitting}
                            min="0"
                            max="100"
                            step="0.01"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                    onClick={closeDeleteModal}
                    disabled={submitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={`${buttonStyles.button} btn-danger`}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang xóa...
                      </>
                    ) : (
                      <>
                        🗑️ Xác nhận xóa
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

export default ManageGifts;
