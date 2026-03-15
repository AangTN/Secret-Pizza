import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Button } from 'react-bootstrap';
import { fetchCombos, assetUrl } from '../services/api';
import { Link } from 'react-router-dom';
import styles from './CombosPage.module.css';

const CombosPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [combos, setCombos] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError('');
        const data = await fetchCombos();
        if (mounted) setCombos(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) setError('Không tải được danh sách combo.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const activeCombos = useMemo(() => combos.filter(c => (c.TrangThai || '').toLowerCase() === 'active'), [combos]);
  const featured = activeCombos.length > 0 ? activeCombos[0] : null;
  const others = activeCombos.slice(1);

  return (
    <section style={{ paddingTop: 0 }}>
      <div className={styles.hero}> 
        <Container>
          <h1 className={styles.heroTitle}>Combo Ưu Đãi Cho Mọi Dịp</h1>
          <p className={styles.heroSubtitle}>Tiết kiệm hơn, no nê hơn — hoàn hảo cho buổi hẹn hò, họp mặt bạn bè hoặc gia đình.</p>
        </Container>
      </div>

      <Container className="py-4">
        {loading && <div className="text-center py-5"><Spinner animation="border" variant="danger" /></div>}
        {!loading && error && <div className="alert alert-warning">{error}</div>}

        {!loading && !error && featured && (
          <section className={styles.featuredSection}>
            <Card className={`${styles.featuredCard} shadow-sm`}>
              <Row className="g-0 align-items-center">
                <Col md={6}>
                  <div className={`${styles.featuredImage} ratio ratio-16x9`}>
                    <img src={featured.HinhAnh ? assetUrl(String(featured.HinhAnh).startsWith('/') ? featured.HinhAnh : `/images/AnhCombo/${featured.HinhAnh}`) : '/placeholder.svg'} alt={featured.TenCombo} />
                  </div>
                </Col>
                <Col md={6}>
                  <div className={styles.featuredBody}>
                    <div className={styles.kicker}>Combo nổi bật</div>
                    <h2 className="fw-bold mb-2">{featured.TenCombo}</h2>
                    {featured.MoTa && <p className="text-muted mb-3">{featured.MoTa}</p>}
                    <div className="d-flex align-items-center gap-3">
                      <div className={styles.featuredPrice}>{Number(featured.GiaCombo || 0).toLocaleString()} đ</div>
                      <Link to={`/combos/${featured.MaCombo}`} className="btn btn-danger btn-lg">Xem chi tiết</Link>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </section>
        )}

        {!loading && !error && others.length > 0 && (
          <section className="mt-4">
            <Row className="g-4">
              {others.map(c => {
                const image = c?.HinhAnh ? assetUrl(String(c.HinhAnh).startsWith('/') ? c.HinhAnh : `/images/AnhCombo/${c.HinhAnh}`) : '/placeholder.svg';
                const price = Number(c?.GiaCombo || 0);
                return (
                  <Col key={c.MaCombo} md={12}>
                    <Card className={`${styles.comboRowCard} shadow-sm`}> 
                      <Row className="g-0">
                        <Col md={4}>
                          <div className={`${styles.comboThumb} ratio ratio-4x3`}>
                            <img src={image} alt={c.TenCombo} />
                          </div>
                        </Col>
                        <Col md={8}>
                          <Card.Body className={styles.comboBody}>
                            <div>
                              <Card.Title className="fw-bold mb-2">{c.TenCombo}</Card.Title>
                              {c.MoTa && <Card.Text className="text-muted mb-2">{c.MoTa}</Card.Text>}
                            </div>
                            <div className={styles.comboActions}>
                              <div className={styles.comboPrice}>{price.toLocaleString()} đ</div>
                              <Link to={`/combos/${c.MaCombo}`}><Button variant="outline-danger">Xem chi tiết</Button></Link>
                            </div>
                          </Card.Body>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </section>
        )}

        {!loading && !error && activeCombos.length === 0 && (
          <div className="text-center text-muted py-5">Chưa có combo nào đang mở bán.</div>
        )}
      </Container>
    </section>
  );
};

export default CombosPage;
