import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchTypes, fetchCategories, fetchSizes, fetchCrusts, fetchOptions, api, assetUrl } from '../../services/api';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);

  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [crusts, setCrusts] = useState([]);
  const [options, setOptions] = useState([]);

  const [form, setForm] = useState({
    tenMonAn: '',
    moTa: '',
    hinhAnh: '',
    maLoaiMonAn: '',
    trangThai: 'Active',
    deXuat: false,
    bienThe: [{ maSize: '', giaBan: '' }],
    danhSachMaDanhMuc: [],
    danhSachMaDeBanh: [],
    danhSachMaTuyChon: []
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [typesRes, categoriesRes, sizesRes, crustsRes, optionsRes] = await Promise.all([
          fetchTypes().catch(() => []),
          fetchCategories().catch(() => []),
          fetchSizes().catch(() => []),
          fetchCrusts().catch(() => []),
          fetchOptions().catch(() => [])
        ]);
        if (!mounted) return;
        setTypes(Array.isArray(typesRes) ? typesRes : []);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
        setSizes(Array.isArray(sizesRes) ? sizesRes : []);
        setCrusts(Array.isArray(crustsRes) ? crustsRes : []);
        setOptions(Array.isArray(optionsRes) ? optionsRes : []);
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    })();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/foods/${id}`);
        if (!mounted) return;
        const p = res.data;
        // Map API shape to our form shape
        setForm({
          tenMonAn: p.TenMonAn || '',
          moTa: p.MoTa || '',
          hinhAnh: p.HinhAnh || '',
          maLoaiMonAn: p.MaLoaiMonAn || '',
          trangThai: p.TrangThai || 'Active',
          deXuat: !!p.DeXuat,
          bienThe: Array.isArray(p.BienTheMonAn) && p.BienTheMonAn.length > 0
            ? p.BienTheMonAn.map(b => ({
              maSize: b.MaSize == null ? '' : String(b.MaSize),
              giaBan: b.GiaBan == null ? '' : String(b.GiaBan)
            }))
            : [{ maSize: '', giaBan: '' }],
          danhSachMaDanhMuc: Array.isArray(p.DanhMuc) ? p.DanhMuc.map(d => d.MaDanhMuc) : [],
          danhSachMaDeBanh: Array.isArray(p.MonAn_DeBanh) ? p.MonAn_DeBanh.map(x => x.MaDeBanh) : [],
          danhSachMaTuyChon: Array.isArray(p.MonAn_TuyChon) ? p.MonAn_TuyChon.map(x => x.MaTuyChon) : []
        });

        if (p.HinhAnh) {
          setImagePreview(assetUrl(p.HinhAnh));
        }
      } catch (err) {
        console.error('Failed to load product:', err);
        setError('Không thể tải dữ liệu món ăn');
      } finally {
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [id]);

  const isPizza = form.maLoaiMonAn === '1' || form.maLoaiMonAn === 1;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'maLoaiMonAn') {
        const nextIsPizza = value === '1' || value === 1;
        if (!nextIsPizza) {
          const first = prev.bienThe && prev.bienThe.length > 0 ? prev.bienThe[0] : { maSize: '', giaBan: '' };
          next.bienThe = [{ maSize: '', giaBan: first.giaBan || '' }];
        }
      }
      return next;
    });
  };

  const handleVariantChange = (index, field, value) => {
    setForm(prev => {
      const newBienThe = [...prev.bienThe];
      newBienThe[index] = { ...newBienThe[index], [field]: value };
      return { ...prev, bienThe: newBienThe };
    });
  };

  const addVariant = () => {
    setForm(prev => {
      const isPizzaNext = prev.maLoaiMonAn === '1' || prev.maLoaiMonAn === 1;
      if (!isPizzaNext) return prev;
      const selected = new Set((prev.bienThe || []).map(v => String(v.maSize)).filter(v => v !== '' && v !== 'null'));
      const firstFree = (sizes || []).find(s => !selected.has(String(s.MaSize)));
      const nextVariant = { maSize: firstFree ? String(firstFree.MaSize) : '', giaBan: '' };
      return { ...prev, bienThe: [...prev.bienThe, nextVariant] };
    });
  };

  const removeVariant = (index) => {
    if (form.bienThe.length <= 1) return;
    setForm(prev => ({ ...prev, bienThe: prev.bienThe.filter((_, i) => i !== index) }));
  };

  const toggleCategory = (id) => {
    setForm(prev => ({
      ...prev,
      danhSachMaDanhMuc: prev.danhSachMaDanhMuc.includes(id) ? prev.danhSachMaDanhMuc.filter(x => x !== id) : [...prev.danhSachMaDanhMuc, id]
    }));
  };

  const toggleCrust = (id) => {
    setForm(prev => ({
      ...prev,
      danhSachMaDeBanh: prev.danhSachMaDeBanh.includes(id) ? prev.danhSachMaDeBanh.filter(x => x !== id) : [...prev.danhSachMaDeBanh, id]
    }));
  };

  const toggleOption = (id) => {
    setForm(prev => ({
      ...prev,
      danhSachMaTuyChon: prev.danhSachMaTuyChon.includes(id) ? prev.danhSachMaTuyChon.filter(x => x !== id) : [...prev.danhSachMaTuyChon, id]
    }));
  };

  const handleImageFileChange = (e) => {
    try {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { setError('Vui lòng chọn đúng định dạng ảnh'); return; }
      if (file.size > 5 * 1024 * 1024) { setError('Ảnh quá lớn, tối đa 5MB'); return; }
      const localUrl = URL.createObjectURL(file);
      setImageFile(file);
      setImagePreview(localUrl);
      setForm(prev => ({ ...prev, hinhAnh: '' }));
      setError('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Build payload matching AddProduct format exactly (lowercase fields, same structure)
    const payload = {
      tenMonAn: form.tenMonAn.trim(),
      moTa: form.moTa.trim(),
      maLoaiMonAn: Number(form.maLoaiMonAn),
      trangThai: form.trangThai,
      deXuat: form.deXuat,
      bienThe: form.bienThe.map(v => ({
        maSize: v.maSize === '' || v.maSize === 'null' ? null : Number(v.maSize),
        giaBan: Number(v.giaBan)
      })),
      danhSachMaDanhMuc: form.danhSachMaDanhMuc,
      danhSachMaDeBanh: isPizza ? form.danhSachMaDeBanh : [],
      danhSachMaTuyChon: isPizza ? form.danhSachMaTuyChon : []
    };

    // Validation
    if (!payload.tenMonAn) {
      setError('Vui lòng nhập tên món ăn');
      return;
    }
    if (!payload.maLoaiMonAn) {
      setError('Vui lòng chọn loại món ăn');
      return;
    }
    if (!payload.bienThe.length || payload.bienThe.some(v => !v.giaBan || v.giaBan <= 0)) {
      setError('Vui lòng nhập giá bán hợp lệ cho tất cả biến thể');
      return;
    }

    if (isPizza) {
      const sizesChosen = payload.bienThe.map(v => v.maSize);
      if (sizesChosen.some(v => v === null)) {
        setError('Vui lòng chọn size cho mỗi biến thể');
        return;
      }
      const uniq = new Set(sizesChosen.map(String));
      if (uniq.size !== sizesChosen.length) {
        setError('Mỗi size chỉ được chọn một lần');
        return;
      }
      if (uniq.size > sizes.length) {
        setError('Số biến thể vượt quá số size hiện có');
        return;
      }
    }

    // Build multipart/form-data same as AddProduct: data=<json> + hinhAnhFile=@file
    console.log('📤 Payload JSON (preview):', JSON.stringify(payload, null, 2));

    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    if (imageFile) formData.append('hinhAnhFile', imageFile);

    console.log('📦 Multipart payload (data + file) sending to BE');

    setLoading(true);
    try {
      const res = await api.put(`/api/foods/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = res?.data || {};
      // If backend returns the updated food object, treat as success
      if (data && data.food) {
        console.log('✅ Cập nhật món ăn thành công', data);
        alert(data.message || 'Cập nhật món ăn thành công');

        // Map returned food to form shape to keep UI in sync
        const p = data.food;
        setForm({
          tenMonAn: p.TenMonAn || '',
          moTa: p.MoTa || '',
          hinhAnh: p.HinhAnh || '',
          maLoaiMonAn: p.MaLoaiMonAn || '',
          trangThai: p.TrangThai || 'Active',
          deXuat: !!p.DeXuat,
          bienThe: Array.isArray(p.BienTheMonAn) && p.BienTheMonAn.length > 0
            ? p.BienTheMonAn.map(b => ({ maSize: b.MaSize == null ? '' : String(b.MaSize), giaBan: b.GiaBan == null ? '' : String(b.GiaBan) }))
            : [{ maSize: '', giaBan: '' }],
          danhSachMaDanhMuc: Array.isArray(p.DanhMuc) ? p.DanhMuc.map(d => d.MaDanhMuc) : [],
          danhSachMaDeBanh: Array.isArray(p.MonAn_DeBanh) ? p.MonAn_DeBanh.map(x => x.MaDeBanh) : [],
          danhSachMaTuyChon: Array.isArray(p.MonAn_TuyChon) ? p.MonAn_TuyChon.map(x => x.MaTuyChon) : []
        });
        if (p.HinhAnh) setImagePreview(assetUrl(p.HinhAnh));

        navigate('/admin/products');
      } else {
        // Backend returned a message without `food` (validation failure or other)
        const msg = data?.message || 'Không thể cập nhật món ăn';
        console.warn('Update API returned no food object:', msg, data);
        setError(msg);
      }
    } catch (err) {
      console.error('❌ Lỗi khi cập nhật món ăn', err);
      setError(err?.response?.data?.message || err.message || 'Không thể cập nhật món ăn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-animate-fade-in">
      {/* Header with Gradient */}
      <div className="position-relative overflow-hidden rounded-4 shadow-lg mb-4" style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '2.5rem'
      }}>
        <div className="position-absolute" style={{
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }}></div>
        <div className="position-relative">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="bg-white rounded-3 p-3 shadow-sm" style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 32 }}>✏️</span>
                </div>
                <div>
                  <h2 className="text-white mb-1 fw-bold" style={{ fontSize: '1.75rem' }}>Chỉnh sửa món ăn</h2>
                  <p className="text-white opacity-75 mb-0">Cập nhật thông tin sản phẩm</p>
                </div>
              </div>
            </div>
            <button 
              type="button"
              className="btn btn-light rounded-pill px-4 py-2 shadow-sm"
              onClick={() => navigate('/admin/products')}
              style={{ fontWeight: 600 }}
            >
              ← Quay lại
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Left Column - Basic Info */}
          <div className="col-lg-8">
            {/* Basic Info Card */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                  <div className="rounded-3 d-flex align-items-center justify-content-center" style={{
                    width: 48,
                    height: 48,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                  }}>
                    <span style={{ fontSize: 24 }}>📝</span>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold">Thông tin cơ bản</h5>
                    <small className="text-muted">Điền các thông tin chính về món ăn</small>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-3 mb-4 rounded-3 border-0" style={{
                    background: 'linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%)'
                  }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <div className="flex-grow-1">{error}</div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="form-label fw-semibold mb-2">
                    Tên món ăn <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="tenMonAn"
                    className="form-control form-control-lg rounded-3 border-2 bg-light"
                    placeholder="VD: Pizza Hải Sản Cao Cấp"
                    value={form.tenMonAn}
                    readOnly
                    disabled
                    style={{ fontSize: '1rem', cursor: 'not-allowed' }}
                    title="Không thể thay đổi tên món ăn khi chỉnh sửa"
                  />
                  <small className="text-muted d-block mt-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Tên món ăn không thể thay đổi sau khi tạo
                  </small>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold mb-2">Mô tả chi tiết</label>
                  <textarea
                    name="moTa"
                    className="form-control rounded-3 border-2"
                    rows={4}
                    placeholder="Mô tả nguyên liệu, hương vị đặc biệt của món ăn..."
                    value={form.moTa}
                    onChange={handleInputChange}
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold mb-2">
                    Ảnh sản phẩm {!form.hinhAnh && <span className="text-muted">(tùy chọn)</span>}
                  </label>
                  <div className="d-flex align-items-start gap-3 flex-wrap">
                    <div style={{ minWidth: 260 }}>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={handleImageFileChange}
                      />
                      <small className="text-muted d-block mt-1">Chọn ảnh mới để thay thế (jpg, png). Tối đa 5MB.</small>
                    </div>

                    {(imagePreview || form.hinhAnh) && (
                      <div className="d-flex align-items-center gap-2">
                        <div className="ratio" style={{ width: 120, height: 80, borderRadius: 8, overflow: 'hidden' }}>
                          <img
                            src={imagePreview || (form.hinhAnh ? assetUrl(form.hinhAnh) : '')}
                            alt="Xem trước ảnh"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { try { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; } catch (err) { void err; } }}
                          />
                        </div>
                        <div className="d-flex flex-column">
                          <div className="small text-muted">Xem trước</div>
                          <div className="mt-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => { setImagePreview(''); setImageFile(null); }}
                            >
                              Xóa ảnh
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold mb-2">
                      Loại món ăn <span className="text-danger">*</span>
                    </label>
                    <select
                      name="maLoaiMonAn"
                      className="form-select form-select-lg rounded-3 border-2"
                      value={form.maLoaiMonAn}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">-- Chọn loại --</option>
                      {types.map(t => (
                        <option key={t.MaLoaiMonAn} value={t.MaLoaiMonAn}>
                          {t.TenLoaiMonAn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold mb-2">Trạng thái</label>
                    <select
                      name="trangThai"
                      className="form-select form-select-lg rounded-3 border-2"
                      value={form.trangThai}
                      onChange={handleInputChange}
                    >
                      <option value="Active">🟢 Active</option>
                      <option value="Inactive">🔴 Inactive</option>
                    </select>
                  </div>

                  <div className="col-md-4 d-flex align-items-end">
                    <label className="d-flex align-items-center gap-2 p-3 rounded-3 border-2 w-100" style={{ 
                      cursor: 'pointer',
                      background: form.deXuat ? 'linear-gradient(135deg, #fff5e6 0%, #ffe5cc 100%)' : '#f8f9fa',
                      borderColor: form.deXuat ? '#ffc107' : '#dee2e6',
                      transition: 'all 0.3s'
                    }}>
                      <input
                        type="checkbox"
                        name="deXuat"
                        checked={form.deXuat}
                        onChange={handleInputChange}
                        style={{ width: 20, height: 20 }}
                      />
                      <span className="fw-semibold">⭐ Đề xuất</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Variants */}
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom">
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-3 d-flex align-items-center justify-content-center" style={{
                      width: 48,
                      height: 48,
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                    }}>
                      <span style={{ fontSize: 24 }}>💰</span>
                    </div>
                    <div>
                      <h5 className="mb-0 fw-bold">Biến thể & Giá bán</h5>
                      <small className="text-muted">Quản lý giá theo size hoặc đơn vị</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger rounded-pill px-4 shadow-sm"
                    onClick={addVariant}
                    style={{ fontWeight: 600, display: isPizza ? 'inline-flex' : 'none' }}
                    disabled={!isPizza || (new Set(form.bienThe.map(v => String(v.maSize)).filter(x => x && x !== 'null')).size >= sizes.length)}
                  >
                    {new Set(form.bienThe.map(v => String(v.maSize)).filter(x => x && x !== 'null')).size >= sizes.length
                      ? 'Đã chọn hết size'
                      : (<><span style={{ fontSize: 18 }}>+</span> Thêm biến thể</>)}
                  </button>
                </div>

                <div className="row g-3">
                  {form.bienThe.map((variant, index) => (
                    <div key={index} className="col-12">
                      <div className="position-relative rounded-4 p-4 shadow-sm" style={{
                        background: index % 2 === 0 
                          ? 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' 
                          : 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                        border: '2px solid rgba(255,255,255,0.8)'
                      }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge rounded-pill px-3 py-2" style={{
                              background: 'rgba(255,255,255,0.9)',
                              color: '#333',
                              fontSize: '0.9rem',
                              fontWeight: 700
                            }}>
                              #{index + 1}
                            </span>
                            <span className="fw-bold" style={{ fontSize: '1.05rem' }}>Biến thể</span>
                          </div>
                          {isPizza && form.bienThe.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm rounded-pill px-3 shadow-sm"
                              onClick={() => removeVariant(index)}
                              style={{ fontWeight: 600 }}
                            >
                              🗑️ Xóa
                            </button>
                          )}
                        </div>

                        <div className="row g-3">
                          {isPizza ? (
                            <div className="col-md-6">
                              <label className="form-label fw-semibold mb-2" style={{ color: '#2c3e50' }}>
                                Size <span className="text-danger">*</span>
                              </label>
                              <select
                                className="form-select form-select-lg rounded-3 bg-white border-2"
                                value={variant.maSize}
                                onChange={(e) => handleVariantChange(index, 'maSize', e.target.value)}
                                required
                                style={{ fontWeight: 600 }}
                              >
                                <option value="">-- Chọn size --</option>
                                {(() => {
                                  const currentVal = String(variant.maSize);
                                  const selectedInOthers = new Set(
                                    form.bienThe
                                      .filter((_, i) => i !== index)
                                      .map(v => String(v.maSize))
                                      .filter(v => v && v !== 'null')
                                  );
                                  const available = sizes.filter(s => !selectedInOthers.has(String(s.MaSize)) || String(s.MaSize) === currentVal);
                                  return available.map(s => (
                                    <option key={s.MaSize} value={s.MaSize}>
                                      📏 {s.TenSize}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>
                          ) : (
                            <div className="col-md-6">
                              <label className="form-label fw-semibold mb-2" style={{ color: '#2c3e50' }}>Size</label>
                              <div className="form-control form-control-lg rounded-3 bg-white border-2 d-flex align-items-center" style={{ fontWeight: 600, color: '#6c757d' }}>
                                ℹ️ Không áp dụng
                              </div>
                              <small className="text-muted d-block mt-1">Món này không có size</small>
                            </div>
                          )}

                          <div className="col-md-6">
                            <label className="form-label fw-semibold mb-2" style={{ color: '#2c3e50' }}>
                              Giá bán (VNĐ) <span className="text-danger">*</span>
                            </label>
                            <div className="input-group input-group-lg">
                              <span className="input-group-text bg-white border-2 rounded-start-3" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                💵
                              </span>
                              <input
                                type="number"
                                className="form-control bg-white border-2 rounded-end-3"
                                placeholder="Nhập giá bán"
                                value={variant.giaBan}
                                onChange={(e) => handleVariantChange(index, 'giaBan', e.target.value)}
                                min="0"
                                step="1000"
                                required
                                style={{ fontWeight: 600 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Categories, Crusts, Options */}
          <div className="col-lg-4">
            {/* Categories */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                  <div className="rounded-3 d-flex align-items-center justify-content-center" style={{
                    width: 40,
                    height: 40,
                    background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)'
                  }}>
                    <span style={{ fontSize: 20 }}>📁</span>
                  </div>
                  <h5 className="mb-0 fw-bold">Danh mục</h5>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {categories.map(cat => {
                    const selected = form.danhSachMaDanhMuc.includes(cat.MaDanhMuc);
                    return (
                      <button
                        key={cat.MaDanhMuc}
                        type="button"
                        onClick={() => toggleCategory(cat.MaDanhMuc)}
                        aria-pressed={selected}
                        className="btn btn-sm"
                        style={{
                          cursor: 'pointer',
                          borderRadius: 999,
                          padding: '8px 12px',
                          background: selected ? 'linear-gradient(135deg, var(--primary-light) 0%, #ffd6d6 100%)' : '#f8f9fa',
                          border: selected ? '1px solid var(--primary)' : '1px solid #dee2e6',
                          color: selected ? 'var(--primary-dark)' : '#212529',
                          fontWeight: selected ? 700 : 500,
                          boxShadow: selected ? '0 2px 8px rgba(255,77,79,0.15)' : 'none'
                        }}
                      >
                        <span style={{ marginRight: 8 }}>{cat.TenDanhMuc}</span>
                        {selected && <span aria-hidden>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Crusts (Pizza only) */}
            {isPizza && (
              <div className="card border-0 shadow-sm rounded-4 mb-4" style={{
                background: 'linear-gradient(135deg, #fff5f5 0%, #ffeaea 100%)'
              }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom" style={{ borderColor: 'var(--primary)' }}>
                    <div className="rounded-3 d-flex align-items-center justify-content-center" style={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
                    }}>
                      <span style={{ fontSize: 20 }}>🍕</span>
                    </div>
                    <div>
                      <h5 className="mb-0 fw-bold">Đế bánh</h5>
                      <small className="text-muted">Chỉ cho Pizza</small>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    {crusts.map(crust => (
                      <label 
                        key={crust.MaDeBanh} 
                        className="d-flex align-items-center gap-3 p-3 rounded-3 bg-white border-2" 
                        style={{ 
                          cursor: 'pointer',
                          borderColor: form.danhSachMaDeBanh.includes(crust.MaDeBanh) ? 'var(--primary)' : '#dee2e6',
                          transition: 'all 0.2s',
                          fontWeight: form.danhSachMaDeBanh.includes(crust.MaDeBanh) ? 600 : 400,
                          boxShadow: form.danhSachMaDeBanh.includes(crust.MaDeBanh) ? '0 2px 8px rgba(255,77,79,0.2)' : 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.danhSachMaDeBanh.includes(crust.MaDeBanh)}
                          onChange={() => toggleCrust(crust.MaDeBanh)}
                          style={{ width: 20, height: 20, cursor: 'pointer' }}
                        />
                        <span>{crust.TenDeBanh}</span>
                        {form.danhSachMaDeBanh.includes(crust.MaDeBanh) && (
                          <span className="ms-auto" style={{ color: 'var(--primary)' }}>✓</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            {isPizza && (
              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                    <div className="rounded-3 d-flex align-items-center justify-content-center" style={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
                    }}>
                      <span style={{ fontSize: 20 }}>⚙️</span>
                    </div>
                    <div>
                      <h5 className="mb-0 fw-bold">Tùy chọn thêm</h5>
                      <small className="text-muted">Chỉ cho Pizza</small>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    {options.map(opt => {
                      const isSelected = form.danhSachMaTuyChon.includes(opt.MaTuyChon);
                      const priceInfo = opt.TuyChon_Gia && opt.TuyChon_Gia.length > 0;
                      return (
                        <div key={opt.MaTuyChon}>
                          <label 
                            className="d-flex align-items-start gap-3 p-3 rounded-3 border-2" 
                            style={{ 
                              cursor: 'pointer',
                              background: isSelected 
                                ? 'linear-gradient(135deg, #fff5f5 0%, #ffeaea 100%)' 
                                : '#f8f9fa',
                              borderColor: isSelected ? 'var(--primary)' : '#dee2e6',
                              transition: 'all 0.2s',
                              fontWeight: isSelected ? 600 : 400
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOption(opt.MaTuyChon)}
                              style={{ width: 20, height: 20, cursor: 'pointer', marginTop: 2 }}
                            />
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center justify-content-between">
                                <span>{opt.TenTuyChon}</span>
                                {isSelected && (
                                  <span style={{ color: 'var(--primary)' }}>✓</span>
                                )}
                              </div>
                              {priceInfo && (
                                <div className="mt-2 pt-2 border-top border-success border-opacity-25">
                                  <small className="text-muted d-block mb-1">Giá thêm theo size:</small>
                                  <div className="d-flex flex-wrap gap-2">
                                    {opt.TuyChon_Gia.map((price, idx) => (
                                      <span 
                                        key={idx}
                                        className="badge rounded-pill px-2 py-1"
                                        style={{
                                          background: 'rgba(255, 77, 79, 0.1)',
                                          color: 'var(--primary-dark)',
                                          fontSize: '0.75rem',
                                          fontWeight: 600
                                        }}
                                      >
                                        {price.Size?.TenSize}: +{Number(price.GiaThem).toLocaleString()}đ
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={`btn btn-danger w-100 rounded-pill shadow-lg ${loading ? 'disabled' : ''}`}
              style={{ padding: '16px', fontSize: '1.1rem', fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <span style={{ fontSize: 20 }}>✓</span> Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
