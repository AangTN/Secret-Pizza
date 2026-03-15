import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Spinner, Card, Button, Form, Badge, Alert, Toast, ToastContainer } from 'react-bootstrap';
import { api, assetUrl, fetchBestSellingFoods } from '../services/api';
import ProductCard from '../components/ui/ProductCard';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './ProductDetail.module.css';

function variantPrice(variant) {
  const v = variant?.GiaBan;
  return v ? Number(v) : 0;
}

function optionExtraForSize(option, sizeId) {
  const price = option?.TuyChon_Gia?.find(g => g.Size?.MaSize === sizeId)?.GiaThem;
  return price ? Number(price) : 0;
}

const ProductDetail = () => {
  const { id } = useParams();
  const { add } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [food, setFood] = useState(null);
  const [sizeId, setSizeId] = useState(null);
  const [crustId, setCrustId] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({}); // key: MaTuyChon boolean
  const [qty, setQty] = useState(1);

  // Review states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [recommended, setRecommended] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/api/foods/${id}`);
        if (mounted) {
          setFood(res.data);
          
          // Select cheapest variant by default
          const variants = res.data?.BienTheMonAn || [];
          if (variants.length > 0) {
            const cheapest = variants.reduce((prev, curr) => {
              const p1 = Number(prev.GiaBan) || 0;
              const p2 = Number(curr.GiaBan) || 0;
              return p1 < p2 ? prev : curr;
            });
            if (cheapest?.Size?.MaSize) {
              setSizeId(cheapest.Size.MaSize);
            }
          }

          const crustList = (res.data?.MonAn_DeBanh || []).map(mdb => mdb.DeBanh).filter(Boolean) || [];
          if (crustList.length) setCrustId(crustList[0].MaDeBanh);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

    // Load recommended products (best-selling / featured)
    useEffect(() => {
      let mounted = true;
      (async () => {
        if (!food) return;
        setRecommendedLoading(true);
        try {
          const res = await fetchBestSellingFoods(food.MaLoaiMonAn);
          const data = Array.isArray(res) ? res : (res?.data || []);
          if (!mounted) return;
          // exclude current product
          const list = (Array.isArray(data) ? data : []).filter(p => Number(p.MaMonAn) !== Number(id));
          setRecommended(list.slice(0, 4));
        } catch (err) {
          console.error('fetchBestSellingFoods failed', err);
        } finally {
          if (mounted) setRecommendedLoading(false);
        }
      })();
      return () => { mounted = false; };
    }, [id, food]);


  const imageUrl = useMemo(() => {
    if (!food?.HinhAnh) return '/placeholder.svg';
    const raw = String(food.HinhAnh);
    const path = raw.startsWith('/') ? raw : `/images/AnhMonAn/${raw}`;
    return assetUrl(path);
  }, [food]);

  const variants = food?.BienTheMonAn || [];
  const sizes = variants.map(v => v.Size).filter(Boolean);
  const type = food?.LoaiMonAn; // single type of this product
  // adapt to new payload: `DanhMuc` is an array of categories; keep backward compat
  const categories = useMemo(() => {
    const legacy = (food?.MonAn_DanhMuc || []).map(md => md.DanhMuc).filter(Boolean);
    if (legacy.length > 0) return legacy;
    if (Array.isArray(food?.DanhMuc)) return food.DanhMuc;
    return [];
  }, [food]);
  const crusts = (food?.MonAn_DeBanh || []).map(mdb => mdb.DeBanh);

  // Handle products without sizes (MaSize: null) - use the first variant
  const baseVariant = sizes.length > 0 
    ? variants.find(v => v.Size?.MaSize === sizeId) || null
    : (variants.length > 0 ? variants[0] : null);
  const basePrice = variantPrice(baseVariant);

  // Calculate promotion discount
  const promotion = food?.KhuyenMai;
  const { discountedPrice: basePriceAfterDiscount, hasDiscount } = useMemo(() => {
    if (!promotion || !basePrice) {
      return { discountedPrice: basePrice, hasDiscount: false };
    }
    
    const kmLoai = promotion.KMLoai?.toUpperCase();
    const kmGiaTri = Number(promotion.KMGiaTri || 0);
    let discount = 0;
    
    if (kmLoai === 'PERCENT' || kmLoai === 'PHANTRAM') {
      discount = (basePrice * kmGiaTri) / 100;
    } else if (kmLoai === 'AMOUNT' || kmLoai === 'SOTIEN') {
      discount = kmGiaTri;
    }
    
    const finalPrice = Math.max(0, basePrice - discount);
    return { 
      discountedPrice: finalPrice, 
      hasDiscount: discount > 0 
    };
  }, [basePrice, promotion]);

  const groupedOptions = useMemo(() => {
    const list = (food?.MonAn_TuyChon || []).map(mt => mt.TuyChon);
    // Filter options: only show if they have a price for the selected size
    // If no size is selected (sizeId is null), show all options
    const filteredList = list.filter(opt => {
      if (!sizeId) return true; // No size selected, show all options
      // Check if this option has a price for the current sizeId
      const hasPriceForSize = opt?.TuyChon_Gia?.some(g => g.Size?.MaSize === sizeId);
      return hasPriceForSize;
    });
    const groups = {};
    filteredList.forEach(opt => {
      const key = opt?.LoaiTuyChon?.TenLoaiTuyChon || 'Khác';
      if (!groups[key]) groups[key] = [];
      groups[key].push(opt);
    });
    return groups;
  }, [food, sizeId]);

  // Clear selected options that don't have price for the new size when size changes
  useEffect(() => {
    if (!sizeId) return;
    const list = (food?.MonAn_TuyChon || []).map(mt => mt.TuyChon);
    const updatedSelectedOptions = { ...selectedOptions };
    let hasChanges = false;
    
    Object.keys(updatedSelectedOptions).forEach(optionIdStr => {
      if (!updatedSelectedOptions[optionIdStr]) return; // Skip unchecked options
      const optionId = Number(optionIdStr);
      const opt = list.find(o => o.MaTuyChon === optionId);
      // Check if this option has a price for the current size
      const hasPriceForSize = opt?.TuyChon_Gia?.some(g => g.Size?.MaSize === sizeId);
      if (!hasPriceForSize) {
        updatedSelectedOptions[optionIdStr] = false;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setSelectedOptions(updatedSelectedOptions);
    }
  }, [sizeId, food]);

  const optionsExtra = useMemo(() => {
    const ids = Object.keys(selectedOptions).filter(k => selectedOptions[k]);
    return ids.reduce((sum, idStr) => {
      const idNum = Number(idStr);
      const list = (food?.MonAn_TuyChon || []).map(mt => mt.TuyChon);
      const opt = list.find(o => o.MaTuyChon === idNum);
      return sum + optionExtraForSize(opt, sizeId);
    }, 0);
  }, [selectedOptions, food, sizeId]);

  const total = useMemo(() => {
    return (basePriceAfterDiscount + optionsExtra) * qty;
  }, [basePriceAfterDiscount, optionsExtra, qty]);
  
  const originalTotal = useMemo(() => {
    return (basePrice + optionsExtra) * qty;
  }, [basePrice, optionsExtra, qty]);

  const toggleOption = (id, groupOptions) => {
    setSelectedOptions(prev => {
      const isCurrentlySelected = !!prev[id];
      const newState = { ...prev };
      
      if (!isCurrentlySelected) {
        // Deselect other options in the same group
        if (groupOptions && Array.isArray(groupOptions)) {
          groupOptions.forEach(opt => {
            newState[opt.MaTuyChon] = false;
          });
        }
        // Select the clicked option
        newState[id] = true;
      } else {
        // Deselect the clicked option
        newState[id] = false;
      }
      return newState;
    });
  };

  const addToCart = () => {
    if (!food) return;
    const optIds = Object.keys(selectedOptions)
      .filter(k => selectedOptions[k])
      .map(k => Number(k));
    const item = {
      loai: 'SP',
      monAnId: food.MaMonAn,
      bienTheId: baseVariant?.MaBienThe ?? null,
      deBanhId: crustId ?? null,
      tuyChonThem: optIds,
      soLuong: qty
    };
    add(item);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setReviewError('Vui lòng đăng nhập để viết đánh giá');
      return;
    }

    setReviewSubmitting(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      // Build payload in the backend-expected shape and log it for debugging
      const payloadBackend = {
        MaMonAn: food.MaMonAn,
        MaTaiKhoan: user.maNguoiDung,
        SoSao: Number(reviewRating),
        NoiDung: reviewContent.trim()
      };

      // Log the exact JSON we will send to backend
      // This helps debugging / backend contract verification
      // (user requested to console.log this structure)
      // eslint-disable-next-line no-console
      console.log('Review payload (to backend):', JSON.stringify(payloadBackend, null, 2));

      const res = await api.post('/api/reviews', payloadBackend);

      // Backend returns either { message } or { message, data }
      const backendMessage = res?.data?.message || 'Đã gửi đánh giá';

      if (res?.data?.data) {
        // Success path (review created or queued)
        setReviewSuccess(backendMessage);
        setShowSuccessToast(true);
        setReviewContent('');
        setReviewRating(5);
        setShowReviewForm(false);

        // Add the newly created review to the reviews list immediately
        // Backend returns the full review object with TaiKhoan and status
        const newReview = res.data.data;
        setFood(prev => ({
          ...prev,
          DanhGiaMonAn: [newReview, ...(prev?.DanhGiaMonAn || [])]
        }));
      } else {
        // Backend only returned a message (e.g., cannot review yet)
        setReviewError(backendMessage);
      }
    } catch (error) {
      setReviewError(error?.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.loadingSpinner}>
        <Spinner animation="border" variant="danger" />
        <div className={styles.loadingText}>Đang tải thông tin món ăn...</div>
      </section>
    );
  }

  if (!food) {
    return (
      <section className="py-5 text-center">
        <h3>Không tìm thấy món ăn.</h3>
      </section>
    );
  }

  return (
    <section className={styles.detailContainer}>
      {/* Success Toast Notification */}
      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast 
          show={showSuccessToast} 
          onClose={() => setShowSuccessToast(false)} 
          delay={4000} 
          autohide
          bg="success"
        >
          <Toast.Header>
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="me-2">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </svg>
            <strong className="me-auto">Thành công</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {reviewSuccess || 'Đánh giá của bạn đã được gửi!'}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <Container className="py-4">
        {/* Breadcrumb */}
        <nav className="mb-3" aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/" className="text-decoration-none">Trang chủ</Link></li>
            <li className="breadcrumb-item"><Link to="/menu" className="text-decoration-none">Thực đơn</Link></li>
            {food?.LoaiMonAn && (
              <li className="breadcrumb-item"><Link to={`/menu?type=${food.LoaiMonAn.MaLoaiMonAn}`} className="text-decoration-none">{food.LoaiMonAn.TenLoaiMonAn}</Link></li>
            )}
            <li className="breadcrumb-item active">{food.TenMonAn}</li>
          </ol>
        </nav>

        <Row className="g-4">
          {/* Image Section */}
          <Col lg={5}>
            <Card className="border-0 shadow-sm" style={{ position: 'sticky', top: '100px', zIndex: 900 }}>
              <div className="ratio ratio-1x1" style={{ position: 'relative' }}>
                <img 
                  src={imageUrl} 
                  alt={food.TenMonAn} 
                  style={{ 
                    objectFit: 'cover', 
                    borderRadius: '12px',
                    transition: 'transform 0.3s ease'
                  }} 
                  className={styles.mainImage}
                />
                {promotion && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 2
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      left: '15px',
                      background: 'linear-gradient(135deg, #ff4d4f 0%, #ff6b6b 100%)',
                      color: '#fff',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '9999px',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      lineHeight: 1.1,
                      letterSpacing: '0.3px',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 6px 16px rgba(255, 77, 79, 0.35)',
                      textShadow: '0 1px 0 rgba(0, 0, 0, 0.08)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {(promotion.KMLoai?.toUpperCase() === 'PERCENT' || promotion.KMLoai?.toUpperCase() === 'PHANTRAM') ? (
                        <>-{promotion.KMGiaTri}%</>
                      ) : (
                        <>-{Number(promotion.KMGiaTri).toLocaleString()}<span style={{fontSize: '0.75em'}}>đ</span></>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </Col>

          {/* Details Section */}
          <Col lg={7}>
            <div className="mb-4">
              <h1 className={styles.productTitle}>{food.TenMonAn}</h1>
              
              {/* Type, Categories, Rating */}
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                {type && (
                  <Badge bg="danger" className="px-3 py-2">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                      <path d="M4.285 9.567a.5.5 0 0 1 .683.183A3.498 3.498 0 0 0 8 11.5a3.498 3.498 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.498 4.498 0 0 1 8 12.5a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683zM7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zm4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5z"/>
                    </svg>
                    {type.TenLoaiMonAn}
                  </Badge>
                )}
                
                {categories.length > 0 && categories.map(c => (
                  <Badge key={c.MaDanhMuc} bg="light" text="dark" className="px-2 py-1">
                    {c.TenDanhMuc}
                  </Badge>
                ))}
                
                {Number(food?.SoDanhGia || 0) > 0 ? (
                  <div className="d-flex align-items-center gap-1">
                    <span className="text-warning fw-bold">
                      ⭐ {Number(food.SoSaoTrungBinh || 0).toFixed(1)}
                    </span>
                    <span className="text-muted">({Number(food.SoDanhGia)} đánh giá)</span>
                  </div>
                ) : (
                  <span className="small text-muted">Chưa có đánh giá</span>
                )}
              </div>
              
              {food.MoTa && (
                <p className="text-muted mb-3" style={{ fontSize: '1.05rem', lineHeight: '1.7' }}>
                  {food.MoTa}
                </p>
              )}
              
              {promotion && (
                <Alert variant="success" className="d-flex align-items-center mb-3">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="me-2 flex-shrink-0">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                  </svg>
                  <div>
                    <strong>🎉 {promotion.TenKhuyenMai}</strong>
                    <div className="small">
                      {(promotion.KMLoai?.toUpperCase() === 'PERCENT' || promotion.KMLoai?.toUpperCase() === 'PHANTRAM') ? (
                        <>Giảm {promotion.KMGiaTri}% cho món này</>
                      ) : (
                        <>Giảm {Number(promotion.KMGiaTri).toLocaleString()}đ cho món này</>
                      )}
                    </div>
                  </div>
                </Alert>
              )}
            </div>

            {/* Price Display for products without sizes */}
            {sizes.length === 0 && basePrice > 0 && (
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body className="p-3">
                  <h5 className="fw-bold mb-2 d-flex align-items-center">
                    <svg width="20" height="20" fill="#dc3545" viewBox="0 0 16 16" className="me-2">
                      <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2.5 1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-11zm0 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3z"/>
                    </svg>
                    Giá món ăn
                  </h5>
                  {hasDiscount ? (
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ 
                        color: '#94a3b8', 
                        fontSize: '1.25rem', 
                        textDecoration: 'line-through',
                        fontWeight: 500
                      }}>
                        {basePrice.toLocaleString()}đ
                      </div>
                      <div style={{ 
                        color: '#dc3545', 
                        fontSize: '1.75rem', 
                        fontWeight: 700
                      }}>
                        {basePriceAfterDiscount.toLocaleString()}đ
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      color: '#dc3545', 
                      fontSize: '1.75rem', 
                      fontWeight: 700
                    }}>
                      {basePrice.toLocaleString()}đ
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Size Selection */}
            {sizes.length > 0 && (
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body className="p-3">
                  <h5 className="fw-bold mb-3 d-flex align-items-center">
                    <svg width="20" height="20" fill="#dc3545" viewBox="0 0 16 16" className="me-2">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    </svg>
                    Chọn kích thước <span className="text-danger ms-1">*</span>
                  </h5>
                  <Row className="g-2">
                    {sizes.map(s => {
                      const variant = variants.find(v => v.Size?.MaSize === s.MaSize);
                      const price = variantPrice(variant);
                      const isSelected = sizeId === s.MaSize;
                      return (
                        <Col xs={4} key={s.MaSize}>
                          <div
                            className={`${styles.sizeOption} ${isSelected ? styles.sizeSelected : ''}`}
                            onClick={() => setSizeId(s.MaSize)}
                          >
                            <div className={styles.sizeName}>{s.TenSize}</div>
                            {price > 0 && (
                              <div className={styles.sizePrice}>{price.toLocaleString()}đ</div>
                            )}
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* Crust Selection */}
            {crusts.length > 0 && (
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body className="p-3">
                  <h5 className="fw-bold mb-3 d-flex align-items-center">
                    <svg width="20" height="20" fill="#dc3545" viewBox="0 0 16 16" className="me-2">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    </svg>
                    Chọn đế bánh <span className="text-danger ms-1">*</span>
                  </h5>
                  <Row className="g-2">
                    {crusts.map(d => {
                      const isSelected = crustId === d.MaDeBanh;
                      return (
                        <Col xs={4} key={d.MaDeBanh}>
                          <div
                            className={`${styles.crustOption} ${isSelected ? styles.crustSelected : ''}`}
                            onClick={() => setCrustId(d.MaDeBanh)}
                          >
                            {d.TenDeBanh}
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* Options */}
            {Object.keys(groupedOptions).length > 0 && (
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body className="p-3">
                  <h5 className="fw-bold mb-3 d-flex align-items-center">
                    <svg width="20" height="20" fill="#dc3545" viewBox="0 0 16 16" className="me-2">
                      <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2zm6.5 4.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3a.5.5 0 0 1 1 0z"/>
                    </svg>
                    Tùy chọn thêm
                  </h5>
                  {Object.entries(groupedOptions).map(([group, opts]) => (
                    <div key={group} className="mb-3">
                      <div className="small text-muted fw-semibold mb-2">{group}</div>
                      {opts.map(o => {
                        const extra = optionExtraForSize(o, sizeId);
                        const isChecked = !!selectedOptions[o.MaTuyChon];
                        return (
                          <Form.Check
                            key={o.MaTuyChon}
                            type="checkbox"
                            id={`option-${o.MaTuyChon}`}
                            checked={isChecked}
                            onChange={() => toggleOption(o.MaTuyChon, opts)}
                            label={
                              <div className="d-flex justify-content-between align-items-center w-100">
                                <span>{o.TenTuyChon}</span>
                                {extra > 0 && (
                                  <span className="text-danger fw-semibold">+{extra.toLocaleString()}đ</span>
                                )}
                              </div>
                            }
                            className="mb-2"
                          />
                        );
                      })}
                    </div>
                  ))}
                </Card.Body>
              </Card>
            )}

            {/* Price and Add to Cart */}
            <Card className="border-0 shadow-sm bg-light">
              <Card.Body className="p-4">
                <Row className="align-items-center g-3">
                  <Col md={4}>
                    <div className="small text-muted mb-1">Tổng giá trị</div>
                    {hasDiscount && originalTotal !== total ? (
                      <div>
                        <div style={{ 
                          color: '#94a3b8', 
                          fontSize: '1rem', 
                          textDecoration: 'line-through',
                          fontWeight: 500,
                          marginBottom: '0.25rem'
                        }}>
                          {originalTotal.toLocaleString()} đ
                        </div>
                        <div className={styles.totalPrice}>
                          {total.toLocaleString()} đ
                        </div>
                        {promotion && (
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#ff4d4f',
                            fontWeight: 600,
                            marginTop: '0.25rem'
                          }}>
                            Tiết kiệm {(originalTotal - total).toLocaleString()} đ
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.totalPrice}>
                        {total.toLocaleString()} đ
                      </div>
                    )}
                  </Col>
                  
                  <Col md={3}>
                    <div className="small text-muted mb-1">Số lượng</div>
                    <div className="d-flex align-items-center gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="rounded-circle"
                        style={{ width: 36, height: 36 }}
                        onClick={() => setQty(Math.max(1, qty - 1))}
                      >
                        −
                      </Button>
                      <div className="fw-bold fs-5" style={{ minWidth: 30, textAlign: 'center' }}>{qty}</div>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="rounded-circle"
                        style={{ width: 36, height: 36 }}
                        onClick={() => setQty(qty + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </Col>

                  <Col md={5}>
                    <Button 
                      variant="danger" 
                      size="lg" 
                      className="w-100 fw-bold"
                      onClick={addToCart}
                    >
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                        <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                      </svg>
                      Thêm vào giỏ
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recommended products (match cart layout) */}
        {recommended.length > 0 && (
          <div className="mt-5 pt-5 border-top" style={{ background: '#fff' }}>
            <Container>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="mb-1" style={{ fontWeight: '700' }}>⭐ Món được đề xuất</h4>
                  <p className="text-muted small mb-0">Có thể bạn sẽ thích</p>
                </div>
                <Link to="/menu" className="btn btn-sm btn-outline-danger">
                  Xem thêm →
                </Link>
              </div>
              <Row xs={1} sm={2} md={4} className="g-4">
                {recommended.map(food => (
                  <Col key={food.MaMonAn}>
                    <ProductCard pizza={food} />
                  </Col>
                ))}
              </Row>
            </Container>
          </div>
        )}

        {/* Reviews Section */}
        <Row className="mt-5">
          <Col lg={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h3 className="mb-0 fw-bold">
                    <svg width="24" height="24" fill="#dc3545" viewBox="0 0 16 16" className="me-2">
                      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                    </svg>
                    Đánh giá sản phẩm
                  </h3>
                  
                  {isAuthenticated ? (
                    <Button 
                      variant="outline-danger"
                      onClick={() => setShowReviewForm(!showReviewForm)}
                    >
                      {showReviewForm ? 'Đóng' : 'Viết đánh giá'}
                    </Button>
                  ) : (
                    <Link to="/login">
                      <Button variant="outline-secondary">
                        Đăng nhập để đánh giá
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Review Form */}
                {showReviewForm && isAuthenticated && (
                  <Card className="bg-light border-0 mb-4">
                    <Card.Body className="p-3">
                      <Form onSubmit={handleSubmitReview}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Đánh giá của bạn</Form.Label>
                          <div className="d-flex gap-2 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                onClick={() => setReviewRating(star)}
                                style={{
                                  fontSize: '2rem',
                                  cursor: 'pointer',
                                  color: star <= reviewRating ? '#ffc107' : '#dee2e6'
                                }}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Nhận xét</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={4}
                            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                            value={reviewContent}
                            onChange={(e) => setReviewContent(e.target.value)}
                            required
                          />
                        </Form.Group>

                        {reviewError && (
                          <Alert variant="danger" className="py-2 small">{reviewError}</Alert>
                        )}
                        {reviewSuccess && (
                          <Alert variant="success" className="py-2 small">{reviewSuccess}</Alert>
                        )}

                        <div className="d-flex gap-2">
                          <Button
                            type="submit"
                            variant="danger"
                            disabled={reviewSubmitting || !reviewContent.trim()}
                          >
                            {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline-secondary"
                            onClick={() => setShowReviewForm(false)}
                          >
                            Hủy
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                )}

                {/* Reviews List */}
                {Array.isArray(food?.DanhGiaMonAn) && food.DanhGiaMonAn.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {food.DanhGiaMonAn.map(r => (
                      <Card key={r.MaDanhGiaMonAn} className="border-0 bg-light">
                        <Card.Body className="p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                                  <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                                </svg>
                              </div>
                              <div>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-semibold">{r.TaiKhoan?.NguoiDung?.HoTen || r.NguoiDung?.HoTen || 'Khách hàng'}</span>
                                  {r.TrangThai === 'Chờ duyệt' && (
                                    <Badge bg="warning" text="dark" className="px-2 py-1">
                                      Chờ duyệt
                                    </Badge>
                                  )}
                                </div>
                                <div className="small text-muted">
                                  {new Date(r.NgayDanhGia).toLocaleDateString('vi-VN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-warning" style={{ fontSize: '1.1rem' }}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i}>{i < Number(r.SoSao || 0) ? '★' : '☆'}</span>
                              ))}
                            </div>
                          </div>
                          
                          <p className="mb-0 text-muted" style={{ lineHeight: '1.6' }}>
                            {r.NoiDung}
                          </p>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <svg width="64" height="64" fill="currentColor" viewBox="0 0 16 16" className="mb-3 opacity-50">
                      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                    </svg>
                    <div className="fs-5">Chưa có đánh giá nào</div>
                    <div className="small">Hãy là người đầu tiên đánh giá sản phẩm này!</div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Mobile Sticky Bar */}
      <div className={styles.mobileBar}>
        <div>
          <div className="small text-muted">Tổng</div>
          <div className={styles.mobilePrice}>{total.toLocaleString()}đ</div>
        </div>
        <Button variant="danger" size="lg" onClick={addToCart} className="flex-grow-1">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16" className="me-1">
            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
          Thêm • SL: {qty}
        </Button>
      </div>
    </section>
  );
};

export default ProductDetail;
