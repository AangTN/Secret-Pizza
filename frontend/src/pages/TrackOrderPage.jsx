import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { subscribeOrderChanges, subscribeOrderChangesByPhone } from '../services/orderRealtime';
import OrderDetail from '../components/ui/OrderDetail';

function normalizePhoneNumber(phone) {
  return String(phone || '').replace(/[^\d+]/g, '').trim();
}

const TrackOrderPage = () => {
  const { isAuthenticated, user } = useAuth();
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [trackedPhone, setTrackedPhone] = useState('');

  // User order list
  const [orders, setOrders] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Modal detail
  const [selectedId, setSelectedId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Rating modal
  const [showRating, setShowRating] = useState(false);
  const [ratingOrderId, setRatingOrderId] = useState(null);
  const [ratingStar, setRatingStar] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const formatVnd = (n) => Number(n || 0).toLocaleString() + ' đ';

  // timeline is handled inside OrderDetail component

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isAuthenticated || !user?.maNguoiDung) {
        setOrders([]);
        setListError('');
        setTrackedPhone('');
        return;
      }
      setListLoading(true);
      setListError('');
      try {
        const res = await api.get(`/api/orders/user/${user.maNguoiDung}`);
        const data = res.data?.data;
        if (!active) return;
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        setListError(err?.response?.data?.message || err.message || 'Không tải được danh sách đơn hàng');
      } finally {
        if (active) setListLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isAuthenticated, user?.maNguoiDung]);

  useEffect(() => {
    if (!isAuthenticated || !user?.maTaiKhoan || !user?.maNguoiDung) {
      return undefined;
    }

    return subscribeOrderChanges(
      {
        maTaiKhoan: user.maTaiKhoan,
        maNguoiDung: user.maNguoiDung,
        maCoSo: user.maCoSo,
        role: user.role,
      },
      (payload) => {
        const incomingOrder = payload?.order;
        if (!incomingOrder?.MaDonHang) {
          return;
        }

        setOrders((prev) => {
          const current = Array.isArray(prev) ? prev : [];
          const index = current.findIndex(
            (order) => Number(order?.MaDonHang) === Number(incomingOrder.MaDonHang)
          );

          if (index >= 0) {
            const next = [...current];
            next[index] = incomingOrder;
            return next;
          }

          if (Number(incomingOrder?.MaNguoiDung) !== Number(user.maNguoiDung)) {
            return current;
          }

          return [incomingOrder, ...current];
        });
      }
    );
  }, [isAuthenticated, user?.maTaiKhoan, user?.maNguoiDung, user?.maCoSo, user?.role]);

  useEffect(() => {
    if (isAuthenticated || !trackedPhone) {
      return undefined;
    }

    return subscribeOrderChangesByPhone(trackedPhone, (payload) => {
      const incomingOrder = payload?.order;
      if (!incomingOrder?.MaDonHang) {
        return;
      }

      const incomingPhone = normalizePhoneNumber(
        incomingOrder?.SoDienThoaiGiaoHang || incomingOrder?.SoDienThoai
      );
      if (incomingPhone !== normalizePhoneNumber(trackedPhone)) {
        return;
      }

      setResult((prev) => {
        const currentOrders = Array.isArray(prev?.orders) ? prev.orders : [];
        const index = currentOrders.findIndex(
          (order) => Number(order?.MaDonHang) === Number(incomingOrder.MaDonHang)
        );

        let nextOrders = currentOrders;
        if (index >= 0) {
          nextOrders = [...currentOrders];
          nextOrders[index] = incomingOrder;
        } else {
          nextOrders = [incomingOrder, ...currentOrders];
        }

        return {
          ...(prev || {}),
          loading: false,
          error: null,
          orders: nextOrders,
        };
      });
    });
  }, [isAuthenticated, trackedPhone]);

  const getLastStatus = (o) => {
    if (!o || !Array.isArray(o.LichSuTrangThaiDonHang) || o.LichSuTrangThaiDonHang.length === 0) return null;
    try {
      const sorted = [...o.LichSuTrangThaiDonHang].sort((a, b) => new Date(a.ThoiGianCapNhat) - new Date(b.ThoiGianCapNhat));
      return sorted[sorted.length - 1].TrangThai;
    } catch (e) {
      return o.LichSuTrangThaiDonHang[o.LichSuTrangThaiDonHang.length - 1].TrangThai;
    }
  };

  const getPaymentStatus = (o) => {
    // ThanhToan có thể là null, object, hoặc array
    // If order object missing -> consider unpaid
    if (!o) return 'Chưa thanh toán';
    // If ThanhToan is missing or null -> unpaid
    if (!o.ThanhToan) return 'Chưa thanh toán';
    // If ThanhToan is an array
    if (Array.isArray(o.ThanhToan)) {
      if (o.ThanhToan.length === 0) return 'Chưa thanh toán';
      // Sắp xếp theo thời gian, lấy cái mới nhất
      const sorted = [...o.ThanhToan].sort((a, b) => new Date(a.ThoiGianGiaoDich || a.ThoiGian || 0) - new Date(b.ThoiGianGiaoDich || b.ThoiGian || 0));
      return sorted[sorted.length - 1].TrangThai || 'Chưa thanh toán';
    }
    // If ThanhToan is an object
    if (o.ThanhToan && o.ThanhToan.TrangThai) {
      return o.ThanhToan.TrangThai;
    }
    return 'Chưa thanh toán';
  };

  const handlePayment = async (orderId, e) => {
    e.stopPropagation(); // Prevent opening detail modal
    try {
      console.log('Creating payment URL for orderId:', orderId);
      const res = await api.post('/api/payment/create-payment-url', { orderId });
      console.log('Payment URL response:', res.data);
      const paymentUrl = res.data?.data?.paymentUrl || res.data?.paymentUrl;
      if (paymentUrl) {
        console.log('Redirecting to:', paymentUrl);
        window.location.href = paymentUrl;
      } else {
        console.log('No paymentUrl in response. Full data:', res.data);
        alert('Không thể tạo link thanh toán');
      }
    } catch (err) {
      console.error('Payment URL creation failed:', err);
      console.error('Error response:', err?.response?.data);
      alert(err?.response?.data?.message || err.message || 'Lỗi khi tạo link thanh toán');
    }
  };

  const openRating = (orderId, e) => {
    e.stopPropagation();
    setRatingOrderId(orderId);
    setRatingStar(5);
    setRatingComment('');
    setRatingError('');
    setShowRating(true);
  };

  const handleRatingSubmit = async () => {
    if (!ratingOrderId || !user?.maNguoiDung) return;
    
    if (!ratingComment.trim()) {
      setRatingError('Vui lòng nhập bình luận');
      return;
    }

    setRatingSubmitting(true);
    setRatingError('');

    try {
      const payload = {
        MaNguoiDung: user.maNguoiDung,
        SoSao: ratingStar,
        BinhLuan: ratingComment.trim()
      };
      console.log('Rating payload:', payload);
      
      await api.post(`/api/orders/${ratingOrderId}/rate`, payload);
      
      // Success - close modal and refresh orders
      setShowRating(false);
      alert('Cảm ơn bạn đã đánh giá!');
      
      // Refresh order list
      if (isAuthenticated && user?.maNguoiDung) {
        const res = await api.get(`/api/orders/user/${user.maNguoiDung}`);
        const data = res.data?.data;
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Rating failed:', err);
      setRatingError(err?.response?.data?.message || err.message || 'Không thể gửi đánh giá');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const openDetail = (orderId) => {
    if (!orderId) return;
    setSelectedId(orderId);
    setShowDetail(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const phone = String(code || '').trim();
    if (!phone) return;
    
    setResult({ loading: true });
    
    try {
      const res = await api.get(`/api/orders/phone/${phone}`);
      const data = res.data?.data;
      setResult({ 
        orders: Array.isArray(data) ? data : [],
        error: null 
      });
      setTrackedPhone(phone);
    } catch (err) {
      setResult({ 
        orders: [],
        error: err?.response?.data?.message || err.message || 'Không thể tra cứu đơn hàng'
      });
      setTrackedPhone('');
    }
  };

  return (
    <section className="py-4 bg-light min-vh-100">
      <Container>
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-2">Theo dõi đơn hàng</h2>
          <p className="text-muted">Kiểm tra trạng thái và chi tiết đơn hàng của bạn</p>
        </div>

        <Row className="justify-content-center">
          <Col lg={10}>
            {isAuthenticated ? (
              <>
                {/* User Orders List */}
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-danger bg-opacity-10 rounded-circle p-2 me-3">
                        <svg width="24" height="24" fill="#dc3545" viewBox="0 0 16 16">
                          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="mb-0 fw-bold">Đơn hàng của bạn</h5>
                        <p className="text-muted small mb-0">
                          {orders.length > 0 ? `${orders.length} đơn hàng` : 'Chưa có đơn hàng'}
                        </p>
                      </div>
                    </div>

                    {listLoading && (
                      <div className="text-center py-4">
                        <Spinner animation="border" variant="danger" />
                        <div className="text-muted mt-2">Đang tải danh sách đơn hàng...</div>
                      </div>
                    )}

                    {listError && (
                      <Alert variant="danger" className="d-flex align-items-center">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        {listError}
                      </Alert>
                    )}

                    {!listLoading && !listError && orders.length === 0 && (
                      <div className="text-center py-5">
                        <div className="mb-3">
                          <svg width="80" height="80" fill="#dee2e6" viewBox="0 0 16 16">
                            <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"/>
                          </svg>
                        </div>
                        <h5 className="text-muted mb-3">Bạn chưa có đơn hàng nào</h5>
                        <p className="text-muted mb-3">Hãy đặt món ngay để trải nghiệm pizza ngon nhất!</p>
                        <Button variant="danger" href="/menu">
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                            <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                          </svg>
                          Đặt hàng ngay
                        </Button>
                      </div>
                    )}

                    {orders.length > 0 && (
                      <div className="d-flex flex-column gap-3">
                        {orders.map(o => {
                          const lastStatus = getLastStatus(o);
                          const paymentStatus = getPaymentStatus(o);
                          const statusLower = (lastStatus || '').toLowerCase();
                          const badgeVariant = statusLower.includes('hủy') ? 'danger' : (statusLower.includes('đã') || statusLower.includes('hoàn') ? 'success' : 'warning');
                          const showPaymentButton = lastStatus === 'Chờ thanh toán';
                          const showRatingButton = lastStatus === 'Đã giao';
                          
                          return (
                            <Card key={o.MaDonHang} className="border-0 shadow-sm hover-lift" style={{ transition: 'transform 0.2s ease', cursor: 'pointer' }} onClick={() => openDetail(o.MaDonHang)}>
                              <Card.Body className="p-3">
                                <Row className="align-items-center">
                                  <Col md={3}>
                                    <div className="d-flex align-items-center gap-2">
                                      <div className="bg-danger bg-opacity-10 rounded-circle p-2">
                                        <svg width="20" height="20" fill="#dc3545" viewBox="0 0 16 16">
                                          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                                          <path d="M3 5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 5zm0 2a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 7zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 3 9z"/>
                                        </svg>
                                      </div>
                                      <div className="fw-bold">Đơn #{o.MaDonHang}</div>
                                    </div>
                                  </Col>
                                  
                                  <Col md={2}>
                                    <div className="small">
                                      <div className="text-muted mb-1">Ngày đặt</div>
                                      <div className="fw-semibold">
                                        {new Date(o.NgayDat).toLocaleDateString('vi-VN', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric'
                                        })}
                                      </div>
                                    </div>
                                  </Col>

                                  <Col md={2}>
                                    <div className="small">
                                      <div className="text-muted mb-1">Trạng thái</div>
                                      <Badge bg={badgeVariant} className="px-2 py-1">
                                        {lastStatus || 'Đang xử lý'}
                                      </Badge>
                                    </div>
                                  </Col>

                                  <Col md={2}>
                                    <div className="small">
                                      <div className="text-muted mb-1">Thanh toán</div>
                                      <Badge bg={paymentStatus ? 'info' : 'secondary'} className="px-2 py-1">
                                        {paymentStatus || 'Chưa có'}
                                      </Badge>
                                    </div>
                                  </Col>

                                  <Col md={2}>
                                    <div className="small">
                                      <div className="text-muted mb-1">Tổng tiền</div>
                                      <div className="fw-bold text-danger">{formatVnd(o.TongTien)}</div>
                                    </div>
                                  </Col>

                                  <Col md={1} className="text-end">
                                    <Button size="sm" variant="outline-danger" className="rounded-pill">
                                      Chi tiết
                                    </Button>
                                  </Col>
                                </Row>
                                
                                {(showPaymentButton || showRatingButton) && (
                                  <Row className="mt-3">
                                    <Col className="text-end">
                                      {showPaymentButton && (
                                        <Button 
                                          size="sm" 
                                          variant="success" 
                                          onClick={(e) => handlePayment(o.MaDonHang, e)}
                                          className="me-2"
                                        >
                                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H0V4zm0 3v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7H0zm3 2h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z"/>
                                          </svg>
                                          Thanh toán ngay
                                        </Button>
                                      )}
                                      {showRatingButton && (
                                        o.DanhGiaDonHang ? (
                                          <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            disabled
                                            className="opacity-75"
                                          >
                                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                              <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                            </svg>
                                            Đã đánh giá
                                          </Button>
                                        ) : (
                                          <Button 
                                            size="sm" 
                                            variant="warning" 
                                            onClick={(e) => openRating(o.MaDonHang, e)}
                                          >
                                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                              <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                            </svg>
                                            Đánh giá
                                          </Button>
                                        )
                                      )}
                                    </Col>
                                  </Row>
                                )}
                              </Card.Body>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </>
            ) : (
              <>
                {/* Guest Search by Phone */}
                <Card className="border-0 shadow-sm">
                  <Card.Body className="p-5 text-center">
                    <div className="mb-4">
                      <div className="bg-danger bg-opacity-10 rounded-circle p-3 d-inline-flex">
                        <svg width="48" height="48" fill="#dc3545" viewBox="0 0 16 16">
                          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                      </div>
                    </div>
                    
                    <h4 className="fw-bold mb-3">Tra cứu đơn hàng</h4>
                    <p className="text-muted mb-4">
                      Nhập số điện thoại để kiểm tra tất cả đơn hàng của bạn
                    </p>

                    <Form onSubmit={onSubmit} className="mx-auto" style={{ maxWidth: '500px' }}>
                      <div className="d-flex gap-2">
                        <Form.Control 
                          type="tel"
                          placeholder="Nhập số điện thoại (VD: 0909123456)" 
                          value={code} 
                          onChange={(e) => setCode(e.target.value)} 
                          required 
                          size="lg"
                          className="shadow-sm"
                        />
                        <Button variant="danger" type="submit" size="lg" className="px-4">
                          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                          </svg>
                          Tra cứu
                        </Button>
                      </div>
                    </Form>

                    <div className="mt-4 pt-4 border-top">
                      <p className="text-muted mb-3">Hoặc đăng nhập để xem tất cả đơn hàng của bạn</p>
                      <Button variant="outline-danger" href="/login" className="rounded-pill px-4">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                          <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                          <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                        </svg>
                        Đăng nhập ngay
                      </Button>
                    </div>
                  </Card.Body>
                </Card>

                {/* Guest orders result */}
                {result && (
                  <Card className="border-0 shadow-sm mt-4">
                    <Card.Body className="p-4">
                      {result.loading ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" variant="danger" />
                          <div className="text-muted mt-2">Đang tìm kiếm đơn hàng...</div>
                        </div>
                      ) : (
                        <>
                          <div className="d-flex align-items-center mb-4">
                            <div className="bg-danger bg-opacity-10 rounded-circle p-2 me-3">
                              <svg width="24" height="24" fill="#dc3545" viewBox="0 0 16 16">
                                <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                              </svg>
                            </div>
                            <div>
                              <h5 className="mb-0 fw-bold">Đơn hàng tìm thấy</h5>
                              <p className="text-muted small mb-0">
                                {result.orders?.length > 0 ? `${result.orders.length} đơn hàng` : 'Không có đơn hàng'}
                              </p>
                            </div>
                          </div>

                          {result.error && (
                        <Alert variant="danger" className="d-flex align-items-center">
                          <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                          </svg>
                          {result.error}
                        </Alert>
                      )}

                      {!result.error && result.orders?.length === 0 && (
                        <div className="text-center py-5">
                          <div className="mb-3">
                            <svg width="80" height="80" fill="#dee2e6" viewBox="0 0 16 16">
                              <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"/>
                            </svg>
                          </div>
                          <h5 className="text-muted mb-3">Không tìm thấy đơn hàng</h5>
                          <p className="text-muted">Vui lòng kiểm tra lại số điện thoại</p>
                        </div>
                      )}

                      {result.orders && result.orders.length > 0 && (
                        <div className="d-flex flex-column gap-3">
                          {result.orders.map(o => {
                            const lastStatus = getLastStatus(o);
                            const paymentStatus = getPaymentStatus(o);
                            const statusLower = (lastStatus || '').toLowerCase();
                            const badgeVariant = statusLower.includes('hủy') ? 'danger' : (statusLower.includes('đã') || statusLower.includes('hoàn') ? 'success' : 'warning');
                            const showPaymentButton = lastStatus === 'Chờ thanh toán';
                            const showRatingButton = lastStatus === 'Đã giao' && isAuthenticated;
                            
                            return (
                              <Card key={o.MaDonHang} className="border-0 shadow-sm hover-lift" style={{ transition: 'transform 0.2s ease', cursor: 'pointer' }} onClick={() => openDetail(o.MaDonHang)}>
                                <Card.Body className="p-3">
                                  <Row className="align-items-center">
                                    <Col md={3}>
                                      <div className="d-flex align-items-center gap-2">
                                        <div className="bg-danger bg-opacity-10 rounded-circle p-2">
                                          <svg width="20" height="20" fill="#dc3545" viewBox="0 0 16 16">
                                            <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                                            <path d="M3 5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 5zm0 2a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 7zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 3 9z"/>
                                          </svg>
                                        </div>
                                        <div className="fw-bold">Đơn #{o.MaDonHang}</div>
                                      </div>
                                    </Col>
                                    
                                    <Col md={2}>
                                      <div className="small">
                                        <div className="text-muted mb-1">Ngày đặt</div>
                                        <div className="fw-semibold">
                                          {new Date(o.NgayDat).toLocaleDateString('vi-VN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </div>
                                      </div>
                                    </Col>

                                    <Col md={2}>
                                      <div className="small">
                                        <div className="text-muted mb-1">Trạng thái</div>
                                        <Badge bg={badgeVariant} className="px-2 py-1">
                                          {lastStatus || 'Đang xử lý'}
                                        </Badge>
                                      </div>
                                    </Col>

                                    <Col md={2}>
                                      <div className="small">
                                        <div className="text-muted mb-1">Thanh toán</div>
                                        <Badge bg={paymentStatus ? 'info' : 'secondary'} className="px-2 py-1">
                                          {paymentStatus || 'Chưa có'}
                                        </Badge>
                                      </div>
                                    </Col>

                                    <Col md={2}>
                                      <div className="small">
                                        <div className="text-muted mb-1">Tổng tiền</div>
                                        <div className="fw-bold text-danger">{formatVnd(o.TongTien)}</div>
                                      </div>
                                    </Col>

                                    <Col md={1} className="text-end">
                                      <Button size="sm" variant="outline-danger" className="rounded-pill">
                                        Chi tiết
                                      </Button>
                                    </Col>
                                  </Row>
                                  
                                  {(showPaymentButton || showRatingButton) && (
                                    <Row className="mt-3">
                                      <Col className="text-end">
                                        {showPaymentButton && (
                                          <Button 
                                            size="sm" 
                                            variant="success" 
                                            onClick={(e) => handlePayment(o.MaDonHang, e)}
                                            className="me-2"
                                          >
                                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                              <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H0V4zm0 3v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7H0zm3 2h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z"/>
                                            </svg>
                                            Thanh toán ngay
                                          </Button>
                                        )}
                                        {showRatingButton && (
                                          <Button 
                                            size="sm" 
                                            variant="warning" 
                                            onClick={(e) => openRating(o.MaDonHang, e)}
                                          >
                                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                              <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                            </svg>
                                            Đánh giá
                                          </Button>
                                        )}
                                      </Col>
                                    </Row>
                                  )}
                                </Card.Body>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                        </>
                      )}
                    </Card.Body>
                  </Card>
                )}
              </>
            )}

            <OrderDetail show={showDetail} onHide={() => setShowDetail(false)} orderId={selectedId} />

            {/* Rating Modal */}
            <Modal show={showRating} onHide={() => setShowRating(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>Đánh giá đơn hàng #{ratingOrderId}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {ratingError && (
                  <Alert variant="danger" className="mb-3">
                    {ratingError}
                  </Alert>
                )}
                
                <Form.Group className="mb-3">
                  <Form.Label>Số sao *</Form.Label>
                  <div className="d-flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingStar(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '32px',
                          color: star <= ratingStar ? '#ffc107' : '#dee2e6'
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Bình luận *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Nhập đánh giá của bạn về đơn hàng này..."
                    disabled={ratingSubmitting}
                  />
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowRating(false)} disabled={ratingSubmitting}>
                  Hủy
                </Button>
                <Button variant="danger" onClick={handleRatingSubmit} disabled={ratingSubmitting}>
                  {ratingSubmitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi đánh giá'
                  )}
                </Button>
              </Modal.Footer>
            </Modal>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default TrackOrderPage;
