import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getShippingQuote } from '../services/shippingService';
import { api, assetUrl, fetchFoods, fetchCombos, fetchVariants, fetchOptionPrices, fetchCrusts, fetchVoucherByCode } from '../services/api';
import { getProvinces, getDistricts, getWards } from '../services/locationService';

const CheckoutPage = () => {
  const { items, clear } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Master data for pricing
  const [foodsMap, setFoodsMap] = useState({});
  const [combosMap, setCombosMap] = useState({});
  const [variantsMap, setVariantsMap] = useState({});
  const [optionPricesMap, setOptionPricesMap] = useState({});
  const [crustsMap, setCrustsMap] = useState({});
  const [dataLoading, setDataLoading] = useState(false);
  const [formData, setFormData] = useState({
    hoTen: '',
    soDienThoai: '',
    diaChi: '',
    soNhaDuong: '',
    phuongXa: '',
    quanHuyen: '',
    thanhPho: '',
    ghiChu: '',
    phuongThucThanhToan: 'cod' // default to COD
  });

  const [shipping, setShipping] = useState({ loading: false, data: null, error: null });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [locLoading, setLocLoading] = useState({ p: false, d: false, w: false });
  const ALLOWED_CITY_REGEX = useMemo(() => ({
    HN: /Hà\s*Nội|Ha\s*Noi/i,
    HCM: /Hồ\s*Chí\s*Minh|Ho\s*Chi\s*Minh|HCM/i
  }), []);
  const isAllowedCityName = (name = '') => ALLOWED_CITY_REGEX.HN.test(name) || ALLOWED_CITY_REGEX.HCM.test(name);
  
  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucher, setVoucher] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Fetch master data for pricing
  useEffect(() => {
    if (items.length === 0) return;
    let active = true;
    setDataLoading(true);
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
        console.error('Failed to load pricing data:', err);
      } finally {
        if (active) setDataLoading(false);
      }
    })();
    return () => { active = false; };
  }, [items.length]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Load provinces at mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLocLoading((s) => ({ ...s, p: true }));
        const list = await getProvinces();
        const filtered = Array.isArray(list) ? list.filter(p => isAllowedCityName(p.name)) : [];
        if (!cancelled) setProvinces(filtered);
      } finally {
        if (!cancelled) setLocLoading((s) => ({ ...s, p: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Prefill user data immediately when auth user is available
  useEffect(() => {
    if (!user) return;

    setFormData((prev) => ({
      ...prev,
      hoTen: prev.hoTen || user.hoTen || '',
      soDienThoai: prev.soDienThoai || user.soDienThoai || '',
      soNhaDuong: prev.soNhaDuong || user.soNhaDuong || '',
      thanhPho: prev.thanhPho || user.thanhPho || '',
      quanHuyen: prev.quanHuyen || user.quanHuyen || '',
      phuongXa: prev.phuongXa || user.phuongXa || '',
    }));
  }, [user]);

  // Hydrate district/ward options for the prefetched address after provinces are ready
  useEffect(() => {
    if (!user || provinces.length === 0) return;

    const cityName = user.thanhPho || '';
    const districtName = user.quanHuyen || '';
    if (!cityName) return;

    // Find matching province to load dropdowns
    const matchedProvince = provinces.find(p => p.name === cityName);
    if (!matchedProvince) return;

    let cancelled = false;

    // Load districts for matched province
    (async () => {
      setLocLoading(s => ({ ...s, d: true }));
      try {
        const ds = await getDistricts(matchedProvince.code);
        if (cancelled) return;
        setDistricts(ds);

        if (!districtName) {
          setWards([]);
          return;
        }
        
        // Find matching district
        const matchedDistrict = ds.find(d => d.name === districtName);
        if (!matchedDistrict) {
          setWards([]);
          return;
        }

        // Load wards for matched district
        setLocLoading(s => ({ ...s, w: true }));
        const ws = await getWards(matchedDistrict.code);
        if (cancelled) return;
        setWards(ws);
      } catch (err) {
        console.error('Failed to load location data:', err);
      } finally {
        if (!cancelled) {
          setLocLoading(s => ({ ...s, d: false, w: false }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, provinces]);

  const handleProvinceSelect = async (e) => {
    const code = e.target.value;
    const selected = provinces.find((p) => String(p.code) === String(code));
    setFormData((prev) => ({ ...prev, thanhPho: selected?.name || '', quanHuyen: '', phuongXa: '' }));
    setDistricts([]); setWards([]);
    if (!code) return;
    if (!isAllowedCityName(selected?.name || '')) {
      // Guard: should not happen because we filter UI, but keep safety
      return;
    }
    setLocLoading((s) => ({ ...s, d: true }));
    try {
      const ds = await getDistricts(code);
      setDistricts(ds);
    } finally {
      setLocLoading((s) => ({ ...s, d: false }));
    }
  };

  const handleDistrictSelect = async (e) => {
    const code = e.target.value;
    const selected = districts.find((d) => String(d.code) === String(code));
    setFormData((prev) => ({ ...prev, quanHuyen: selected?.name || '', phuongXa: '' }));
    setWards([]);
    if (!code) return;
    setLocLoading((s) => ({ ...s, w: true }));
    try {
      const ws = await getWards(code);
      setWards(ws);
    } finally {
      setLocLoading((s) => ({ ...s, w: false }));
    }
  };

  const handleWardSelect = (e) => {
    const code = e.target.value;
    const selected = wards.find((w) => String(w.code) === String(code));
    setFormData((prev) => ({ ...prev, phuongXa: selected?.name || '' }));
  };

  // Apply voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Vui lòng nhập mã voucher');
      return;
    }

    setVoucherLoading(true);
    setVoucherError('');
    setVoucherSuccess('');
    
    try {
      const result = await fetchVoucherByCode(voucherCode.trim());

      if (!result || !result.data) {
        throw new Error(result?.message || 'Voucher không tồn tại');
      }

      const voucherData = result.data;

      // Kiểm tra trạng thái
      if (voucherData.TrangThai !== 'Active') {
        throw new Error('Voucher không còn hiệu lực');
      }

      // Kiểm tra thời gian
      const now = new Date();
      const startDate = new Date(voucherData.NgayBatDau);
      const endDate = new Date(voucherData.NgayKetThuc);
      
      if (now < startDate) {
        throw new Error('Voucher chưa đến thời gian áp dụng');
      }
      if (now > endDate) {
        throw new Error('Voucher đã hết hạn');
      }

      // Kiểm tra số lượng
      if (voucherData.usedCount >= voucherData.SoLuong) {
        throw new Error('Voucher đã hết lượt sử dụng');
      }

      // Kiểm tra điều kiện đơn hàng
      const minOrder = Number(voucherData.DieuKienApDung || 0);
      if (subtotal < minOrder) {
        throw new Error(`Đơn hàng tối thiểu ${minOrder.toLocaleString()} đ để áp dụng voucher này`);
      }

      // Áp dụng voucher thành công
      setVoucher(voucherData);
      setVoucherSuccess(`Áp dụng voucher thành công! ${voucherData.MoTa}`);
    } catch (error) {
      setVoucherError(error.message);
      setVoucher(null);
    } finally {
      setVoucherLoading(false);
    }
  };

  // Remove voucher
  const handleRemoveVoucher = () => {
    setVoucher(null);
    setVoucherCode('');
    setVoucherError('');
    setVoucherSuccess('');
  };

  // Debounce shipping quote when all fields are available
  useEffect(() => {
    const { soNhaDuong, phuongXa, quanHuyen, thanhPho } = formData;
    const ready = soNhaDuong && phuongXa && quanHuyen && thanhPho;
    if (!ready) {
      setShipping((prev) => ({ ...prev, data: null, error: null }));
      return;
    }
    if (!isAllowedCityName(thanhPho)) {
      setShipping({ loading: false, data: null, error: 'Chúng tôi chỉ giao hàng tại TP. Hồ Chí Minh và Hà Nội' });
      return;
    }
    setShipping((prev) => ({ ...prev, loading: true, error: null }));
    let ignore = false;
    const t = setTimeout(async () => {
      try {
        const quote = await getShippingQuote({ soNhaDuong, phuongXa, quanHuyen, thanhPho });
        if (ignore) return;
        setShipping({ loading: false, data: quote, error: null });
      } catch (err) {
        if (ignore) return;
        setShipping({ loading: false, data: null, error: err.message || 'Không tính được phí giao hàng' });
      }
    }, 500);
    return () => {
      ignore = true;
      clearTimeout(t);
    };
  }, [formData.soNhaDuong, formData.phuongXa, formData.quanHuyen, formData.thanhPho]);

  // Enrich cart items with pricing data
  const enrichedItems = useMemo(() => {
    return items.map(item => {
      if (item.loai === 'CB') {
        const combo = combosMap[item.comboId];
        if (!combo) return { ...item, displayName: `Combo #${item.comboId}`, displayPrice: 0, displayTotal: 0 };
        const price = Number(combo.GiaCombo || 0);
        return { ...item, displayName: combo.TenCombo, displayPrice: price, displayTotal: price * item.soLuong };
      }
      const food = foodsMap[item.monAnId];
      if (!food) return { ...item, displayName: `Món #${item.monAnId}`, displayPrice: 0, displayTotal: 0 };
      const variant = item.bienTheId ? variantsMap[item.bienTheId] : null;
      const basePrice = variant ? Number(variant.GiaBan || 0) : 0;
      const sizeId = variant?.Size?.MaSize;
      const sizeName = variant?.Size?.TenSize || '';
      const crust = item.deBanhId ? crustsMap[item.deBanhId] : null;
      const crustName = crust?.TenDeBanh || '';
      let optionsExtra = 0;
      const optionNames = [];
      if (Array.isArray(item.tuyChonThem) && item.tuyChonThem.length > 0 && sizeId) {
        item.tuyChonThem.forEach(optId => {
          const key = `${optId}_${sizeId}`;
          const optionPrice = optionPricesMap[key];
          if (optionPrice && optionPrice.TuyChon) {
            const extra = Number(optionPrice.GiaThem || 0);
            optionsExtra += extra;
            optionNames.push(optionPrice.TuyChon.TenTuyChon);
          }
        });
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
      if (sizeName) segments.push(sizeName);
      if (crustName) segments.push(crustName);
      if (optionNames.length > 0) segments.push(optionNames.join(', '));
      const detailLine = segments.join(' • ');
      const rawImg = food.HinhAnh;
      const imgPath = rawImg ? (String(rawImg).startsWith('/') ? String(rawImg) : `/images/AnhMonAn/${rawImg}`) : null;
      const displayImage = imgPath ? assetUrl(imgPath) : '/placeholder.svg';
      return { 
        ...item, 
        displayName: food.TenMonAn, 
        displayImage, 
        displayPrice: discountedUnitPrice,
        originalPrice: unitPrice,
        displayTotal: total,
        originalTotal: originalTotal,
        displayDetails: detailLine,
        promotion: promotion,
        hasDiscount: hasDiscount
      };
    });
  }, [items, foodsMap, combosMap, variantsMap, optionPricesMap, crustsMap]);

  const subtotal = useMemo(() => enrichedItems.reduce((sum, item) => sum + (item.displayTotal || 0), 0), [enrichedItems]);
  
  const totalPromotionDiscount = useMemo(() => {
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

  // Calculate voucher discount
  const discount = useMemo(() => {
    if (!voucher) return 0;
    
    if (voucher.LoaiGiamGia === 'PERCENT') {
      const percentValue = Number(voucher.GiaTri || 0);
      return Math.floor((subtotal * percentValue) / 100);
    } else if (voucher.LoaiGiamGia === 'AMOUNT') {
      return Number(voucher.GiaTri || 0);
    }
    return 0;
  }, [voucher, subtotal]);

  const shippingFee = useMemo(() => (shipping?.data?.canShip ? Number(shipping.data.fee || 0) : 0), [shipping]);
  const total = useMemo(() => {
    const afterDiscount = Math.max(0, Number(subtotal) - discount);
    return afterDiscount + shippingFee;
  }, [subtotal, shippingFee, discount]);

  const isAddressReady = useMemo(() => {
    return Boolean(
      formData.soNhaDuong &&
      formData.phuongXa &&
      formData.quanHuyen &&
      formData.thanhPho
    );
  }, [formData.soNhaDuong, formData.phuongXa, formData.quanHuyen, formData.thanhPho]);

  const canSubmitOrder = useMemo(() => {
    return (
      !submitLoading &&
      !dataLoading &&
      items.length > 0 &&
      isAddressReady &&
      !shipping.loading &&
      shipping?.data?.canShip === true
    );
  }, [submitLoading, dataLoading, items.length, isAddressReady, shipping.loading, shipping?.data?.canShip]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      if (items.length === 0) {
        throw new Error('Giỏ hàng trống');
      }

      if (!isAddressReady) {
        throw new Error('Vui lòng nhập đầy đủ địa chỉ giao hàng');
      }

      const shippingAddress = {
        soNhaDuong: formData.soNhaDuong,
        phuongXa: formData.phuongXa,
        quanHuyen: formData.quanHuyen,
        thanhPho: formData.thanhPho,
      };

      const existingQuote = shipping?.data;
      if (!existingQuote?.canShip) {
        throw new Error(existingQuote?.message || 'Không thể giao tới địa chỉ này');
      }
      const freshShippingFee = Number(existingQuote.fee || 0);
      const calculatedTotal = Math.max(0, Number(subtotal) - discount) + freshShippingFee;

      // Send Vietnamese labels for payment method to backend as requested
      const paymentMethod = formData.phuongThucThanhToan === 'bank' ? 'Chuyển Khoản' : 'Tiền Mặt';
      
      // Build items with correct format
      const formattedItems = items.map((it) => {
        if (it.loai === 'CB') {
          return {
            loai: 'CB',
            maCombo: it.comboId,
            soLuong: Number(it.soLuong || 1)
          };
        }
        // Product (SP)
        return {
          loai: 'SP',
          maBienThe: it.bienTheId ?? null,
          maDeBanh: it.deBanhId ?? null,
          soLuong: Number(it.soLuong || 1),
          tuyChon: Array.isArray(it.tuyChonThem) ? it.tuyChonThem.map(id => ({ maTuyChon: Number(id) })) : []
        };
      });

      const payload = {
        maNguoiDung: isAuthenticated && user?.maNguoiDung ? user.maNguoiDung : null,
        soNhaDuong: formData.soNhaDuong || '',
        phuongXa: formData.phuongXa || '',
        quanHuyen: formData.quanHuyen || '',
        thanhPho: formData.thanhPho || '',
        tenNguoiNhan: formData.hoTen || '',
        soDienThoaiGiaoHang: formData.soDienThoai || '',
        maVoucher: voucher?.code || null,
        tienTruocGiamGia: Number(subtotal) || 0,
        tienGiamGia: Number(discount) || 0,
        phiShip: freshShippingFee,
        tongTien: calculatedTotal,
        ghiChu: formData.ghiChu || '',
        items: formattedItems,
        payment: { phuongThuc: paymentMethod }
      };
      // Log payload for debugging: object + pretty JSON
      console.log('Submitting order payload:', payload);
      try {
        console.log('Submitting order payload (json):', JSON.stringify(payload, null, 2));
      } catch (err) {
        // If payload contains circular refs, fallback to object log
        console.log('Could not stringify payload for pretty print, payload logged as object above.');
      }

      const res = await api.post('/api/orders', payload);
      const data = res.data;
      const ok = res.status >= 200 && res.status < 300;
      const payloadData = (data && typeof data === 'object' && data.data && typeof data.data === 'object') ? data.data : data;
      if (ok && payloadData) {
        const paymentUrl = payloadData.paymentUrl || payloadData.payment?.url;
        if (paymentUrl) {
          clear();
          window.location.assign(paymentUrl);
          return;
        }
        setSubmitSuccess(payloadData.message || data.message || 'Tạo đơn hàng thành công');
        clear();
        try {
          navigate('/order-success', { state: { order: payloadData } });
        } catch (_) {
          window.location.assign('/order-success');
        }
        return;
      }
      setSubmitError(data?.message || 'Tạo đơn hàng thất bại');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Tạo đơn hàng thất bại';
      setSubmitError(msg);
      
      // Check for stale cart errors (price changed, item deleted, invalid options/crust)
      const isStaleCart = typeof msg === 'string' && (
        msg.includes('Dữ liệu giỏ hàng đã thay đổi') || 
        msg.includes('cập nhật giỏ hàng') || 
        msg.includes('thêm lại sản phẩm')
      );

      if (isStaleCart) {
        clear();
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <section className="py-4">
      <Container>
        <h2 className="mb-3">Thanh toán</h2>
        
        {!isAuthenticated && (
          <Alert variant="info" className="mb-4">
            💡 Bạn có thể <Alert.Link href="/login">đăng nhập</Alert.Link> để lưu thông tin và theo dõi đơn hàng dễ dàng hơn.
          </Alert>
        )}

        <Row>
          <Col md={7} className="mb-4">
            <Card className="p-3">
              <Form onSubmit={handleSubmit}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Họ tên</Form.Label>
                      <Form.Control 
                        name="hoTen"
                        value={formData.hoTen}
                        onChange={handleChange}
                        required 
                        placeholder="Nhập họ tên của bạn" 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Số điện thoại</Form.Label>
                      <Form.Control 
                        name="soDienThoai"
                        value={formData.soDienThoai}
                        onChange={handleChange}
                        required 
                        placeholder="Nhập số điện thoại" 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12} className="pt-2">
                    <Row className="g-3">
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label>Số nhà, đường</Form.Label>
                          <Form.Control
                            name="soNhaDuong"
                            value={formData.soNhaDuong}
                            onChange={handleChange}
                            placeholder="Nhập số nhà, tên đường"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Thành phố</Form.Label>
                          <Form.Select
                            aria-label="Chọn tỉnh/thành"
                            onChange={handleProvinceSelect}
                            value={provinces.find(p => p.name === formData.thanhPho)?.code || ''}
                          >
                            <option value="" disabled>Chọn tỉnh/thành</option>
                            {provinces.map((p) => (
                              <option key={p.code} value={p.code}>{p.name}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Quận/Huyện</Form.Label>
                          <Form.Select aria-label="Chọn quận/huyện" onChange={handleDistrictSelect} value={districts.find((d) => d.name === formData.quanHuyen)?.code || ''} disabled={!formData.thanhPho || locLoading.d}>
                            <option value="" disabled>{locLoading.d ? 'Đang tải...' : 'Chọn quận/huyện'}</option>
                            {districts.map((d) => (
                              <option key={d.code} value={d.code}>{d.name}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Phường/Xã</Form.Label>
                          <Form.Select aria-label="Chọn phường/xã" onChange={handleWardSelect} value={wards.find((w) => w.name === formData.phuongXa)?.code || ''} disabled={!formData.quanHuyen || locLoading.w}>
                            <option value="" disabled>{locLoading.w ? 'Đang tải...' : 'Chọn phường/xã'}</option>
                            {wards.map((w) => (
                              <option key={w.code} value={w.code}>{w.name}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="small text-muted mt-2">
                      Hệ thống sẽ tự động ước tính phí giao hàng khi bạn nhập số nhà, đường và chọn đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã. Hiện tại chỉ hỗ trợ giao tại <strong>TP. Hồ Chí Minh</strong> và <strong>Hà Nội</strong>.
                    </div>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>Ghi chú</Form.Label>
                      <Form.Control 
                        name="ghiChu"
                        value={formData.ghiChu}
                        onChange={handleChange}
                        as="textarea" 
                        rows={3} 
                        placeholder="Ví dụ: gọi trước khi giao" 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="fw-bold">Phương thức thanh toán</Form.Label>
                      <div className="mt-2">
                        <Form.Check
                          type="radio"
                          id="payment-cod"
                          name="phuongThucThanhToan"
                          value="cod"
                          label={
                            <div className="d-flex align-items-center">
                              <span className="me-2">💵</span>
                              <div>
                                <div className="fw-semibold">Tiền Mặt</div>
                                <small className="text-muted">Thanh toán khi nhận hàng</small>
                              </div>
                            </div>
                          }
                          checked={formData.phuongThucThanhToan === 'cod'}
                          onChange={handleChange}
                          className="mb-2"
                        />
                        <Form.Check
                          type="radio"
                          id="payment-bank"
                          name="phuongThucThanhToan"
                          value="bank"
                          label={
                            <div className="d-flex align-items-center">
                              <span className="me-2">🏦</span>
                              <div>
                                <div className="fw-semibold">Chuyển Khoản</div>
                                <small className="text-muted">Chuyển Khoản ngân hàng</small>
                              </div>
                            </div>
                          }
                          checked={formData.phuongThucThanhToan === 'bank'}
                          onChange={handleChange}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
                <div className="mt-3 d-flex justify-content-end">
                  <Button type="submit" variant="danger" disabled={!canSubmitOrder}>
                    {submitLoading ? 'Đang tạo đơn…' : 'Đặt hàng'}
                  </Button>
                </div>
                {!canSubmitOrder && (
                  <div className="small text-muted mt-2 text-end">
                    {!isAddressReady
                      ? 'Vui lòng nhập đầy đủ địa chỉ để tính phí giao hàng trước khi đặt.'
                      : shipping.loading
                        ? 'Đang tính phí giao hàng...'
                        : shipping?.data?.canShip === false
                          ? 'Địa chỉ hiện không hỗ trợ giao hàng.'
                          : dataLoading
                            ? 'Đang tải dữ liệu giỏ hàng...'
                            : items.length === 0
                              ? 'Giỏ hàng trống.'
                              : ''}
                  </div>
                )}
              </Form>
            </Card>
          </Col>
          <Col md={5}>
            <Card className="p-3">
              <h5>Tóm tắt đơn hàng</h5>
              {submitError && (
                <Alert variant="danger" className="py-2 px-3 small mt-2">{submitError}</Alert>
              )}
              {submitSuccess && (
                <Alert variant="success" className="py-2 px-3 small mt-2">{submitSuccess}</Alert>
              )}
              {dataLoading && (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" /> Đang tải thông tin giỏ hàng...
                </div>
              )}
              <ul className="list-unstyled small mt-3 mb-0">
                {enrichedItems.map(i => {
                  const isCombo = i.loai === 'CB';
                  return (
                    <li key={i.key} className="border-bottom py-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="fw-semibold">
                            {isCombo && <span className="badge bg-danger me-1">COMBO</span>}
                            {i.displayName}
                            {i.displayDetails && ` (${i.displayDetails})`} x {i.soLuong}
                          </div>
                          {i.hasDiscount && i.promotion && (
                            <div className="mt-1">
                              <span 
                                className="badge" 
                                style={{
                                  background: 'linear-gradient(135deg, #ff4d4f 0%, #ff6b6b 100%)',
                                  color: '#fff',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '9999px',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  border: '1px solid rgba(255, 255, 255, 0.4)'
                                }}
                              >
                                {(i.promotion.KMLoai?.toUpperCase() === 'PERCENT' || i.promotion.KMLoai?.toUpperCase() === 'PHANTRAM') ? (
                                  <>-{i.promotion.KMGiaTri}%</>
                                ) : (
                                  <>-{Number(i.promotion.KMGiaTri).toLocaleString()}<span style={{fontSize: '0.7em'}}>đ</span></>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-end ms-2">
                          {i.hasDiscount && i.originalTotal ? (
                            <div>
                              <div style={{ 
                                color: '#94a3b8', 
                                fontSize: '0.75rem', 
                                textDecoration: 'line-through',
                                fontWeight: 400
                              }}>
                                {i.originalTotal.toLocaleString()} đ
                              </div>
                              <div className="text-danger fw-semibold">
                                {i.displayTotal.toLocaleString()} đ
                              </div>
                            </div>
                          ) : (
                            <span>{i.displayTotal.toLocaleString()} đ</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Voucher section */}
              <div className="mt-3 border-top pt-3">
                <Form.Label className="fw-semibold">Mã giảm giá</Form.Label>
                <div className="d-flex gap-2 mb-2">
                  <Form.Control
                    type="text"
                    placeholder="Nhập mã voucher"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    disabled={!!voucher || voucherLoading}
                  />
                  {voucher ? (
                    <Button 
                      variant="outline-danger" 
                      onClick={handleRemoveVoucher}
                    >
                      Hủy
                    </Button>
                  ) : (
                    <Button 
                      variant="outline-primary" 
                      onClick={handleApplyVoucher}
                      disabled={voucherLoading}
                    >
                      {voucherLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
                    </Button>
                  )}
                </div>
                {voucherError && (
                  <Alert variant="danger" className="py-2 px-3 small mb-0">
                    {voucherError}
                  </Alert>
                )}
                {voucherSuccess && (
                  <Alert variant="success" className="py-2 px-3 small mb-0">
                    ✓ {voucherSuccess}
                  </Alert>
                )}
              </div>

              {/* Shipping quote info is shown below voucher in the summary */}

              {totalPromotionDiscount > 0 && (
                <>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <span className="text-muted">Tổng tiền hàng</span>
                    <span className="text-muted" style={{ textDecoration: 'line-through' }}>
                      {originalSubtotal.toLocaleString()} đ
                    </span>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <span className="text-success fw-semibold">
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                      </svg>
                      Khuyến mãi sản phẩm
                    </span>
                    <span className="text-success fw-semibold">
                      -{totalPromotionDiscount.toLocaleString()} đ
                    </span>
                  </div>
                </>
              )}
              
              <div className="d-flex justify-content-between align-items-center mt-3">
                <span>Tạm tính</span>
                <strong>{subtotal.toLocaleString()} đ</strong>
              </div>
              
              {discount > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-2 text-success">
                  <span>Giảm giá voucher ({voucher?.code})</span>
                  <strong>-{discount.toLocaleString()} đ</strong>
                </div>
              )}

              {/* Shipping quote info (moved below voucher) */}
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span>Phí giao hàng</span>
                  {shipping.loading ? (
                    <span className="text-muted">Đang tính…</span>
                  ) : shipping.error ? (
                    <span className="text-danger">{shipping.error}</span>
                  ) : shipping.data ? (
                    shipping.data.canShip ? (
                      <strong>{Number(shipping.data.fee).toLocaleString()} đ</strong>
                    ) : (
                      <span className="text-danger">Không hỗ trợ giao ({shipping.data.message || 'ngoài phạm vi'})</span>
                    )
                  ) : (
                    <span className="text-muted">Nhập địa chỉ để tính phí</span>
                  )}
                </div>
                {shipping?.data?.canShip && (
                  <div className="small text-muted">
                    Khoảng cách ~ {Number(shipping.data.distanceKm).toFixed(2)} km • Dự kiến {shipping.data.etaMinutes} phút
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2 border-top pt-2">
                <span className="fw-bold">Tổng thanh toán</span>
                <strong className="text-danger fs-5">{total.toLocaleString()} đ</strong>
              </div>
              
              {(totalPromotionDiscount > 0 || discount > 0) && (
                <div className="alert alert-success py-2 px-3 mt-3 mb-0" style={{ fontSize: '0.85rem' }}>
                  <strong>🎉 Bạn đã tiết kiệm {(totalPromotionDiscount + discount).toLocaleString()} đ</strong>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default CheckoutPage;
