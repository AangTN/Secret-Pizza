import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchOptionById, fetchOptionSizes, updateOption } from '../../services/api';
import formStyles from '../../styles/admin/AdminForm.module.css';
import buttonStyles from '../../styles/admin/AdminButton.module.css';
import cardStyles from '../../styles/admin/AdminCard.module.css';

function EditOption() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [sizes, setSizes] = useState([]);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedSizeToAdd, setSelectedSizeToAdd] = useState('');
  
  const [formData, setFormData] = useState({
    TenTuyChon: '',
    MaLoaiTuyChon: '',
    LoaiTuyChon: null,
    prices: [],
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [optionData, sizesData] = await Promise.all([
        fetchOptionById(id),
        fetchOptionSizes(),
      ]);
      
      const option = optionData.data;
      const sizesList = sizesData.data || [];
      setSizes(sizesList);
      
      // Map existing prices - CHỈ LẤY NHỮNG SIZE ĐÃ CÓ GIÁ
      const existingPrices = option.TuyChon_Gia || [];
      const loadedPrices = existingPrices.map(p => ({
        MaSize: p.MaSize,
        TenSize: p.Size?.TenSize || '',
        GiaThem: parseFloat(p.GiaThem) || 0,
      }));
      
      setFormData({
        TenTuyChon: option.TenTuyChon,
        MaLoaiTuyChon: option.MaLoaiTuyChon,
        LoaiTuyChon: option.LoaiTuyChon,
        prices: loadedPrices,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Không thể tải dữ liệu tùy chọn');
      navigate('/admin/options');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Filter out prices with value 0 or empty
    const validPrices = formData.prices.filter(p => p.GiaThem > 0);
    
    if (validPrices.length === 0) {
      alert('Vui lòng nhập giá cho ít nhất một size');
      return;
    }

    try {
      setLoading(true);
      await updateOption(id, {
        prices: validPrices.map(p => ({
          MaSize: p.MaSize,
          GiaThem: parseFloat(p.GiaThem),
        })),
      });
      
      alert('Cập nhật tùy chọn thành công!');
      navigate('/admin/options');
    } catch (error) {
      console.error('Error updating option:', error);
      alert(error.response?.data?.message || 'Lỗi khi cập nhật tùy chọn');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (sizeId, value) => {
    setFormData(prev => ({
      ...prev,
      prices: prev.prices.map(p =>
        p.MaSize === sizeId ? { ...p, GiaThem: value } : p
      ),
    }));
  };

  const handleAddSize = () => {
    // Get sizes not yet added
    const addedSizeIds = formData.prices.map(p => p.MaSize);
    const availableSizes = sizes.filter(s => !addedSizeIds.includes(s.MaSize));
    
    if (availableSizes.length === 0) {
      alert('Đã thêm hết tất cả size');
      return;
    }
    
    // Open modal to select size
    setSelectedSizeToAdd(availableSizes[0].MaSize.toString());
    setShowSizeModal(true);
  };

  const handleConfirmAddSize = () => {
    if (!selectedSizeToAdd) {
      alert('Vui lòng chọn size');
      return;
    }
    
    const newSize = sizes.find(s => s.MaSize === parseInt(selectedSizeToAdd));
    if (!newSize) return;
    
    setFormData(prev => ({
      ...prev,
      prices: [...prev.prices, {
        MaSize: newSize.MaSize,
        TenSize: newSize.TenSize,
        GiaThem: 0,
      }],
    }));
    
    setShowSizeModal(false);
    setSelectedSizeToAdd('');
  };

  const handleRemoveSize = (sizeId) => {
    setFormData(prev => ({
      ...prev,
      prices: prev.prices.filter(p => p.MaSize !== sizeId),
    }));
  };

  const handleChangeSizeType = (oldSizeId, newSizeId) => {
    const newSize = sizes.find(s => s.MaSize === parseInt(newSizeId));
    if (!newSize) return;
    
    setFormData(prev => ({
      ...prev,
      prices: prev.prices.map(p =>
        p.MaSize === oldSizeId 
          ? { ...p, MaSize: newSize.MaSize, TenSize: newSize.TenSize }
          : p
      ),
    }));
  };

  if (loadingData) {
    return (
      <div className="admin-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className={cardStyles.card}>
        <div className={cardStyles.cardHeader}>
          <div>
            <h2 className={cardStyles.cardTitle}>Sửa tùy chọn</h2>
            <p className={cardStyles.cardDescription}>
              Cập nhật giá cho các size (không thể sửa tên)
            </p>
          </div>
          <button
            type="button"
            className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
            onClick={() => navigate('/admin/options')}
          >
            ← Quay lại
          </button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form}>
          <div className={formStyles.formGrid}>
            {/* Tên tùy chọn - DISABLED */}
            <div className={formStyles.formGroup}>
              <label className={formStyles.formLabel}>
                Tên tùy chọn
              </label>
              <input
                type="text"
                className={formStyles.formInput}
                value={formData.TenTuyChon}
                disabled
                style={{
                  backgroundColor: '#e9ecef',
                  cursor: 'not-allowed',
                  color: '#6c757d',
                }}
              />
              <small style={{ color: '#6c757d', marginTop: '4px', display: 'block' }}>
                ⚠️ Không thể sửa tên tùy chọn
              </small>
            </div>

            {/* Loại tùy chọn - DISABLED */}
            <div className={formStyles.formGroup}>
              <label className={formStyles.formLabel}>
                Loại tùy chọn
              </label>
              <input
                type="text"
                className={formStyles.formInput}
                value={formData.LoaiTuyChon?.TenLoaiTuyChon || ''}
                disabled
                style={{
                  backgroundColor: '#e9ecef',
                  cursor: 'not-allowed',
                  color: '#6c757d',
                }}
              />
            </div>
          </div>

          {/* Giá theo size */}
          <div className={formStyles.formGroup}>
            <label className={formStyles.formLabel}>
              Giá thêm theo size <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '12px' }}>
              Thêm/xóa size và cập nhật giá phụ thu tương ứng.
            </p>
            
            {formData.prices.length > 0 && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
              }}>
                {formData.prices.map((price) => {
                  const addedSizeIds = formData.prices.map(p => p.MaSize);
                  const availableSizes = sizes.filter(s => 
                    s.MaSize === price.MaSize || !addedSizeIds.includes(s.MaSize)
                  );
                  
                  return (
                    <div
                      key={price.MaSize}
                      style={{
                        padding: '16px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        backgroundColor: '#fafafa',
                        position: 'relative',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(price.MaSize)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: '1',
                        }}
                        title="Xóa size"
                      >
                        ×
                      </button>
                      
                      <label style={{ 
                        display: 'block', 
                        fontWeight: '600', 
                        marginBottom: '8px',
                        color: '#2c3e50',
                        fontSize: '13px',
                      }}>
                        Size
                      </label>
                      <select
                        className={formStyles.formInput}
                        value={price.MaSize}
                        onChange={(e) => handleChangeSizeType(price.MaSize, e.target.value)}
                        style={{ marginBottom: '12px' }}
                      >
                        {availableSizes.map(size => (
                          <option key={size.MaSize} value={size.MaSize}>
                            {size.TenSize}
                          </option>
                        ))}
                      </select>
                      
                      <label style={{ 
                        display: 'block', 
                        fontWeight: '600', 
                        marginBottom: '8px',
                        color: '#2c3e50',
                        fontSize: '13px',
                      }}>
                        Giá thêm
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          className={formStyles.formInput}
                          value={price.GiaThem}
                          onChange={(e) => handlePriceChange(price.MaSize, e.target.value)}
                          placeholder="0"
                          min="0"
                          step="1000"
                          style={{ paddingRight: '45px' }}
                        />
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#6c757d',
                          fontSize: '14px',
                          fontWeight: '500',
                        }}>
                          đ
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <button
              type="button"
              className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
              onClick={handleAddSize}
              style={{ width: 'auto' }}
            >
              + Thêm size
            </button>
          </div>

          {/* Actions */}
          <div className={formStyles.formActions}>
            <button
              type="button"
              className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
              onClick={() => navigate('/admin/options')}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`${buttonStyles.button} ${buttonStyles.buttonPrimary}`}
              disabled={loading}
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật tùy chọn'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal chọn size */}
      {showSizeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowSizeModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
              Chọn size
            </h3>
            
            <div className={formStyles.formGroup}>
              <label className={formStyles.formLabel}>Size</label>
              <select
                className={formStyles.formInput}
                value={selectedSizeToAdd}
                onChange={(e) => setSelectedSizeToAdd(e.target.value)}
              >
                {sizes
                  .filter(s => !formData.prices.map(p => p.MaSize).includes(s.MaSize))
                  .map(size => (
                    <option key={size.MaSize} value={size.MaSize}>
                      {size.TenSize}
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className={`${buttonStyles.button} ${buttonStyles.buttonOutline}`}
                onClick={() => setShowSizeModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`${buttonStyles.button} ${buttonStyles.buttonPrimary}`}
                onClick={handleConfirmAddSize}
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditOption;
