import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchFoods, fetchCrusts, api, assetUrl, fetchComboById } from '../../services/api';
import styles from '../../styles/admin/AdminTable.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import formStyles from '../../styles/admin/AdminForm.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';
import localStyles from './AddCombo.module.css';

const EditCombo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageFileName, setImageFileName] = useState('');

  // Master data
  const [foods, setFoods] = useState([]);
  const [crusts, setCrusts] = useState([]);
  const [foodSearch, setFoodSearch] = useState('');

  // Form state
  const [form, setForm] = useState({
    tenCombo: '',
    moTa: '',
    giaCombo: '',
    trangThai: 'Active',
    hinhAnh: '',
    thoiGianHetHan: ''
  });

  // Selected items for combo
  const [comboItems, setComboItems] = useState([]);

  // Modal state
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [modalFood, setModalFood] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSizeId, setModalSizeId] = useState(null);
  const [modalCrustId, setModalCrustId] = useState(null);
  const [modalSkipSize, setModalSkipSize] = useState(false);
  const [modalQty, setModalQty] = useState(1);

  const ImageWithFallback = ({ src, alt, style, className }) => {
    const initial = src && src !== '' ? (src.startsWith('/') ? assetUrl(src) : src) : '/placeholder.png';
    const [currentSrc, setCurrentSrc] = useState(initial);
    useEffect(() => {
      const next = src && src !== '' ? (src.startsWith('/') ? assetUrl(src) : src) : '/placeholder.png';
      setCurrentSrc(next);
    }, [src]);
    return (
      <img
        src={currentSrc}
        alt={alt}
        style={style}
        className={className}
        onError={(e) => { setCurrentSrc('/placeholder.png'); }}
      />
    );
  };

  // Load combo data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingData(true);
        const [comboDetail, foodsRes, crustsRes] = await Promise.all([
          fetchComboById(id),
          fetchFoods().catch(() => []),
          fetchCrusts().catch(() => [])
        ]);
        if (!mounted) return;

        // Set form data
        setForm({
          tenCombo: comboDetail.TenCombo || '',
          moTa: comboDetail.MoTa || '',
          giaCombo: comboDetail.GiaCombo || '',
          trangThai: comboDetail.TrangThai || 'Active',
          hinhAnh: comboDetail.HinhAnh || '',
          thoiGianHetHan: comboDetail.ThoiGianHetHan ? new Date(comboDetail.ThoiGianHetHan).toISOString().slice(0, 16) : ''
        });

        // Set image preview
        if (comboDetail.HinhAnh) {
          setImagePreview(assetUrl(comboDetail.HinhAnh));
        }

        // Convert Items to comboItems format
        const items = (comboDetail.Items || []).map(item => {
          const bienThe = item.BienTheMonAn;
          return {
            maMonAn: bienThe?.MonAn?.MaMonAn,
            tenMonAn: bienThe?.MonAn?.TenMonAn,
            hinhAnh: bienThe?.MonAn?.HinhAnh,
            maBienThe: item.MaBienThe,
            maSize: bienThe?.Size?.MaSize || null,
            tenSize: bienThe?.Size?.TenSize || '',
            giaBan: bienThe?.GiaBan || 0,
            maDeBanh: item.MaDeBanh || null,
            tenDeBanh: item.DeBanh?.TenDeBanh || '',
            soLuong: item.SoLuong
          };
        });
        setComboItems(items);

        setFoods(Array.isArray(foodsRes) ? foodsRes : []);
        setCrusts(Array.isArray(crustsRes) ? crustsRes : []);
      } catch (err) {
        console.error('Failed to load combo:', err);
        alert('Không thể tải thông tin combo');
        navigate('/admin/combos');
      } finally {
        if (mounted) setLoadingData(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageFileChange = (e) => {
    try {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn đúng định dạng ảnh');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Ảnh quá lớn, tối đa 5MB');
        return;
      }

      const localUrl = URL.createObjectURL(file);
      setImageFile(file);
      setImageFileName(file.name);
      setImagePreview(localUrl);
      setError('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleClickFood = async (food) => {
    if (!food || !food.MaMonAn) {
      alert('Dữ liệu món ăn không hợp lệ');
      return;
    }

    try {
      const res = await api.get(`/api/foods/${food.MaMonAn}`);
      const foodDetail = res.data;
      
      if (!foodDetail.BienTheMonAn || foodDetail.BienTheMonAn.length === 0) {
        alert('Món ăn không có biến thể');
        return;
      }

      if (foodDetail.BienTheMonAn.length === 1 && (foodDetail.BienTheMonAn[0].Size == null || foodDetail.BienTheMonAn[0].Size?.MaSize == null)) {
        const firstCrust = (foodDetail.MonAn_DeBanh && foodDetail.MonAn_DeBanh.length > 0)
          ? foodDetail.MonAn_DeBanh[0].DeBanh.MaDeBanh
          : null;
        setShowFoodModal(true);
        setModalLoading(false);
        setModalFood(foodDetail);
        setModalSizeId(null);
        setModalCrustId(firstCrust);
        setModalSkipSize(true);
        setModalQty(1);
        return;
      }

      setShowFoodModal(true);
      setModalLoading(true);
      const firstVariant = foodDetail.BienTheMonAn[0];
      const firstCrust = (foodDetail.MonAn_DeBanh && foodDetail.MonAn_DeBanh.length > 0)
        ? foodDetail.MonAn_DeBanh[0].DeBanh.MaDeBanh
        : null;
      setModalFood(foodDetail);
      setModalSizeId(firstVariant.Size?.MaSize || null);
      setModalCrustId(firstCrust);
      setModalQty(1);
      setModalLoading(false);
    } catch (err) {
      console.error('Failed to load food detail:', err);
      alert('Không thể tải thông tin món ăn');
    }
  };

  const handleCloseModal = () => {
    setShowFoodModal(false);
    setModalFood(null);
    setModalSizeId(null);
    setModalCrustId(null);
    setModalQty(1);
    setModalSkipSize(false);
  };

  const handleAddToCombo = () => {
    if (!modalFood) {
      alert('Dữ liệu không hợp lệ');
      return;
    }

    let variant = null;
    if (modalSkipSize) {
      variant = modalFood.BienTheMonAn && modalFood.BienTheMonAn.length > 0 ? modalFood.BienTheMonAn[0] : null;
    } else {
      if (!modalSizeId) {
        alert('Vui lòng chọn size');
        return;
      }
      variant = modalFood.BienTheMonAn.find(v => v.Size?.MaSize === modalSizeId);
    }
    if (!variant) {
      alert('Không tìm thấy biến thể');
      return;
    }

    const crustObj = modalCrustId ? modalFood.MonAn_DeBanh?.find(mdb => mdb.DeBanh?.MaDeBanh === modalCrustId)?.DeBanh : null;

    const existingIndex = comboItems.findIndex(item => 
      item.maBienThe === variant.MaBienThe && 
      item.maDeBanh === (modalCrustId || null)
    );

    if (existingIndex !== -1) {
      setComboItems(prev => {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          soLuong: updated[existingIndex].soLuong + modalQty
        };
        return updated;
      });
    } else {
      const newItem = {
        maMonAn: modalFood.MaMonAn,
        tenMonAn: modalFood.TenMonAn,
        hinhAnh: modalFood.HinhAnh,
        maBienThe: variant.MaBienThe,
        maSize: variant.Size ? variant.Size.MaSize : null,
        tenSize: variant.Size ? (variant.Size.TenSize || '') : '',
        giaBan: variant.GiaBan,
        maDeBanh: modalCrustId || null,
        tenDeBanh: crustObj?.TenDeBanh || '',
        soLuong: modalQty
      };
      setComboItems(prev => [...prev, newItem]);
    }

    handleCloseModal();
  };

  const handleRemoveItem = (index) => {
    setComboItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.giaCombo || Number(form.giaCombo) <= 0) {
      setError('Vui lòng nhập giá combo hợp lệ');
      return;
    }
    if (!imagePreview && !form.hinhAnh) {
      setError('Vui lòng chọn ảnh combo');
      return;
    }
    if (comboItems.length === 0) {
      setError('Vui lòng thêm ít nhất một món vào combo');
      return;
    }

    // Build payload (không gửi tên combo)
    const payload = {
      moTa: form.moTa.trim(),
      giaCombo: Number(form.giaCombo),
      trangThai: form.trangThai,
      hinhAnh: form.hinhAnh, // keep existing image path if no new file
      thoiGianHetHan: form.thoiGianHetHan || null,
      items: comboItems.map(item => ({
        maBienThe: item.maBienThe,
        maDeBanh: item.maDeBanh || null,
        soLuong: item.soLuong
      }))
    };

    console.log('📤 Update combo payload:', payload);

    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    if (imageFile) {
      formData.append('hinhAnhFile', imageFile);
    }

    setLoading(true);
    try {
      const res = await api.put(`/api/combos/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('✅ Cập nhật combo thành công:', res.data);
      alert('Cập nhật combo thành công!');
      navigate('/admin/combos');
    } catch (err) {
      console.error('❌ Lỗi khi cập nhật combo:', err);
      setError(err?.response?.data?.message || err.message || 'Không thể cập nhật combo');
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = foods.filter(food =>
    food.TenMonAn?.toLowerCase().includes(foodSearch.toLowerCase())
  );

  const totalOriginalPrice = comboItems.reduce((sum, item) => {
    return sum + (Number(item.giaBan) * item.soLuong);
  }, 0);

  const comboPrice = Number(form.giaCombo) || 0;
  const savings = totalOriginalPrice - comboPrice;

  if (loadingData) {
    return (
      <div className={cardStyles.cardPremium}>
        <div className={cardStyles.cardBodyPremium}>
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="mt-3">Đang tải thông tin combo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardStyles.cardPremium}>
      <div className={cardStyles.cardHeaderPremium}>
        <h5 className={cardStyles.cardTitleLarge}>Chỉnh sửa combo: {form.tenCombo}</h5>
      </div>

      {error && (
        <div className="alert alert-danger mx-4 mt-3" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={cardStyles.cardBodyPremium}>
        <div className="row">
          {/* Left Column */}
          <div className="col-lg-5">
            <div className={localStyles.leftForm}>
              {/* Tên combo - DISABLED */}
              <div className={localStyles.field}>
                <label className={localStyles.fieldLabel}>Tên combo</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.tenCombo}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
                <small className="text-muted">Không thể sửa tên combo</small>
              </div>

              <div className={localStyles.field}>
                <label className={localStyles.fieldLabel}>Mô tả</label>
                <textarea
                  name="moTa"
                  className="form-control"
                  rows={4}
                  placeholder="Nhập mô tả combo..."
                  value={form.moTa}
                  onChange={handleInputChange}
                />
              </div>

              <div className={localStyles.field}>
                <label className={localStyles.fieldLabel}>Giá combo (đ) <span className="text-danger">*</span></label>
                <input
                  type="number"
                  name="giaCombo"
                  className="form-control"
                  placeholder="Nhập giá..."
                  value={form.giaCombo}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>

              {comboItems.length > 0 && (
                <div className={localStyles.priceHelper}>
                  <div className={localStyles.priceRow}>
                    <span className={localStyles.priceLabel}>Tổng giá gốc:</span>
                    <span className={localStyles.priceValue}>{totalOriginalPrice.toLocaleString()}đ</span>
                  </div>
                  <div className={localStyles.priceRow}>
                    <span className={localStyles.priceLabel}>Giá combo:</span>
                    <span className={localStyles.priceValue} style={{ color: '#ff4d4f' }}>{comboPrice.toLocaleString()}đ</span>
                  </div>
                  {savings > 0 ? (
                    <div className={localStyles.priceRow}>
                      <span className={localStyles.priceLabel} style={{ color: '#10b981', fontWeight: 600 }}>💰 Tiết kiệm:</span>
                      <span className={localStyles.priceSavings}>{savings.toLocaleString()}đ ({((savings/totalOriginalPrice)*100).toFixed(0)}%)</span>
                    </div>
                  ) : savings < 0 ? (
                    <div className="alert alert-warning small mb-0 mt-2" style={{ fontSize: '0.8125rem' }}>
                      ⚠️ Giá combo cao hơn tổng giá gốc
                    </div>
                  ) : null}
                </div>
              )}

              {/* Trạng thái */}
              <div className="mb-3">
                <label className={formStyles.formLabel}>Trạng thái</label>
                <select
                  name="trangThai"
                  className={formStyles.formInput}
                  value={form.trangThai}
                  onChange={handleInputChange}
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Inactive">Không hoạt động</option>
                </select>
              </div>

              {/* Ngày hết hạn */}
              <div className="mb-3">
                <label className={formStyles.formLabel}>Ngày hết hạn</label>
                <input
                  type="datetime-local"
                  name="thoiGianHetHan"
                  className={formStyles.formInput}
                  value={form.thoiGianHetHan}
                  onChange={handleInputChange}
                />
                <small className="text-muted d-block mt-1">Nếu để trống, combo sẽ không có hạn sử dụng</small>
              </div>

              {/* Hình ảnh */}
              <div className="mb-3">
                <label className={formStyles.formLabel}>
                  Hình ảnh combo <span className="text-danger">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className={formStyles.formInput}
                  onChange={handleImageFileChange}
                />
                <small className="text-muted d-block mt-1">
                  Để trống nếu không muốn thay đổi ảnh
                </small>
                {imagePreview && (
                  <div className={localStyles.imagePreview}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="img-fluid"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Items */}
          <div className="col-lg-7">
            <div className={cardStyles.cardPremium}>
              <div className={cardStyles.cardHeaderPremium}>
                <h5 className={cardStyles.cardTitleLarge}>Món ăn trong combo</h5>
              </div>
              <div className={cardStyles.cardBodyPremium}>
                {comboItems.length > 0 && (
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">
                        <span className="badge bg-primary me-2">{comboItems.length}</span>
                        Món đã chọn
                      </h6>
                      <button
                        type="button"
                        className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`}
                        onClick={() => setComboItems([])}
                      >
                        Xóa tất cả
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className={`${styles.table} table-sm`}>
                        <thead className={styles.tableHeaderPrimary}>
                          <tr>
                            <th>Món</th>
                            <th>Size</th>
                            <th>Đế bánh</th>
                            <th style={{ width: 80 }}>SL</th>
                            <th style={{ width: 100 }}>Giá</th>
                            <th style={{ width: 100 }}>Tổng</th>
                            <th style={{ width: 60 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {comboItems.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <ImageWithFallback
                                    src={item.hinhAnh}
                                    alt={item.tenMonAn}
                                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                                  />
                                  <div>
                                    <div className="fw-semibold small">{item.tenMonAn}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="small">{item.tenSize || '—'}</span>
                              </td>
                              <td>
                                <span className="small">{item.tenDeBanh || '—'}</span>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-secondary">{item.soLuong}</span>
                              </td>
                              <td className="text-end small">
                                {Number(item.giaBan).toLocaleString()}đ
                              </td>
                              <td className="text-end small fw-semibold">
                                {(Number(item.giaBan) * item.soLuong).toLocaleString()}đ
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className={`${buttonStyles.button} ${buttonStyles.buttonDanger} ${buttonStyles.buttonSmall}`}
                                  onClick={() => handleRemoveItem(index)}
                                  title="Xóa"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr className="table-light">
                            <td colSpan="5" className="text-end fw-semibold">Tổng giá gốc:</td>
                            <td className="text-end fw-bold text-primary">{totalOriginalPrice.toLocaleString()}đ</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Food selection */}
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Chọn món để thêm</h6>
                    <span className="badge bg-light text-dark border">{filteredFoods.length} món</span>
                  </div>
                  <div className="mb-3">
                    <div className={localStyles.searchWrapper}>
                      <input
                        type="text"
                        className={formStyles.formInput}
                        placeholder="Tìm món ăn..."
                        style={{ paddingLeft: 40 }}
                        value={foodSearch}
                        onChange={(e) => setFoodSearch(e.target.value)}
                      />
                      <span className={localStyles.searchIcon}>
                        🔍
                      </span>
                    </div>
                  </div>

                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {filteredFoods.length === 0 ? (
                      <div className="text-center text-muted py-3">
                        <p>Không tìm thấy món ăn</p>
                      </div>
                    ) : (
                      <div className="row g-2">
                        {filteredFoods.map(food => (
                          <div key={food.MaMonAn} className="col-6">
                            <div 
                              className={localStyles.foodCard}
                              onClick={() => handleClickFood(food)}
                            >
                              <ImageWithFallback
                                src={food.HinhAnh}
                                alt={food.TenMonAn}
                                className={localStyles.foodCardImage}
                              />
                              <div className={localStyles.foodCardContent}>
                                <div className={localStyles.foodCardTitle}>
                                  {food.TenMonAn}
                                </div>
                                {food.BienThe && food.BienThe.length > 0 && (
                                  <div className={localStyles.foodCardMeta}>
                                    {food.BienThe.length > 1 ? `${food.BienThe.length} sizes` : 'Món đơn'}
                                  </div>
                                )}
                              </div>
                              <div className={localStyles.foodCardButton}>
                                +
                              </div>
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

        {/* Submit buttons */}
        <div className="d-flex gap-2 justify-content-end mt-4">
          <button
            type="button"
            className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
            onClick={() => navigate('/admin/combos')}
          >
            Hủy
          </button>
          <button
            type="submit"
            className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge}`}
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Cập nhật combo'}
          </button>
        </div>
      </form>

      {/* Modal - Same as AddCombo */}
      {showFoodModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chọn size và đế bánh</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                {modalLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                  </div>
                ) : modalFood ? (
                  <>
                    <div className="d-flex gap-3 mb-3">
                      <ImageWithFallback
                        src={modalFood.HinhAnh}
                        alt={modalFood.TenMonAn}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
                      />
                      <div>
                        <h6 className="mb-1">{modalFood.TenMonAn}</h6>
                        <p className="text-muted small mb-0">{modalFood.MoTa}</p>
                      </div>
                    </div>

                    {!modalSkipSize && (
                      <div className="mb-3">
                        <label className={formStyles.formLabel}>
                          Kích thước <span className="text-danger">*</span>
                        </label>
                        <div className="d-flex flex-wrap gap-2">
                          {modalFood.BienTheMonAn?.map(v => {
                            const active = modalSizeId === v.Size?.MaSize;
                            return (
                              <button
                                key={v.MaBienThe}
                                type="button"
                                className={`btn btn-sm ${active ? 'btn-danger' : 'btn-outline-secondary'}`}
                                onClick={() => setModalSizeId(v.Size?.MaSize)}
                              >
                                {v.Size?.TenSize || 'N/A'} ({Number(v.GiaBan).toLocaleString()}đ)
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {modalSkipSize && (
                      <div className="mb-3">
                        <label className={formStyles.formLabel}>Kích thước</label>
                        <div className="small text-muted">Món này không có kích thước khác — chọn số lượng để thêm.</div>
                      </div>
                    )}

                    {modalFood.MaLoaiMonAn === 1 && modalFood.MonAn_DeBanh && modalFood.MonAn_DeBanh.length > 0 && (
                      <div className="mb-3">
                        <label className={formStyles.formLabel}>Đế bánh</label>
                        <div className="d-flex flex-wrap gap-2">
                          {modalFood.MonAn_DeBanh.map(mdb => (
                            <button
                              key={mdb.DeBanh.MaDeBanh}
                              type="button"
                              className={`btn btn-sm ${modalCrustId === mdb.DeBanh.MaDeBanh ? 'btn-danger' : 'btn-outline-secondary'}`}
                              onClick={() => setModalCrustId(mdb.DeBanh.MaDeBanh)}
                            >
                              {mdb.DeBanh.TenDeBanh}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className={formStyles.formLabel}>Số lượng</label>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`}
                          onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          className={formStyles.formInput}
                          style={{ width: 80, textAlign: 'center' }}
                          value={modalQty}
                          onChange={(e) => setModalQty(Math.max(1, Number(e.target.value) || 1))}
                          min="1"
                        />
                        <button
                          type="button"
                          className={`${buttonStyles.button} ${buttonStyles.buttonOutline} ${buttonStyles.buttonSmall}`}
                          onClick={() => setModalQty(modalQty + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                  onClick={handleCloseModal}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={`${buttonStyles.button} ${buttonStyles.buttonPrimary}`}
                  onClick={handleAddToCombo}
                >
                  Thêm vào combo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditCombo;
