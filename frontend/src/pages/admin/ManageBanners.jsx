import React, { useEffect, useState } from 'react';
import { fetchBanners, assetUrl, api } from '../../services/api';
import buttonStyles from '../../styles/admin/AdminButton.module.css';

const ManageBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchBanners();
        // API may return { data: [...] } or [...]
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!mounted) return;
        // normalize banner entries to a simple shape
        const mapped = list.map((b) => ({
          id: b.MaBanner,
          image: b.AnhBanner || '',
          url: b.DuongDan || '/',
        }));
        setBanners(mapped);
      } catch (err) {
        console.error('Failed loading banners', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = banners;

  const handleDelete = async (banner) => {
    if (!confirm(`Xóa banner "${banner.url}"?`)) return;
    try {
      await api.delete(`/api/banners/${banner.id}`);
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    } catch (err) {
      console.error('Delete banner failed', err);
      alert('Xóa banner thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  // Add / Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formTarget, setFormTarget] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      // cleanup blob URL if any
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const openAddModal = () => {
    setEditingBanner(null);
    setFormTarget('');
    setFormFile(null);
    setPreview('');
    setShowModal(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormTarget(banner.url || '');
    setFormFile(null);
    // ensure preview is an absolute URL if original is relative
    const img = banner.image || '';
    if (img && (String(img).startsWith('http') || String(img).startsWith('data:') || String(img).startsWith('blob:'))) {
      setPreview(img);
    } else if (img) {
      setPreview(assetUrl(img));
    } else {
      setPreview('');
    }
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(f);
      setFormFile(f);
      setPreview(url);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // creating requires file; editing may keep existing image
    if (!editingBanner && !formFile) {
      alert('Vui lòng chọn ảnh cho banner mới');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      if (formFile) formData.append('file', formFile);
      if (formTarget) formData.append('DuongDan', formTarget);

      if (editingBanner) {
        const res = await api.put(`/api/banners/${editingBanner.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const updated = res.data?.data || res.data;
        setBanners((prev) => prev.map((b) => (b.id === editingBanner.id ? { id: updated.MaBanner, image: updated.AnhBanner, url: updated.DuongDan } : b)));
      } else {
        const res = await api.post('/api/banners', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const created = res.data?.data || res.data;
        const item = { id: created.MaBanner, image: created.AnhBanner, url: created.DuongDan };
        setBanners((prev) => [item, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Save banner failed', err);
      alert('Lưu banner thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    // revoke blob URL if created by file
    if (formFile && preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setFormFile(null);
    setPreview('');
    setShowModal(false);
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Quản lý banner quảng cáo <small className="text-muted">({banners.length})</small></h3>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button
            className={`${buttonStyles.button} ${buttonStyles.buttonPrimary} ${buttonStyles.buttonLarge} ${buttonStyles.buttonRounded}`}
            onClick={openAddModal}
          >
            <span style={{ fontSize: 18, lineHeight: 1, marginRight: 8 }}>+</span> Thêm banner
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status" aria-hidden="true"></div>
          <div className="mt-2 text-muted">Đang tải banner...</div>
        </div>
      ) : (
        <div className="row g-3">
          {filtered.length === 0 ? (
            <div className="col-12">
              <div className="card p-4 text-center text-muted">Không có banner. Bấm "Thêm banner" để tạo mới.</div>
            </div>
          ) : filtered.map((banner) => (
            <div className="col-12 col-sm-6 col-lg-4" key={banner.id}>
              <div className="card h-100 shadow-sm">
                <div className="ratio ratio-16x9">
                  <img
                    src={(banner.image && (String(banner.image).startsWith('http') || String(banner.image).startsWith('data:') || String(banner.image).startsWith('blob:'))) ? banner.image : assetUrl(banner.image)}
                    alt={banner.url}
                    className="w-100 h-100 object-fit-cover"
                  />
                </div>
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="card-title mb-0" style={{ wordBreak: 'break-word' }}>{banner.url}</h6>
                      <small className="text-muted">Mã: <span className="fw-semibold">{banner.id}</span></small>
                    </div>
                    <div className="text-end text-muted small" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{banner.image}</div>
                  </div>
                  <div className="mt-auto d-flex gap-2">
                    <button className="btn btn-outline-secondary btn-sm flex-grow-1" onClick={() => openEditModal(banner)}>Chỉnh sửa</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(banner)}>Xóa</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal (UI-only) */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={handleCloseModal}>
          <div style={{ width: 720, maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 8, padding: 18 }} onClick={(e) => e.stopPropagation()}>
            <h5 style={{ marginTop: 0 }}>{editingBanner ? 'Chỉnh sửa banner' : 'Thêm banner mới'}</h5>
            {editingBanner ? <div className="mb-2"><small className="text-muted">Mã banner: <strong>{editingBanner.id}</strong></small></div> : null}
            <form onSubmit={handleSave}>
              <div className="mb-2">
                <label className="form-label">Chọn ảnh {editingBanner ? <small className="text-muted">(để giữ ảnh hiện tại, không chọn file)</small> : <span className="text-danger">*</span>}</label>
                <input type="file" accept="image/*" className="form-control form-control-sm" onChange={handleFileChange} />
                {!editingBanner ? <div className="form-text text-muted">Bắt buộc chọn ảnh cho banner mới.</div> : null}
              </div>
              {preview ? (
                <div className="mb-2">
                  <label className="form-label">Xem trước</label>
                  <div style={{ border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                    <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} />
                  </div>
                </div>
              ) : null}
              <div className="mb-3">
                <label className="form-label">Đường dẫn khi bấm banner</label>
                <input type="text" className="form-control form-control-sm" placeholder="/menu hoặc /combos" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal} disabled={saving}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBanners;

