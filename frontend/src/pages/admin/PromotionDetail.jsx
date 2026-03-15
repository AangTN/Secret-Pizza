import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import { api, assetUrl, fetchFoodsAdmin } from '../../services/api';

const PromotionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [allFoods, setAllFoods] = useState([]);
  const [selectedFoodIds, setSelectedFoodIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [formData, setFormData] = useState({
    TenKhuyenMai: '',
    MoTa: '',
    KMLoai: 'PERCENT',
    KMGiaTri: '',
    KMBatDau: '',
    KMKetThuc: '',
    TrangThai: 'Active',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load all foods
      const foods = await fetchFoodsAdmin();
      setAllFoods(foods);

      // Load promotion if editing
      if (!isNew) {
        setLoading(true);
        const response = await api.get(`/api/promotions/${id}`);
        const promo = response.data;
        
        setFormData({
          TenKhuyenMai: promo.TenKhuyenMai,
          MoTa: promo.MoTa || '',
          KMLoai: promo.KMLoai,
          KMGiaTri: promo.KMGiaTri,
          KMBatDau: promo.KMBatDau ? new Date(promo.KMBatDau).toISOString().slice(0, 16) : '',
          KMKetThuc: promo.KMKetThuc ? new Date(promo.KMKetThuc).toISOString().slice(0, 16) : '',
          TrangThai: promo.TrangThai,
        });

        // Set selected foods
        const foodIds = promo.foods?.map(f => f.MaMonAn) || [];
        setSelectedFoodIds(foodIds);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    let list = allFoods;

    if (query) {
      list = list.filter(food => 
        (food.TenMonAn || '').toLowerCase().includes(query) ||
        food.MaMonAn.toString().includes(query)
      );
    }

    // Type filter (expects MaLoaiMonAn)
    if (categoryFilter) {
      list = list.filter(food => food.LoaiMonAn && String(food.LoaiMonAn.MaLoaiMonAn) === String(categoryFilter));
    }


    return list;
  }, [allFoods, searchQuery, categoryFilter]);

  const availableFoods = useMemo(() => {
    const currentStart = formData.KMBatDau ? new Date(formData.KMBatDau) : null;
    const currentEnd = formData.KMKetThuc ? new Date(formData.KMKetThuc) : null;

    return filteredFoods.filter(f => {
      // Always exclude already-selected
      if (selectedFoodIds.includes(f.MaMonAn)) return false;

      // If we don't have a date range for the current promo, don't exclude by overlap
      if (!currentStart || !currentEnd) return true;

      const promos = f.KhuyenMai || [];
      // Support both shapes: [{KhuyenMai: {...}}] or [{...}]
      const promoObjs = promos.map(p => (p && p.KhuyenMai) ? p.KhuyenMai : p).filter(Boolean);

      const hasOverlap = promoObjs.some(promo => {
        if (!promo.KMBatDau || !promo.KMKetThuc) return false;
        // If editing an existing promotion, skip overlap check for the same promotion id
        if (!isNew && String(promo.MaKhuyenMai) === String(id)) return false;

        const s = new Date(promo.KMBatDau);
        const e = new Date(promo.KMKetThuc);
        // overlap if promo.start <= currentEnd && promo.end >= currentStart
        return !(e < currentStart || s > currentEnd);
      });

      return !hasOverlap;
    });
  }, [filteredFoods, selectedFoodIds, formData.KMBatDau, formData.KMKetThuc, id, isNew]);

  const getImageUrl = (path) => {
    if (!path) return '/placeholder.png';
    // If already absolute URL, return as-is
    if (/^https?:\/\//i.test(path)) return path;
    return assetUrl(path.replace(/^\//, ''));
  };

  const renderCategories = (dm = []) => {
    if (!Array.isArray(dm) || dm.length === 0) return null;
    return (
      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {dm.slice(0, 4).map(d => (
          <span key={d.MaDanhMuc} style={{ background: '#f0f2f5', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
            {d.TenDanhMuc}
          </span>
        ))}
        {dm.length > 4 && <span style={{ fontSize: 12, color: '#888' }}>+{dm.length - 4}</span>}
      </div>
    );
  };

  const renderPrices = (food) => {
    if (!food.BienTheMonAn || food.BienTheMonAn.length === 0) return <div className="text-muted small" style={{ fontSize: '0.85rem' }}>Chưa có giá</div>;
    
    const variants = food.BienTheMonAn.filter(v => v.TrangThai === 'Active');
    if (variants.length === 0) return <div className="text-muted small" style={{ fontSize: '0.85rem' }}>Ngừng kinh doanh</div>;

    return (
      <div className="d-flex flex-wrap gap-2 mt-1" style={{ fontSize: '0.85rem' }}>
        {variants.map((v) => (
          <span key={v.MaBienThe} className="text-muted bg-light px-2 py-1 rounded border">
            {v.Size ? <span>{v.Size.TenSize}: </span> : null}
            <span className="fw-bold text-dark">{Number(v.GiaBan).toLocaleString()}đ</span>
          </span>
        ))}
      </div>
    );
  };

  const handleToggleFood = (foodId) => {
    // Check if adding
    if (!selectedFoodIds.includes(foodId)) {
      const food = allFoods.find(f => f.MaMonAn === foodId);
      if (formData.KMLoai === 'AMOUNT' || formData.KMLoai === 'SOTIEN') {
        const discountAmount = Number(formData.KMGiaTri);
        if (food && food.BienTheMonAn) {
          const invalidVariants = food.BienTheMonAn.filter(v => Number(v.GiaBan) <= discountAmount);
          if (invalidVariants.length > 0) {
            alert(`Không thể thêm món "${food.TenMonAn}" vào khuyến mãi này.\nGiá giảm (${discountAmount.toLocaleString()}đ) phải nhỏ hơn giá bán của tất cả các biến thể.\nBiến thể vi phạm: ${invalidVariants.map(v => v.Size?.TenSize + ' (' + Number(v.GiaBan).toLocaleString() + 'đ)').join(', ')}`);
            return;
          }
        }
      }
    }

    setSelectedFoodIds(prev => {
      if (prev.includes(foodId)) {
        return prev.filter(id => id !== foodId);
      } else {
        return [...prev, foodId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedFoodIds.length === allFoods.length) {
      setSelectedFoodIds([]);
    } else {
      let validFoods = allFoods;
      if (formData.KMLoai === 'AMOUNT' || formData.KMLoai === 'SOTIEN') {
        const discountAmount = Number(formData.KMGiaTri);
        validFoods = allFoods.filter(food => {
          if (!food.BienTheMonAn || food.BienTheMonAn.length === 0) return true;
          return food.BienTheMonAn.every(v => Number(v.GiaBan) > discountAmount);
        });
        
        if (validFoods.length < allFoods.length) {
          alert(`Đã bỏ qua ${allFoods.length - validFoods.length} món ăn không thỏa mãn điều kiện giá giảm < giá bán.`);
        }
      }
      setSelectedFoodIds(validFoods.map(f => f.MaMonAn));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.TenKhuyenMai.trim()) {
      alert('Vui lòng nhập tên khuyến mãi');
      return;
    }

    try {
      setSaving(true);
      let promotionId = id;

      if (isNew) {
        // Create new promotion
        const response = await api.post('/api/promotions', formData);
        promotionId = response.data.MaKhuyenMai;
        alert('Tạo khuyến mãi thành công');
      } else {
        // Update promotion
        await api.put(`/api/promotions/${id}`, formData);
        alert('Cập nhật khuyến mãi thành công');
      }

      // Update foods list
      await api.put(`/api/promotions/${promotionId}/foods`, {
        foodIds: selectedFoodIds,
      });

      navigate('/admin/promotions');
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price) => {
    return Number(price).toLocaleString('vi-VN') + ' đ';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-animate-fade-in">
      {/* Header */}
      <div className={`${cardStyles.cardPremium} mb-4`}>
        <div className={cardStyles.cardHeaderPremium}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className={`${cardStyles.cardTitleLarge} mb-2`}>
                {isNew ? 'Tạo khuyến mãi mới' : 'Chi tiết khuyến mãi'}
              </h2>
              <p className={cardStyles.cardSubtitle}>
                {isNew ? 'Điền thông tin và chọn món ăn áp dụng' : 'Chỉnh sửa thông tin và danh sách món ăn'}
              </p>
            </div>
            <button
              type="button"
              className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
              onClick={() => navigate('/admin/promotions')}
            >
              ← Quay lại
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Promotion Info (full width) */}
          <div className="col-12">
            <div className={cardStyles.cardPremium}>
              <div className={cardStyles.cardHeaderPremium}>
                <h3 className={cardStyles.cardTitle}>Thông tin khuyến mãi</h3>
              </div>
              <div className={cardStyles.cardBody}>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>
                    Tên khuyến mãi <span className={formStyles.formRequired}>*</span>
                  </label>
                  <input
                    type="text"
                    className={formStyles.formInput}
                    value={formData.TenKhuyenMai}
                    onChange={(e) => setFormData({ ...formData, TenKhuyenMai: e.target.value })}
                    required
                  />
                </div>

                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>Mô tả</label>
                  <textarea
                    className={formStyles.formInput}
                    rows={3}
                    value={formData.MoTa}
                    onChange={(e) => setFormData({ ...formData, MoTa: e.target.value })}
                  />
                </div>

                <div className={formStyles.formRow}>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.formLabel}>
                      Loại giảm giá <span className={formStyles.formRequired}>*</span>
                    </label>
                    <select
                      className={formStyles.formSelect}
                      value={formData.KMLoai}
                      onChange={(e) => setFormData({ ...formData, KMLoai: e.target.value })}
                    >
                      <option value="PERCENT">Phần trăm (%)</option>
                      <option value="AMOUNT">Số tiền (đ)</option>
                    </select>
                  </div>

                  <div className={formStyles.formGroup}>
                    <label className={formStyles.formLabel}>
                      Giá trị <span className={formStyles.formRequired}>*</span>
                    </label>
                    <input
                      type="number"
                      className={formStyles.formInput}
                      value={formData.KMGiaTri}
                      onChange={(e) => setFormData({ ...formData, KMGiaTri: e.target.value })}
                      min="0"
                      max={formData.KMLoai === 'PERCENT' ? '100' : '100000000'}
                      required
                    />
                    <small className={formStyles.formHint}>
                      {formData.KMLoai === 'PERCENT' ? 'Tối đa 100%' : 'Tối đa 100 triệu'}
                    </small>
                  </div>
                </div>

                <div className={formStyles.formRow}>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.formLabel}>Ngày bắt đầu</label>
                    <input
                      type="datetime-local"
                      className={formStyles.formInput}
                      value={formData.KMBatDau}
                      onChange={(e) => setFormData({ ...formData, KMBatDau: e.target.value })}
                    />
                  </div>

                  <div className={formStyles.formGroup}>
                    <label className={formStyles.formLabel}>Ngày kết thúc</label>
                    <input
                      type="datetime-local"
                      className={formStyles.formInput}
                      value={formData.KMKetThuc}
                      onChange={(e) => setFormData({ ...formData, KMKetThuc: e.target.value })}
                    />
                  </div>
                </div>

                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>Trạng thái</label>
                  <select
                    className={formStyles.formSelect}
                    value={formData.TrangThai}
                    onChange={(e) => setFormData({ ...formData, TrangThai: e.target.value })}
                  >
                    <option value="Active">Hoạt động</option>
                    <option value="Inactive">Khóa</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Food selection moved below promotion info (full width) */}
        </div>

        {/* Foods selection - full width card below info */}
        <div className="row g-4 mt-2">
          <div className="col-12">
            <div className={cardStyles.cardPremium}>
              <div className={cardStyles.cardHeaderPremium}>
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className={cardStyles.cardTitle}>
                    Chọn món áp dụng ({selectedFoodIds.length}/{allFoods.length})
                  </h3>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`}
                      onClick={handleSelectAll}
                    >
                      {selectedFoodIds.length === allFoods.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                    <button
                      type="button"
                      className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`}
                      onClick={() => setSelectedFoodIds([])}
                      disabled={selectedFoodIds.length === 0}
                    >
                      Xóa tất cả
                    </button>
                  </div>
                </div>
              </div>
              <div className={cardStyles.cardBody}>
                <div className={formStyles.formSearch} style={{ marginBottom: 16 }}>
                  <span className={formStyles.formSearchIcon}>🔍</span>
                  <input
                    type="search"
                    className={`${formStyles.formInput} ${formStyles.formSearchInput}`}
                    placeholder="Tìm món ăn..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={formStyles.formSearchClear}
                      onClick={() => setSearchQuery('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters moved into right column (available foods) per UX request */}

                <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 12px 1fr', gap: 12 }}>
                  <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong>Đã chọn ({selectedFoodIds.length})</strong>
                    </div>

                    {selectedFoodIds.length === 0 ? (
                      <div className="text-center text-muted py-4">Chưa có món nào được chọn</div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {allFoods.filter(f => selectedFoodIds.includes(f.MaMonAn)).map(food => (
                          <div
                            key={food.MaMonAn}
                            className={`p-3 border rounded d-flex align-items-center gap-3`}
                            style={{ transition: 'all 0.12s' }}
                          >
                            <button
                              type="button"
                              className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`}
                              onClick={() => handleToggleFood(food.MaMonAn)}
                              title="Bỏ chọn"
                            >
                              −
                            </button>
                            <img src={getImageUrl(food.HinhAnh)} alt={food.TenMonAn} style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                            <div className="flex-grow-1">
                              <div className={styles.tableCellBold}>{food.TenMonAn}</div>
                              {renderCategories(food.DanhMuc)}
                              {renderPrices(food)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div />

                  <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <strong>Các món còn lại ({allFoods.length - selectedFoodIds.length})</strong>
                    </div>

                      {/* Filters for available foods */}
                      <div style={{ marginBottom: 12 }}>
                        <div className="d-flex gap-2 flex-wrap">
                          <div style={{ minWidth: 180 }}>
                            <label className={formStyles.formLabel} style={{ marginBottom: 6 }}>Lọc theo loại món</label>
                            <select className={formStyles.formSelect} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                              <option value="">Tất cả loại món</option>
                              {Array.from(new Map(allFoods.filter(f => f.LoaiMonAn).map(f => [f.LoaiMonAn.MaLoaiMonAn, f.LoaiMonAn])).values()).map(loai => (
                                <option key={loai.MaLoaiMonAn} value={loai.MaLoaiMonAn}>{loai.TenLoaiMonAn}</option>
                              ))}
                            </select>
                          </div>

                          {/* Price filter removed — only category filter remains */}
                        </div>
                      </div>

                      {availableFoods.length === 0 ? (
                      <div className="text-center text-muted py-4">Không còn món nào</div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {availableFoods.map(food => (
                          <div
                            key={food.MaMonAn}
                            className={`p-3 border rounded d-flex align-items-center gap-3 cursor-pointer`}
                            onClick={() => handleToggleFood(food.MaMonAn)}
                            style={{ cursor: 'pointer', transition: 'all 0.12s' }}
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={(e) => { e.stopPropagation(); handleToggleFood(food.MaMonAn); }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: 20, height: 20, cursor: 'pointer' }}
                            />
                            <img src={getImageUrl(food.HinhAnh)} alt={food.TenMonAn} style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                            <div className="flex-grow-1">
                              <div className={styles.tableCellBold} style={{ fontSize: 15 }}>{food.TenMonAn}</div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                                <small className={styles.tableCellMuted}>Mã: {food.MaMonAn}</small>
                                <small className={styles.tableCellMuted}>•</small>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ color: '#faad14', fontWeight: 600 }}>{food.SoSaoTrungBinh ? food.SoSaoTrungBinh.toFixed(1) : '—'}</div>
                                  <div style={{ color: '#888' }}>({food.SoDanhGia || 0})</div>
                                </div>
                              </div>
                              {renderCategories(food.DanhMuc)}
                              {renderPrices(food)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="d-flex justify-content-end gap-3 mt-4">
          <button
            type="button"
            className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonLarge}`}
            onClick={() => navigate('/admin/promotions')}
          >
            Hủy
          </button>
          <button
            type="submit"
            className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge}`}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : (isNew ? 'Tạo khuyến mãi' : 'Cập nhật')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromotionDetail;
