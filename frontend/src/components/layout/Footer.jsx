import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Facebook, Instagram, TwitterX } from 'react-bootstrap-icons';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={`${styles.footer} mt-auto pt-5 pb-4`}>
      <Container>
        <Row className="gy-4">
          <Col md={4}>
            <div className={`${styles.logoSection} d-flex align-items-center mb-3`}>
              <img src="/logo.png" alt="logo" style={{ height: 36, width: 36 }} className="me-2" />
              <span className="fw-bold text-white fs-5">Secret Pizza</span>
            </div>
            <p className="mb-3">Pizza tươi ngon mỗi ngày, giao hàng trong 60 phút. Hương vị Ý chính thống, giá cả hợp lý.</p>
            <div className={`${styles.socialLinks} d-flex gap-3 mt-3`}>
              <a href="#" aria-label="Facebook"><Facebook size={18} /></a>
              <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
              <a href="#" aria-label="Twitter"><TwitterX size={18} /></a>
            </div>
          </Col>
          <Col md={3}>
            <div className={styles.footerTitle}>Khám phá</div>
            <ul className="list-unstyled">
              <li className="mb-2"><a href="/menu">Menu</a></li>
              <li className="mb-2"><a href="/about">Về chúng tôi</a></li>
              <li className="mb-2"><a href="#">Khuyến mãi</a></li>
              <li className="mb-2"><a href="#">Tuyển dụng</a></li>
            </ul>
          </Col>
          <Col md={2}>
            <div className={styles.footerTitle}>Hỗ trợ</div>
            <ul className="list-unstyled">
              <li className="mb-2"><a href="/track-order">Theo dõi đơn</a></li>
              <li className="mb-2"><a href="#">FAQs</a></li>
              <li className="mb-2"><a href="#">Chính sách</a></li>
            </ul>
          </Col>
          <Col md={3}>
            <div className={styles.footerTitle}>Liên hệ</div>
            <ul className="list-unstyled">
              <li className="mb-2">📧 hello@secretpizza.vn</li>
              <li className="mb-2">📞 1900 1234</li>
              <li className="mb-2">🕐 9:00 - 22:00 hàng ngày</li>
              <li className="mb-2">📍 123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</li>
            </ul>
          </Col>
        </Row>
        <div className={`${styles.copy} text-center`}>
          <small>© {new Date().getFullYear()} Secret Pizza. All rights reserved. Made with ❤️ in Vietnam</small>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
