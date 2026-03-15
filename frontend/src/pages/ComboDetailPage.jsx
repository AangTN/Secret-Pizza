import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Spinner, Button } from 'react-bootstrap';
import { fetchComboById, assetUrl } from '../services/api';
import { useCart } from '../contexts/CartContext';

const ComboDetailPage = () => {
  const { id } = useParams();
  const { add } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [combo, setCombo] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError('');
        const data = await fetchComboById(id);
        if (mounted) setCombo(data);
      } catch (e) {
        if (mounted) setError('Không tải được dữ liệu combo.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const image = combo?.HinhAnh ? assetUrl(String(combo.HinhAnh).startsWith('/') ? combo.HinhAnh : `/images/AnhCombo/${combo.HinhAnh}`) : '/placeholder.svg';
  const totalPrice = Number(combo?.GiaCombo || 0);
  const sumRetail = Array.isArray(combo?.Items) ? combo.Items.reduce((sum, it) => sum + Number(it?.BienTheMonAn?.GiaBan || 0) * Number(it?.SoLuong || 1), 0) : 0;
  const saving = Math.max(0, sumRetail - totalPrice);

  const handleAddCombo = () => {
    if (!combo) return;
    setAdding(true);
    setAddedMsg('');
    try {
      const cartEntry = {
        loai: 'CB',
        comboId: combo.MaCombo,
        soLuong: 1
      };
      add(cartEntry);
      setAddedMsg('Đã thêm combo vào giỏ hàng.');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <section className="py-5 text-center"><Spinner animation="border" variant="danger" /></section>;
  }

  if (error || !combo) {
    return <section className="py-5 text-center"><h4 className="text-danger">{error || 'Không tìm thấy combo.'}</h4></section>;
  }

  return (
    <section className="py-4">
      <Container>
        <nav className="mb-3 small" aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{combo.TenCombo}</li>
          </ol>
        </nav>
        <Row className="g-4">
          <Col md={5}>
            <Card className="shadow-sm">
              <div className="ratio ratio-1x1"><img src={image} alt={combo.TenCombo} style={{ objectFit: 'cover', width: '100%', height: '100%' }} /></div>
            </Card>
          </Col>
          <Col md={7}>
            <h1 className="fw-bold mb-3">{combo.TenCombo}</h1>
            {combo.MoTa && <p className="text-muted" style={{ lineHeight: 1.7 }}>{combo.MoTa}</p>}
            <div className="d-flex align-items-center gap-3 my-3">
              <div>
                <div className="fs-3 fw-bold text-danger">{totalPrice.toLocaleString()} đ</div>
                {saving > 0 && (
                  <div className="small text-success">Tiết kiệm {saving.toLocaleString()} đ so với mua lẻ ({sumRetail.toLocaleString()} đ)</div>
                )}
              </div>
              <Button 
                variant="danger" 
                size="lg"
                className="px-5 py-2 fw-bold shadow"
                style={{ borderRadius: '50px', textTransform: 'uppercase', letterSpacing: '1px' }}
                disabled={adding} 
                onClick={handleAddCombo}
              >
                {adding ? 'Đang xử lý...' : 'ĐẶT NGAY'}
              </Button>
            </div>
            {addedMsg && <div className="alert alert-success py-2 small">{addedMsg}</div>}
            <h5 className="mt-4 mb-2 fw-semibold">Bao gồm trong combo:</h5>
            <Row className="g-3">
              {combo.Items.map(item => {
                const variant = item.BienTheMonAn;
                const food = variant?.MonAn;
                if (!variant || !food) return null;
                const rawImg = food?.HinhAnh;
                const imagePath = rawImg ? (String(rawImg).startsWith('/') ? String(rawImg) : `/images/AnhMonAn/${rawImg}`) : null;
                const sizeName = variant?.Size?.TenSize;
                const isPizza = food?.LoaiMonAn?.TenLoaiMonAn?.toLowerCase() === 'pizza';

                return (
                  <Col md={6} key={item.MaBienThe + '-' + (item.MaDeBanh ?? 'null')}>
                    <Card className="border-0 border-start border-4 border-danger-subtle shadow-sm h-100">
                      <Card.Body className="py-2">
                        <div className="d-flex align-items-center gap-3 h-100">
                          <div style={{ width:64, height:64 }} className="rounded overflow-hidden bg-light flex-shrink-0">
                            {imagePath ? <img src={assetUrl(imagePath)} alt={food.TenMonAn} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div className="small text-muted">No image</div>}
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{food.TenMonAn}</div>
                            <div className="text-muted small">
                              {isPizza && <span>Size: {sizeName}</span>}
                              {item?.DeBanh?.TenDeBanh && (
                                <span>{isPizza ? ' • ' : ''}Đế: {item.DeBanh.TenDeBanh}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-danger fw-semibold small">x {item.SoLuong}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default ComboDetailPage;
