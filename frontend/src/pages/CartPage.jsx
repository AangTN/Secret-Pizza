import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Modal } from 'react-bootstrap';
import { useCart } from '../contexts/CartContext';
import { Link } from 'react-router-dom';
import { assetUrl, fetchFoods, fetchCombos, fetchVariants, fetchOptionPrices, fetchCrusts, fetchFeaturedFoods, api } from '../services/api';
import ProductCard from '../components/ui/ProductCard';

const CartPage = () => {
  const { items, remove, setQty, clear, add } = useCart();
  const [loading, setLoading] = useState(items.length > 0);
  const [error, setError] = useState('');
  const [foodsMap, setFoodsMap] = useState({});
  const [combosMap, setCombosMap] = useState({});
  const [variantsMap, setVariantsMap] = useState({});
  const [optionPricesMap, setOptionPricesMap] = useState({});
  const [crustsMap, setCrustsMap] = useState({});
  const [featuredFoods, setFeaturedFoods] = useState([]);

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editorFood, setEditorFood] = useState(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editSizeId, setEditSizeId] = useState(null);
  const [editCrustId, setEditCrustId] = useState(null);
  const [editOptions, setEditOptions] = useState({});
  const [editQty, setEditQty] = useState(1);

  // Load featured foods
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const featured = await fetchFeaturedFoods();
        if (active) {
          setFeaturedFoods(Array.isArray(featured) ? featured.slice(0, 4) : []);
        }
      } catch (err) {
        console.error('Failed to load featured foods:', err);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    let active = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const [foodsData, combosData, variantsData, optionPricesData, crustsData] = await Promise.all([
          fetchFoods(),
          fetchCombos(),
          fetchVariants(),
          fetchOptionPrices(),
          fetchCrusts()
        ]);
        if (!active) return;
        const fMap = {};
        (Array.isArray(foodsData) ? foodsData : []).forEach(f => { fMap[f.MaMonAn] = f; });
        const cMap = {};
        (Array.isArray(combosData) ? combosData : []).forEach(c => { cMap[c.MaCombo] = c; });
        const vMap = {};
        (Array.isArray(variantsData) ? variantsData : []).forEach(v => { vMap[v.MaBienThe] = v; });
        const oMap = {};
        (Array.isArray(optionPricesData) ? optionPricesData : []).forEach(op => {
          const key = `${op.MaTuyChon}_${op.MaSize}`;
          oMap[key] = op;
        });
        const crMap = {};
        (Array.isArray(crustsData) ? crustsData : []).forEach(cr => { crMap[cr.MaDeBanh] = cr; });
        setFoodsMap(fMap);
        setCombosMap(cMap);
        setVariantsMap(vMap);
        setOptionPricesMap(oMap);
        setCrustsMap(crMap);
      } catch (err) {
        if (active) setError('Không tải được thông tin giỏ hàng.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [items.length]);

  const getOptionExtra = (optionId, sizeId) => {
    if (!sizeId || !optionId) return 0;
    const op = optionPricesMap[`${optionId}_${sizeId}`];
    return Number(op?.GiaThem || 0);
  };

  const enrichedItems = useMemo(() => {
    return items.map(item => {
      if (item.loai === 'CB') {
        const combo = combosMap[item.comboId];
        if (!combo) {
          return { ...item, displayType: 'combo', displayName: `Combo #${item.comboId}`, displayImage: '/placeholder.svg', displayPrice: 0, displayTotal: 0, displayDetails: 'Không tìm thấy thông tin combo', hasError: true };
        }
        const price = Number(combo.GiaCombo || 0);
        const rawImg = combo.HinhAnh;
        const imgPath = rawImg ? (String(rawImg).startsWith('/') ? String(rawImg) : `/images/AnhCombo/${rawImg}`) : null;
        return { ...item, displayType: 'combo', displayName: combo.TenCombo, displayImage: imgPath ? assetUrl(imgPath) : '/placeholder.svg', displayPrice: price, displayTotal: price * item.soLuong, displayDetails: combo.MoTa || '', comboItemsCount: Array.isArray(combo.Items) ? combo.Items.length : 0, hasError: false };
      }
      const food = foodsMap[item.monAnId];
      if (!food) {
        return { ...item, displayType: 'product', displayName: `Món #${item.monAnId}`, displayImage: '/placeholder.svg', displayPrice: 0, displayTotal: 0, displayDetails: 'Không tìm thấy thông tin món ăn', hasError: true };
      }

      // Validate Variant
      if (item.bienTheId && !variantsMap[item.bienTheId]) {
        return { ...item, displayType: 'product', displayName: food.TenMonAn, displayImage: '/placeholder.svg', displayPrice: 0, displayTotal: 0, displayDetails: 'Biến thể không tồn tại', hasError: true };
      }

      // Validate Crust
      if (item.deBanhId && !crustsMap[item.deBanhId]) {
        return { ...item, displayType: 'product', displayName: food.TenMonAn, displayImage: '/placeholder.svg', displayPrice: 0, displayTotal: 0, displayDetails: 'Đế bánh không tồn tại', hasError: true };
      }

      const variant = item.bienTheId ? variantsMap[item.bienTheId] : null;
      const basePrice = variant ? Number(variant.GiaBan || 0) : 0;
      const sizeId = variant?.Size?.MaSize;
      const sizeName = variant?.Size?.TenSize || '';
      const crust = item.deBanhId ? crustsMap[item.deBanhId] : null;
      const crustName = crust?.TenDeBanh || '';
      
      let optionsExtra = 0;
      const optionNames = [];
      let optionsError = false;

      if (Array.isArray(item.tuyChonThem) && item.tuyChonThem.length > 0) {
        if (!sizeId) {
           optionsError = true;
        } else {
           for (const optId of item.tuyChonThem) {
              const key = `${optId}_${sizeId}`;
              const optionPrice = optionPricesMap[key];
              if (!optionPrice) {
                 optionsError = true;
                 break;
              }
              if (optionPrice.TuyChon) {
                const extra = Number(optionPrice.GiaThem || 0);
                optionsExtra += extra;
                const optName = optionPrice.TuyChon.TenTuyChon;
                optionNames.push(optName + (extra > 0 ? ` (+${extra.toLocaleString()} đ)` : ''));
              }
           }
        }
      }

      if (optionsError) {
        return { ...item, displayType: 'product', displayName: food.TenMonAn, displayImage: '/placeholder.svg', displayPrice: 0, displayTotal: 0, displayDetails: 'Tùy chọn không hợp lệ', hasError: true };
      }
      const unitPrice = basePrice + optionsExtra;
      
      // Calculate promotion discount
      const promotion = food.KhuyenMai;
      let discountedUnitPrice = unitPrice;
      let hasDiscount = false;
      
      if (promotion && basePrice > 0) {
        const kmLoai = promotion.KMLoai?.toUpperCase();
        const kmGiaTri = Number(promotion.KMGiaTri || 0);
        let discount = 0;
        
        if (kmLoai === 'PERCENT' || kmLoai === 'PHANTRAM') {
          discount = (basePrice * kmGiaTri) / 100;
        } else if (kmLoai === 'AMOUNT' || kmLoai === 'SOTIEN') {
          discount = kmGiaTri;
        }
        
        const basePriceAfterDiscount = Math.max(0, basePrice - discount);
        discountedUnitPrice = basePriceAfterDiscount + optionsExtra;
        hasDiscount = discount > 0;
      }
      
      const total = discountedUnitPrice * item.soLuong;
      const originalTotal = unitPrice * item.soLuong;
      
      const segments = [];
      if (sizeName) segments.push(`Size: ${sizeName}`);
      if (crustName) segments.push(`Đế: ${crustName}`);
      if (optionNames.length > 0) segments.push(`Tùy chọn: ${optionNames.join(', ')}`);
      const detailLine = segments.join(' • ');
      const rawImg = food.HinhAnh;
      const imgPath = rawImg ? (String(rawImg).startsWith('/') ? String(rawImg) : `/images/AnhMonAn/${rawImg}`) : null;
      return { 
        ...item, 
        displayType: 'product', 
        displayName: food.TenMonAn, 
        displayImage: imgPath ? assetUrl(imgPath) : '/placeholder.svg', 
        displayPrice: discountedUnitPrice,
        originalPrice: unitPrice,
        displayTotal: total,
        originalTotal: originalTotal,
        displayDetails: detailLine,
        promotion: promotion,
        hasDiscount: hasDiscount,
        hasError: false 
      };
    });
  }, [items, foodsMap, combosMap, variantsMap, optionPricesMap, crustsMap]);

  const subtotal = useMemo(() => enrichedItems.reduce((sum, item) => sum + (item.displayTotal || 0), 0), [enrichedItems]);
  
  const totalDiscount = useMemo(() => {
    return enrichedItems.reduce((sum, item) => {
      if (item.hasDiscount && item.originalTotal && item.displayTotal) {
        return sum + (item.originalTotal - item.displayTotal);
      }
      return sum;
    }, 0);
  }, [enrichedItems]);
  
  const originalSubtotal = useMemo(() => {
    return enrichedItems.reduce((sum, item) => {
      if (item.originalTotal) {
        return sum + item.originalTotal;
      }
      return sum + (item.displayTotal || 0);
    }, 0);
  }, [enrichedItems]);

  // Check for invalid items and clear cart if found
  useEffect(() => {
    if (!loading && items.length > 0) {
      const hasError = enrichedItems.some(item => item.hasError);
      if (hasError) {
        alert('Thông tin sản phẩm đã bị thay đổi vui lòng thêm lại vào giỏ hàng');
        clear();
      }
    }
  }, [loading, items.length, enrichedItems, clear]);

  // Editor functions
  const openEditor = async (item) => {
    if (item.displayType === 'combo') return; // Không cho edit combo
    setEditingItem(item);
    setEditorLoading(true);
    try {
      const res = await api.get(`/api/foods/${item.monAnId}`);
      const foodDetail = res.data;
      setEditorFood(foodDetail);
      setEditSizeId(item.bienTheId ? variantsMap[item.bienTheId]?.Size?.MaSize : null);
      setEditCrustId(item.deBanhId);
      const opts = {};
      (item.tuyChonThem || []).forEach(id => { opts[id] = true; });
      setEditOptions(opts);
      setEditQty(item.soLuong);
    } catch (err) {
      console.error('Failed to load food detail:', err);
    } finally {
      setEditorLoading(false);
    }
  };

  const closeEditor = () => {
    setEditingItem(null);
    setEditorFood(null);
    setEditSizeId(null);
    setEditCrustId(null);
    setEditOptions({});
    setEditQty(1);
  };

  const saveEdit = () => {
    if (!editingItem || !editorFood) return;
    // Remove old item
    remove(editingItem.key);
    // Add new item with updated config
    const optIds = Object.keys(editOptions).filter(k => editOptions[k]).map(Number);
    const variant = (editorFood.BienTheMonAn || []).find(v => v.Size?.MaSize === editSizeId);
    const newItem = {
      loai: 'SP',
      monAnId: editorFood.MaMonAn,
      bienTheId: variant?.MaBienThe ?? null,
      deBanhId: editCrustId ?? null,
      tuyChonThem: optIds,
      soLuong: editQty
    };
    add(newItem);
    closeEditor();
  };

  // Editor computed values
  const editorVariants = editorFood?.BienTheMonAn || [];
  const editorSizes = editorVariants.map(v => v.Size).filter(Boolean);
  const editorCrusts = (editorFood?.MonAn_DeBanh || []).map(mdb => mdb.DeBanh).filter(Boolean);
  const editorBaseVariant = editorVariants.find(v => v.Size?.MaSize === editSizeId);
  const editorBasePrice = editorBaseVariant ? Number(editorBaseVariant.GiaBan || 0) : 0;

  const editorOptionsExtra = useMemo(() => {
    if (!editSizeId || !editorFood) return 0;
    const selectedIds = Object.keys(editOptions).filter(k => editOptions[k]).map(Number);
    return selectedIds.reduce((sum, optId) => {
      // Find option in MonAn_TuyChon
      const mt = (editorFood.MonAn_TuyChon || []).find(m => m.TuyChon?.MaTuyChon === optId);
      if (!mt || !mt.TuyChon) return sum;
      // Find price for current size in TuyChon_Gia
      const priceEntry = (mt.TuyChon.TuyChon_Gia || []).find(tg => tg.MaSize === editSizeId);
      return sum + Number(priceEntry?.GiaThem || 0);
    }, 0);
  }, [editOptions, editSizeId, editorFood]);

  // Calculate editor promotion discount
  const editorPromotion = editorFood?.KhuyenMai;
  const editorBasePriceAfterDiscount = useMemo(() => {
    if (!editorPromotion || !editorBasePrice) return editorBasePrice;
    
    const kmLoai = editorPromotion.KMLoai?.toUpperCase();
    const kmGiaTri = Number(editorPromotion.KMGiaTri || 0);
    let discount = 0;
    
    if (kmLoai === 'PERCENT' || kmLoai === 'PHANTRAM') {
      discount = (editorBasePrice * kmGiaTri) / 100;
    } else if (kmLoai === 'AMOUNT' || kmLoai === 'SOTIEN') {
      discount = kmGiaTri;
    }
    
    return Math.max(0, editorBasePrice - discount);
  }, [editorBasePrice, editorPromotion]);

  const editorTotal = (editorBasePriceAfterDiscount + editorOptionsExtra) * editQty;
  const editorOriginalTotal = (editorBasePrice + editorOptionsExtra) * editQty;
  const editorHasDiscount = editorPromotion && editorOriginalTotal > editorTotal;

  // Group editor options by type - from food's MonAn_TuyChon
  const editorGroupedOptions = useMemo(() => {
    if (!editorFood || !editorFood.MonAn_TuyChon) return {};
    const groups = {};
    editorFood.MonAn_TuyChon.forEach(mt => {
      const opt = mt.TuyChon;
      if (!opt) return;
      const groupName = opt.LoaiTuyChon?.TenLoaiTuyChon || 'Khác';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(opt);
    });
    return groups;
  }, [editorFood]);

  const toggleEditOption = (id, groupOptions) => {
    setEditOptions(prev => {
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

  return (
    <section style={{ background: '#f8f9fa', minHeight: '100vh', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <Container>
        {/* Header */}
        <div className="mb-4 pb-3" style={{ borderBottom: '2px solid #dee2e6' }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-2" style={{ fontWeight: '700', fontSize: '1.75rem' }}>
                🛒 Giỏ hàng của bạn
              </h2>
              <p className="text-muted mb-0">
                {items.length > 0 ? (
                  <><strong>{items.length}</strong> sản phẩm</>
                ) : (
                  'Chưa có sản phẩm nào'
                )}
              </p>
            </div>
            {items.length > 0 && (
              <Button 
                variant="outline-danger" 
                onClick={clear}
                style={{ 
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontWeight: '500'
                }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
                Xóa tất cả
              </Button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div 
            className="text-center py-5" 
            style={{ 
              background: '#fff', 
              borderRadius: '16px', 
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              padding: '4rem 2rem'
            }}
          >
            <div className="mb-4" style={{ fontSize: '5rem' }}>
              🛒
            </div>
            <h3 className="mb-3" style={{ fontWeight: '600', color: '#212529' }}>
              Giỏ hàng trống
            </h3>
            <p className="text-muted mb-4" style={{ fontSize: '1.1rem' }}>
              Khám phá menu và thêm món yêu thích vào giỏ hàng nhé!
            </p>
            <Link to="/menu">
              <Button 
                variant="danger" 
                size="lg"
                style={{
                  padding: '0.75rem 2.5rem',
                  borderRadius: '50px',
                  fontWeight: '600',
                  fontSize: '1.1rem'
                }}
              >
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                </svg>
                Khám phá menu ngay
              </Button>
            </Link>
          </div>
        ) : (
          <Row className="g-4">
            <Col lg={8}>
              {loading && (
                <div className="d-flex align-items-center gap-2 text-muted small mb-3 bg-white p-3 rounded shadow-sm">
                  <Spinner animation="border" size="sm" /> Đang tải thông tin giỏ hàng...
                </div>
              )}
              {error && <div className="alert alert-warning shadow-sm">{error}</div>}
              
              <div className="d-flex flex-column gap-3">
                {enrichedItems.map(item => {
                  const isCombo = item.displayType === 'combo';
                  return (
                    <Card key={item.key} className="border-0 shadow-sm hover-lift" style={{ transition: 'transform 0.2s ease' }}>
                      <Card.Body className="p-3">
                        <div className="d-flex gap-3 align-items-start">
                          {/* Image */}
                          <div 
                            style={{ 
                              width: 110, 
                              height: 110,
                              position: 'relative'
                            }} 
                            className="rounded overflow-hidden bg-light flex-shrink-0"
                          >
                            <img 
                              src={item.displayImage} 
                              alt={item.displayName} 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover' 
                              }} 
                              onError={(e)=>{ 
                                try { 
                                  e.currentTarget.onerror=null; 
                                  e.currentTarget.src='/placeholder.svg'; 
                                } catch{} 
                              }} 
                            />
                            {isCombo && (
                              <div 
                                className="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 small fw-bold"
                                style={{ fontSize: '0.7rem' }}
                              >
                                COMBO
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-bold">{item.displayName}</h6>
                                {isCombo && item.comboItemsCount > 0 && (
                                  <div className="small text-muted mb-1">
                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
                                    </svg>
                                    Bao gồm {item.comboItemsCount} món
                                  </div>
                                )}
                                {item.displayDetails && (
                                  <div className="small text-muted" style={{ lineHeight: '1.4' }}>
                                    {item.displayDetails}
                                  </div>
                                )}
                                {item.hasError && (
                                  <div className="small text-danger mt-1">
                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                      <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                                    </svg>
                                    Dữ liệu không hợp lệ
                                  </div>
                                )}
                                {item.hasDiscount && item.promotion && (
                                  <div className="mt-2">
                                    <span 
                                      className="badge" 
                                      style={{
                                        background: 'linear-gradient(135deg, #ff4d4f 0%, #ff6b6b 100%)',
                                        color: '#fff',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '9999px',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                        boxShadow: '0 2px 6px rgba(255, 77, 79, 0.25)'
                                      }}
                                    >
                                      {(item.promotion.KMLoai?.toUpperCase() === 'PERCENT' || item.promotion.KMLoai?.toUpperCase() === 'PHANTRAM') ? (
                                        <>-{item.promotion.KMGiaTri}%</>
                                      ) : (
                                        <>-{Number(item.promotion.KMGiaTri).toLocaleString()}<span style={{fontSize: '0.7em'}}>đ</span></>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="text-end ms-3">
                                {item.hasDiscount && item.originalPrice ? (
                                  <div>
                                    <div style={{ 
                                      color: '#94a3b8', 
                                      fontSize: '0.85rem', 
                                      textDecoration: 'line-through',
                                      fontWeight: 500,
                                      marginBottom: '0.15rem'
                                    }}>
                                      {item.originalPrice.toLocaleString()} đ
                                    </div>
                                    <div className="fw-bold text-danger fs-6">{item.displayPrice.toLocaleString()} đ</div>
                                  </div>
                                ) : (
                                  <div className="fw-bold text-danger fs-6">{item.displayPrice.toLocaleString()} đ</div>
                                )}
                                <div className="small text-muted">Đơn giá</div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                              {/* Quantity */}
                              <div className="d-inline-flex align-items-center border rounded-pill overflow-hidden bg-white shadow-sm">
                                <Button 
                                  variant="light" 
                                  className="border-0 px-3 py-1" 
                                  onClick={() => setQty(item.key, Math.max(1, item.soLuong - 1))}
                                  style={{ borderRadius: 0 }}
                                >
                                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/>
                                  </svg>
                                </Button>
                                <Form.Control 
                                  value={item.soLuong} 
                                  onChange={(e) => setQty(item.key, Math.max(1, Number(e.target.value || 1)))} 
                                  type="number" 
                                  min={1} 
                                  className="border-0 text-center fw-semibold"
                                  style={{ 
                                    width: 60, 
                                    boxShadow: 'none',
                                    padding: '0.25rem'
                                  }} 
                                />
                                <Button 
                                  variant="light" 
                                  className="border-0 px-3 py-1" 
                                  onClick={() => setQty(item.key, item.soLuong + 1)}
                                  style={{ borderRadius: 0 }}
                                >
                                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                  </svg>
                                </Button>
                              </div>

                              {/* Total & Actions */}
                              <div className="d-flex align-items-center gap-2">
                                <div className="fw-bold text-danger me-2">{item.displayTotal.toLocaleString()} đ</div>
                                {!isCombo && (
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm" 
                                    className="rounded-pill px-3"
                                    onClick={() => openEditor(item)}
                                  >
                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                    </svg>
                                    Sửa
                                  </Button>
                                )}
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  className="rounded-pill px-3"
                                  onClick={() => remove(item.key)}
                                >
                                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                  </svg>
                                  Xóa
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>

              {/* Continue Shopping */}
              <div className="mt-4">
                <Link to="/menu">
                  <Button variant="outline-primary" size="lg" className="rounded-pill px-4">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                      <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                    </svg>
                    Tiếp tục mua sắm
                  </Button>
                </Link>
              </div>
            </Col>
            <Col lg={4}>
              <Card className="border-0 shadow-sm" style={{ position: 'sticky', top: 88, zIndex: 900 }}>
                <Card.Body className="p-3">
                  <h5 className="mb-3 fw-bold">Tóm tắt đơn hàng</h5>

                  {totalDiscount > 0 && (
                    <>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Tổng tiền hàng</span>
                        <span className="text-muted" style={{ textDecoration: 'line-through' }}>
                          {originalSubtotal.toLocaleString()} đ
                        </span>
                      </div>
                      
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-success fw-semibold">
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                          </svg>
                          Khuyến mãi
                        </span>
                        <span className="text-success fw-semibold">
                          -{totalDiscount.toLocaleString()} đ
                        </span>
                      </div>
                    </>
                  )}

                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Tạm tính</span>
                    <span className="fw-semibold">{subtotal.toLocaleString()} đ</span>
                  </div>
                  
                  <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                    <span className="text-muted">Phí giao hàng</span>
                    <span className="small text-muted">Tính ở bước sau</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="fw-bold">Tổng thanh toán</span>
                    <span className="text-danger fw-bold fs-4">{subtotal.toLocaleString()} đ</span>
                  </div>
                  
                  {totalDiscount > 0 && (
                    <div className="alert alert-success py-2 px-3 mb-3" style={{ fontSize: '0.9rem' }}>
                      <strong>🎉 Bạn đã tiết kiệm {totalDiscount.toLocaleString()} đ</strong>
                    </div>
                  )}

                  <Link to="/checkout" className="d-grid" style={{ textDecoration: 'none' }}>
                    <Button variant="danger" size="lg">
                      Thanh toán
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>

      {/* Edit Modal */}
      <Modal show={!!editingItem} onHide={closeEditor} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Chỉnh sửa món trong giỏ hàng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editorLoading && <div className="text-center py-4"><Spinner animation="border" /></div>}
          {!editorLoading && editorFood && (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex gap-3">
                <div style={{ width: 120, height: 120, position: 'relative' }} className="rounded overflow-hidden bg-light flex-shrink-0">
                  {(() => {
                    const raw = editorFood.HinhAnh;
                    if (!raw) return <div className="text-muted small">No image</div>;
                    const path = String(raw).startsWith('/') ? String(raw) : `/images/AnhMonAn/${raw}`;
                    return (
                      <>
                        <img src={assetUrl(path)} alt={editorFood.TenMonAn} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {editorPromotion && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'linear-gradient(135deg, #ff4d4f 0%, #ff6b6b 100%)',
                            color: '#fff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '9999px',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            boxShadow: '0 2px 6px rgba(255, 77, 79, 0.25)'
                          }}>
                            {(editorPromotion.KMLoai?.toUpperCase() === 'PERCENT' || editorPromotion.KMLoai?.toUpperCase() === 'PHANTRAM') ? (
                              <>-{editorPromotion.KMGiaTri}%</>
                            ) : (
                              <>-{Number(editorPromotion.KMGiaTri).toLocaleString()}<span style={{fontSize: '0.7em'}}>đ</span></>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="flex-grow-1">
                  <h5 className="mb-1">{editorFood.TenMonAn}</h5>
                  <div className="text-muted small">Chỉnh sửa kích thước, đế và tùy chọn</div>
                  {editorPromotion && (
                    <div className="mt-2">
                      <span className="badge bg-success">
                        🎉 {editorPromotion.TenKhuyenMai}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {editorSizes.length > 0 && (
                <div>
                  <div className="fw-semibold mb-2">Kích thước</div>
                  <div className="d-flex flex-wrap gap-2">
                    {editorSizes.map(s => {
                      const variant = editorVariants.find(v => v.Size?.MaSize === s.MaSize);
                      const price = variant ? Number(variant.GiaBan || 0) : 0;
                      const active = editSizeId === s.MaSize;
                      return (
                        <Button key={s.MaSize} variant={active ? 'danger' : 'outline-secondary'} size="sm" onClick={() => setEditSizeId(s.MaSize)}>
                          {s.TenSize} {price > 0 && `(${price.toLocaleString()} đ)`}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {editorCrusts.length > 0 && (
                <div>
                  <div className="fw-semibold mb-2">Đế bánh</div>
                  <div className="d-flex flex-wrap gap-2">
                    {editorCrusts.map(c => (
                      <Button key={c.MaDeBanh} variant={editCrustId === c.MaDeBanh ? 'danger' : 'outline-secondary'} size="sm" onClick={() => setEditCrustId(c.MaDeBanh)}>
                        {c.TenDeBanh}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(editorGroupedOptions).length > 0 && (
                <div>
                  <div className="fw-semibold mb-2">Tùy chọn thêm</div>
                  {Object.entries(editorGroupedOptions).map(([groupName, opts]) => (
                    <div key={groupName} className="mb-3">
                      <div className="small text-uppercase text-muted mb-1">{groupName}</div>
                      <div className="d-flex flex-column gap-1">
                        {opts.map(opt => {
                          // Find price for current size in TuyChon_Gia
                          const priceEntry = (opt.TuyChon_Gia || []).find(tg => tg.MaSize === editSizeId);
                          const extra = priceEntry ? Number(priceEntry.GiaThem || 0) : 0;
                          const checked = !!editOptions[opt.MaTuyChon];
                          return (
                            <div key={opt.MaTuyChon} className={`d-flex justify-content-between align-items-center px-2 py-1 rounded border ${checked ? 'border-danger bg-light' : 'border-secondary'}`} style={{ cursor: 'pointer' }} onClick={() => toggleEditOption(opt.MaTuyChon, opts)}>
                              <div className="d-flex align-items-center gap-2">
                                <div style={{ width: 18, height: 18 }} className={`rounded border d-flex align-items-center justify-content-center ${checked ? 'bg-danger text-white' : ''}`}>{checked ? '✓' : ''}</div>
                                <span className="small">{opt.TenTuyChon}</span>
                              </div>
                              {extra > 0 && <span className="small text-muted">+{extra.toLocaleString()} đ</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="d-inline-flex align-items-center border rounded overflow-hidden">
                  <Button variant="light" className="px-2" onClick={() => setEditQty(Math.max(1, editQty - 1))}>−</Button>
                  <Form.Control value={editQty} onChange={(e) => setEditQty(Math.max(1, Number(e.target.value || 1)))} type="number" min={1} style={{ width: 64, textAlign: 'center', border: 0, boxShadow: 'none' }} />
                  <Button variant="light" className="px-2" onClick={() => setEditQty(editQty + 1)}>+</Button>
                </div>
                <div className="text-end">
                  {editorHasDiscount ? (
                    <div>
                      <div style={{ 
                        color: '#94a3b8', 
                        fontSize: '0.85rem', 
                        textDecoration: 'line-through',
                        fontWeight: 500,
                        marginBottom: '0.15rem'
                      }}>
                        {editorOriginalTotal.toLocaleString()} đ
                      </div>
                      <div className="fw-semibold text-danger">{editorTotal.toLocaleString()} đ</div>
                      <div className="small" style={{ color: '#10b981', fontWeight: 600 }}>
                        Tiết kiệm {(editorOriginalTotal - editorTotal).toLocaleString()} đ
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="fw-semibold">{editorTotal.toLocaleString()} đ</div>
                      <div className="small text-muted">Tổng tạm tính</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeEditor}>Hủy</Button>
          <Button variant="danger" onClick={saveEdit} disabled={editorLoading || !editorFood}>Lưu thay đổi</Button>
        </Modal.Footer>
      </Modal>

      {/* Featured Foods Section (Recommended) */}
      {featuredFoods.length > 0 && (
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
              {featuredFoods.map(food => (
                <Col key={food.MaMonAn}>
                  <ProductCard pizza={food} />
                </Col>
              ))}
            </Row>
          </Container>
        </div>
      )}
    </section>
  );
};

export default CartPage;
