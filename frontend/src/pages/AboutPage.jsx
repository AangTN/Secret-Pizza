import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Spinner, Button } from 'react-bootstrap';
import { fetchBranches, fetchBestSellingFoods, assetUrl } from '../services/api';
import ProductCard from '../components/ui/ProductCard';
import styles from './AboutPage.module.css';

const GOONG_API_KEY = import.meta.env.VITE_MAP_KEY || 'msHvRH6pBTsFvRyZVMacg0YpKhq0VzUdTDaEERTH';
const DEFAULT_CENTER = { lng: 105.83991, lat: 21.028 };
const DEFAULT_ZOOM = 5;
const SINGLE_BRANCH_ZOOM = 13;

const AboutPage = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [sdkReady, setSdkReady] = useState(() => typeof window !== 'undefined' && !!window.goongjs);
  const [mapError, setMapError] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  // Best selling foods for showcase (use same source as HomePage)
  const [bestSellingFoods, setBestSellingFoods] = useState([]);
  const [foodsLoading, setFoodsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchBranches();
        if (mounted) setBranches(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load best selling foods for showcase
  useEffect(() => {
    let mounted = true;
    (async () => {
      setFoodsLoading(true);
      try {
        const data = await fetchBestSellingFoods();
        if (mounted) setBestSellingFoods(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Load best selling foods failed', err);
      } finally {
        if (mounted) setFoodsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (sdkReady) {
      try {
        console.log('Goong SDK already present. Setting accessToken from env. key present?', !!GOONG_API_KEY);
        window.goongjs.accessToken = GOONG_API_KEY;
      } catch (err) {
        console.error('Failed to set goongjs.accessToken:', err);
        setMapError('Lỗi khi cấu hình map SDK');
      }
      return;
    }

    const cssId = 'goong-js-css';
    if (!document.getElementById(cssId)) {
      const cssLink = document.createElement('link');
      cssLink.id = cssId;
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css';
      document.head.appendChild(cssLink);
    }

    const handleLoad = () => {
      console.log('Goong SDK script loaded, window.goongjs:', !!window.goongjs, 'GOONG_API_KEY present?', !!GOONG_API_KEY);
      if (window.goongjs) {
        try {
          window.goongjs.accessToken = GOONG_API_KEY;
          setSdkReady(true);
        } catch (err) {
          console.error('Failed to set accessToken after SDK load:', err);
          setMapError('Lỗi khi cấu hình access token cho map');
        }
      } else {
        setMapError('SDK Goong không khả dụng sau khi tải');
      }
    };

    const existingScript = document.querySelector('script[data-goong-js]');
    if (existingScript) {
      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', () => {
        console.error('Existing Goong SDK script reported error');
        setMapError('Không thể tải SDK bản đồ (existing script)');
      });
      return () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', () => {});
      };
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js';
    script.async = true;
    script.setAttribute('data-goong-js', 'true');
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', (e) => {
      console.error('Failed to load Goong Maps SDK', e);
      setMapError('Không thể tải SDK bản đồ');
    });
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
    };
  }, [sdkReady]);

  useEffect(() => {
    if (!sdkReady || !mapRef.current || mapInstanceRef.current) return;

    if (!GOONG_API_KEY) {
      setMapError('Thiếu API Key bản đồ (VITE_MAP_KEY)');
      return;
    }

    let map;
    try {
      console.log('Creating Goong map instance...');
      map = new window.goongjs.Map({
        container: mapRef.current,
        style: 'https://tiles.goong.io/assets/goong_map_web.json?api_key=' + GOONG_API_KEY,
        center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
        zoom: DEFAULT_ZOOM
      });
    } catch (err) {
      console.error('Failed to create Goong map instance:', err);
      setMapError('Lỗi khi khởi tạo bản đồ: ' + (err.message || 'Unknown'));
      return;
    }

    mapInstanceRef.current = map;
    setMapLoaded(false);

    const handleLoad = () => {
      console.log('Goong map load event fired');
      setMapLoaded(true);
    };

    const handleError = (err) => {
      console.error('Goong map error event:', err);
      setMapError('Lỗi bản đồ: ' + (err && err.error ? err.error.message || err.error : JSON.stringify(err)));
    };

    map.on('load', handleLoad);
    map.on('error', handleError);

    return () => {
      map.off('load', handleLoad);
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
      setMapLoaded(false);
    };
  }, [sdkReady, loading]);

  useEffect(() => {
    if (!sdkReady || !mapInstanceRef.current || !window.goongjs) return;

    const map = mapInstanceRef.current;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const validBranches = branches.filter(branch => {
      const lng = Number(branch.KinhDo);
      const lat = Number(branch.ViDo);
      return Number.isFinite(lng) && Number.isFinite(lat);
    });

    if (validBranches.length === 0) {
      map.flyTo({ center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat], zoom: DEFAULT_ZOOM });
      return;
    }

    const bounds = new window.goongjs.LngLatBounds();

    validBranches.forEach(branch => {
      const lng = Number(branch.KinhDo);
      const lat = Number(branch.ViDo);

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.cssText = `
        background: #ff4d4f;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      const popup = new window.goongjs.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <h6 style="margin: 0 0 8px 0; color: #ff4d4f; font-weight: 700;">${branch.TenCoSo}</h6>
          <p style="margin: 4px 0; font-size: 0.9rem;"><strong>📍</strong> ${branch.SoNhaDuong}, ${branch.PhuongXa}</p>
          <p style="margin: 4px 0; font-size: 0.9rem;"><strong>📞</strong> ${branch.SoDienThoai}</p>
        </div>
      `);

      const marker = new window.goongjs.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
    });

    if (markersRef.current.length === 1) {
      const [lng, lat] = markersRef.current[0].getLngLat().toArray();
      map.flyTo({ center: [lng, lat], zoom: SINGLE_BRANCH_ZOOM });
    } else {
      map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
    }
  }, [branches, sdkReady]);

  // For About page we will display bestSellingFoods directly using ProductCard (like HomePage)
  const bestSellers = useMemo(() => (Array.isArray(bestSellingFoods) ? bestSellingFoods.slice(0, 4) : []), [bestSellingFoods]);

  // Simple KPIs (static / could be dynamic later)
  const kpis = [
    { label: 'Pizza giao mỗi tháng', value: '12K+' },
    { label: 'Thành phần tươi mỗi ngày', value: '30+' },
    { label: 'Đánh giá trung bình', value: '4.8/5' },
    { label: 'Thời gian giao trung bình', value: 'Trong 60 phút' }
  ];

  return (
    <>
      {/* Hero Section - Christmas Theme */}
      <section className={styles.aboutHero}>
        <div className={styles.snowContainer}>
          {[...Array(20)].map((_, i) => (
            <div key={i} className={styles.snowflake} style={{ 
              left: `${Math.random() * 100}%`, 
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random()
            }}>❄</div>
          ))}
        </div>
        <Container>
          <Row className="align-items-center">
            <Col lg={7} className="text-center text-lg-start position-relative" style={{ zIndex: 2 }}>
              <h1 className={styles.heroTitle}>Mang Giáng Sinh <br /> Về Bếp Nhà</h1>
              <p className={styles.heroSubtitle}>
                Hơn cả một bữa ăn, chúng tôi mang đến không khí lễ hội ấm áp, 
                nơi mọi người quây quần bên nhau cùng những món ngon trọn vị.
              </p>
            </Col>
            <Col lg={5} className="d-none d-lg-block position-relative">
              <div className={styles.heroVisual}>
                <div className={styles.heroBubbleOne}></div>
                <div className={styles.heroBubbleTwo}></div>
                <div className={styles.heroMockPizza}>🎄</div>
              </div>
            </Col>
          </Row>
          <Row className={styles.kpiRow}>
            {kpis.map(k => (
              <Col key={k.label} xs={6} md={3} className={styles.kpiCol}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiValue}>{k.value}</div>
                  <div className={styles.kpiLabel}>{k.label}</div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Story Section - Christmas Theme */}
      <section id="story" className={styles.storySection}>
        <Container>
          <Row className="align-items-center mb-5">
            <Col lg={6} className="mb-4 mb-lg-0">
              <div style={{ position: 'relative', padding: '10px', border: '2px dashed #c41e3a', borderRadius: '20px' }}>
                <img 
                  src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=800&q=80" 
                  alt="Câu Chuyện Mùa Lễ Hội - Chất Lượng Vàng - Tận Tâm Phục Vụ" 
                  className="img-fluid rounded-4 shadow-lg w-100"
                  style={{ objectFit: 'cover', height: '400px' }}
                />
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '3rem' }}>🎀</div>
              </div>
            </Col>
            <Col lg={6} className="ps-lg-5">
              <h2 className="display-5 fw-bold mb-4" style={{ color: '#c41e3a', fontFamily: 'Merriweather, serif' }}>Câu Chuyện Mùa Lễ Hội</h2>
              <p className="lead text-muted mb-4">
                Bắt đầu từ một tiệm bánh nhỏ, mỗi mùa Giáng Sinh về, chúng tôi lại háo hức chuẩn bị những mẻ bánh thơm lừng để gửi trao yêu thương đến từng gia đình Việt.
              </p>
              <p className="text-muted">
                Mỗi chiếc bánh không chỉ là sự kết hợp của nguyên liệu thượng hạng, mà còn gói ghém cả tâm tình của người thợ làm bánh, mong muốn mang đến niềm vui trọn vẹn cho bữa tiệc của bạn.
              </p>
            </Col>
          </Row>

          <Row className="g-4">
            <Col md={4}>
              <div className={styles.storyCard}>
                <div className={styles.storyIcon}>🌟</div>
                <h3>Chất Lượng Vàng</h3>
                <p>Cam kết nguyên liệu tươi ngon nhất, như món quà quý giá dành tặng người thân.</p>
              </div>
            </Col>
            <Col md={4}>
              <div className={styles.storyCard}>
                <div className={styles.storyIcon}>❤️</div>
                <h3>Tận Tâm Phục Vụ</h3>
                <p>Đội ngũ nhân viên luôn sẵn sàng với nụ cười ấm áp, mang đến trải nghiệm tuyệt vời.</p>
              </div>
            </Col>
            <Col md={4}>
              <div className={styles.storyCard}>
                <div className={styles.storyIcon}>🛷</div>
                <h3>Giao Hàng Thần Tốc</h3>
                <p>Như cỗ xe tuần lộc, chúng tôi giao món nóng hổi đến tận cửa nhà bạn.</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Delivery Area Notice */}
      <section className={styles.deliveryNotice}>
        <Container>
          <div className={styles.deliveryBanner}>
            <div className={styles.deliveryText}>
              <div className={styles.deliveryKicker}>Khu vực giao hàng</div>
              <h2>Giao Giáng Sinh Tận Nơi Tại TP.HCM & Hà Nội</h2>
              <p>Chúng tôi đang mở rộng hệ thống để mang niềm vui đến nhiều nơi hơn nữa!</p>
            </div>
            <div className={styles.deliveryCities}>
              <div className={styles.cityPill}>🏙️ TP. Hồ Chí Minh <span className={styles.deliveryTag}>Hot</span></div>
              <div className={styles.cityPill}>🛕 Hà Nội <span className={styles.deliveryTag}>New</span></div>
            </div>
          </div>
        </Container>
      </section>

      {/* Best Sellers - Christmas Showcase */}
      <section id="best-sellers" className={styles.bestSection}>
        <Container>
          <div className="text-center mb-5">
            <h2 className={styles.bestTitle}>Món Ngon Đón Giáng Sinh</h2>
            <p className={styles.bestSubtitle}>Những lựa chọn tuyệt vời cho bữa tiệc ấm cúng bên gia đình</p>
          </div>
          {foodsLoading ? (
            <Row xs={1} sm={2} md={3} lg={4} className="g-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Col key={i}>
                  <div className={styles.skeletonCard}>
                    <div className="ratio ratio-4x3 skeleton mb-3"></div>
                    <div className="skeleton" style={{ height: 16, width: '70%', borderRadius: 8 }}></div>
                    <div className="skeleton mt-2" style={{ height: 14, width: '50%', borderRadius: 8 }}></div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : bestSellers.length > 0 ? (
            <>
              <Row xs={1} sm={2} md={3} lg={4} className="g-4">
                {bestSellers.map(item => (
                  <Col key={item.MaMonAn || item.id}>
                    <ProductCard pizza={item} />
                  </Col>
                ))}
              </Row>
            </>
          ) : (
            <div className="text-center text-muted py-4">Chưa có dữ liệu món ăn hiển thị.</div>
          )}
        </Container>
      </section>

      {/* Map & Branches */}
      <section className={styles.mapSection}>
        <Container>
          <h2 className={styles.mapTitle}>Ghé Thăm Ngôi Nhà Chung</h2>
          <p className={styles.mapSubtitle}>
            Tìm cửa hàng gần nhất để tận hưởng không khí Giáng Sinh cùng chúng tôi
          </p>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="danger" />
              <p className="mt-3 text-muted">Đang tải thông tin cửa hàng...</p>
            </div>
          ) : (
            <>
              <div className={styles.mapContainer}>
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                
                {(mapError || !mapLoaded) && (
                  <div className={styles.mapPlaceholder}>
                    {mapError ? (
                      <div className="text-center text-danger p-4">
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Không thể hiển thị bản đồ</div>
                        <div className="small">{mapError}</div>
                        <div className="small text-muted mt-2">Mở DevTools → Console để xem log chi tiết.</div>
                      </div>
                    ) : (
                      <Spinner animation="border" variant="danger" />
                    )}
                  </div>
                )}
              </div>

              <Row className={`g-4 ${styles.branchesGrid}`}>
                {branches.map(branch => (
                  <Col key={branch.MaCoSo} md={12}>
                    <Card className={styles.branchCard}>
                      <h5>{branch.TenCoSo}</h5>
                      <div className={styles.info}>
                        <strong>📍 Địa chỉ:</strong> {branch.SoNhaDuong}, {branch.PhuongXa}, {branch.QuanHuyen}, {branch.ThanhPho}
                      </div>
                      <div className={styles.info}>
                        <strong>📞 Điện thoại:</strong> {branch.SoDienThoai}
                      </div>
                      {branch?.ThanhPho && (/Hà\s*Nội|Ha\s*Noi|Hồ\s*Chí\s*Minh|Ho\s*Chi\s*Minh|HCM/i).test(branch.ThanhPho) && (
                        <div className={styles.deliveryTag}>Phục vụ xuyên lễ</div>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Container>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonialSection}>
        <Container>
          <h2 className="text-center mb-5 fw-bold" style={{ color: '#c41e3a', fontFamily: 'Merriweather, serif' }}>Lời Chúc Từ Khách Hàng</h2>
          <Row className="g-4">
            <Col md={4}>
              <div className={styles.testimonialCard}>
                <div className={styles.quoteMark}>“</div>
                <p>Giáng sinh năm nào cũng đặt tiệc ở đây, đồ ăn ngon và trang trí rất đẹp!</p>
                <div className={styles.reviewer}>— Minh Anh</div>
              </div>
            </Col>
            <Col md={4}>
              <div className={styles.testimonialCard}>
                <div className={styles.quoteMark}>“</div>
                <p>Combo Giáng sinh rất hời, cả nhà mình ăn no nê mà giá lại hợp lý.</p>
                <div className={styles.reviewer}>— Quốc Bảo</div>
              </div>
            </Col>
            <Col md={4}>
              <div className={styles.testimonialCard}>
                <div className={styles.quoteMark}>“</div>
                <p>Giao hàng đúng giờ dù là ngày lễ, pizza vẫn còn nóng hổi. Tuyệt vời!</p>
                <div className={styles.reviewer}>— Linh Trang</div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className={styles.finalCTA}>
        <Container className="text-center">
          <h2 className="fw-bold mb-3">Cùng Tạo Nên Mùa Giáng Sinh Đáng Nhớ!</h2>
          <p className="text-white-50 mb-4">Đặt bàn ngay hôm nay để nhận ưu đãi đặc biệt mùa lễ hội.</p>
          <Button as={Link} to="/menu" variant="light" size="lg" style={{ color: '#c41e3a', fontWeight: 'bold', padding: '12px 35px' }}>Đặt Tiệc Ngay →</Button>
        </Container>
      </section>
    </>
  );
};

export default AboutPage;
