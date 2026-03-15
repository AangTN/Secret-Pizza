import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Alert, Card, Toast, ToastContainer } from 'react-bootstrap';
import { getProvinces, getDistricts, getWards } from '../services/locationService';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const initialState = {
  hoTen: '',
  soDienThoai: '',
  soNhaDuong: '',
  phuongXa: '',
  quanHuyen: '',
  thanhPho: ''
};

const ProfileEditPage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState(initialState);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState({ p: false, d: false, w: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const ALLOWED_CITY_REGEX = useMemo(() => ({
    HN: /Hà\s*Nội|Ha\s*Noi/i,
    HCM: /Hồ\s*Chí\s*Minh|Ho\s*Chi\s*Minh|HCM/i
  }), []);
  const isAllowedCityName = (name = '') => ALLOWED_CITY_REGEX.HN.test(name) || ALLOWED_CITY_REGEX.HCM.test(name);

  // Load provinces
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(s => ({ ...s, p: true }));
      try {
        const list = await getProvinces();
        const filtered = Array.isArray(list) ? list.filter(p => isAllowedCityName(p.name)) : [];
        if (!cancelled) setProvinces(filtered);
      } finally {
        if (!cancelled) setLoading(s => ({ ...s, p: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Prefill user data after provinces loaded
  useEffect(() => {
    if (!user || provinces.length === 0) return;
    
    // Fill basic info first
    setForm(f => ({
      ...f,
      hoTen: user.hoTen || '',
      soDienThoai: user.soDienThoai || '',
      soNhaDuong: user.soNhaDuong || ''
    }));

    // Find matching province
    const matchedProvince = provinces.find(p => p.name === user.thanhPho);
    if (!matchedProvince) return;

    setForm(f => ({ ...f, thanhPho: matchedProvince.name }));

    // Load districts for matched province
    (async () => {
      setLoading(s => ({ ...s, d: true }));
      try {
        const ds = await getDistricts(matchedProvince.code);
        setDistricts(ds);
        
        // Find matching district
        const matchedDistrict = ds.find(d => d.name === user.quanHuyen);
        if (!matchedDistrict) return;

        setForm(f => ({ ...f, quanHuyen: matchedDistrict.name }));

        // Load wards for matched district
        setLoading(s => ({ ...s, w: true }));
        const ws = await getWards(matchedDistrict.code);
        setWards(ws);

        // Find matching ward
        const matchedWard = ws.find(w => w.name === user.phuongXa);
        if (matchedWard) {
          setForm(f => ({ ...f, phuongXa: matchedWard.name }));
        }
      } catch (err) {
        console.error('Failed to load location data:', err);
      } finally {
        setLoading(s => ({ ...s, d: false, w: false }));
      }
    })();
  }, [user, provinces]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProvince = async (e) => {
    const code = e.target.value;
    const province = provinces.find(p => p.code === code);
    setForm(prev => ({ ...prev, thanhPho: province?.name || '', quanHuyen: '', phuongXa: '' }));
    setDistricts([]); setWards([]);
    if (!code) return;
    if (!isAllowedCityName(province?.name || '')) {
      return;
    }
    setLoading(s => ({ ...s, d: true }));
    try {
      const ds = await getDistricts(code);
      setDistricts(ds);
    } finally {
      setLoading(s => ({ ...s, d: false }));
    }
  };

  const handleDistrict = async (e) => {
    const code = e.target.value;
    const district = districts.find(d => d.code === code);
    setForm(prev => ({ ...prev, quanHuyen: district?.name || '', phuongXa: '' }));
    setWards([]);
    if (!code) return;
    setLoading(s => ({ ...s, w: true }));
    try {
      const ws = await getWards(code);
      setWards(ws);
    } finally {
      setLoading(s => ({ ...s, w: false }));
    }
  };

  const handleWard = (e) => {
    const code = e.target.value;
    const ward = wards.find(w => w.code === code);
    setForm(prev => ({ ...prev, phuongXa: ward?.name || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.maNguoiDung) {
      setError('Không tìm thấy thông tin người dùng');
      return;
    }

    // Prepare payload for backend
    const payload = {
      MaNguoiDung: user.maNguoiDung,
      HoTen: form.hoTen.trim(),
      SoDienThoai: form.soDienThoai.trim() || null,
      SoNhaDuong: form.soNhaDuong.trim() || null,
      PhuongXa: form.phuongXa || null,
      QuanHuyen: form.quanHuyen || null,
      ThanhPho: form.thanhPho || null
    };

    // Log the JSON payload for debugging
    console.log('Profile update payload (JSON):', JSON.stringify(payload, null, 2));

    setSubmitting(true);
    setError('');

    try {
      const res = await api.put('/api/users', payload);
      
      console.log('Profile update response:', JSON.stringify(res.data, null, 2));
      
      // Update user in AuthContext with new data
      if (res.data?.user) {
        updateUser(res.data.user);
      } else {
        // If backend doesn't return updated user, merge form data with current user
        updateUser({
          ...user,
          hoTen: form.hoTen.trim(),
          soDienThoai: form.soDienThoai.trim() || user.soDienThoai,
          soNhaDuong: form.soNhaDuong.trim() || user.soNhaDuong,
          phuongXa: form.phuongXa || user.phuongXa,
          quanHuyen: form.quanHuyen || user.quanHuyen,
          thanhPho: form.thanhPho || user.thanhPho
        });
      }
      
      // Show success notification
      setShowSuccessToast(true);
      
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err.message || 'Không thể cập nhật thông tin';
      setError(errorMessage);
      console.error('Profile update error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-5">
      {/* Success Toast Notification */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
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
            Thông tin cá nhân đã được cập nhật!
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <Container>
        <Row className="justify-content-center">
          <Col lg={8}>
            <h1 className="mb-4" style={{ fontWeight: 800 }}>Chỉnh sửa thông tin cá nhân</h1>
            
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
                {error}
              </Alert>
            )}

            <Card className="shadow-sm border-0">
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="hoTen">
                    <Form.Label>Họ và Tên *</Form.Label>
                    <Form.Control
                      name="hoTen"
                      required
                      value={form.hoTen}
                      onChange={onChange}
                      placeholder="Nhập họ tên"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="soDienThoai">
                    <Form.Label>Số điện thoại</Form.Label>
                    <Form.Control
                      name="soDienThoai"
                      value={form.soDienThoai}
                      onChange={onChange}
                      placeholder="Ví dụ: 0901234567"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="soNhaDuong">
                    <Form.Label>Số nhà / Đường</Form.Label>
                    <Form.Control
                      name="soNhaDuong"
                      value={form.soNhaDuong}
                      onChange={onChange}
                      placeholder="VD: 123 Nguyễn Trãi"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Thành phố / Tỉnh (chỉ TP.HCM, Hà Nội)</Form.Label>
                    <Form.Select onChange={handleProvince} value={provinces.find(p=>p.name===form.thanhPho)?.code || ''}>
                      <option value="">-- Chọn tỉnh --</option>
                      {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </Form.Select>
                    {loading.p && <small className="text-muted">Đang tải tỉnh...</small>}
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Quận / Huyện</Form.Label>
                    <Form.Select onChange={handleDistrict} value={districts.find(d=>d.name===form.quanHuyen)?.code || ''} disabled={!form.thanhPho}>
                      <option value="">-- Chọn huyện --</option>
                      {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                    </Form.Select>
                    {loading.d && <small className="text-muted">Đang tải huyện...</small>}
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Phường / Xã</Form.Label>
                    <Form.Select onChange={handleWard} value={wards.find(w=>w.name===form.phuongXa)?.code || ''} disabled={!form.quanHuyen}>
                      <option value="">-- Chọn phường --</option>
                      {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                    </Form.Select>
                    {loading.w && <small className="text-muted">Đang tải phường...</small>}
                  </Form.Group>
                  <div className="d-flex justify-content-end mt-3">
                    <Button type="submit" variant="danger" size="lg" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Đang lưu...
                        </>
                      ) : (
                        'Lưu thay đổi'
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default ProfileEditPage;
