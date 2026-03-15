import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './PaymentFailedPage.module.css';

const PaymentFailedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const orderId = searchParams.get('orderId');
  const message = searchParams.get('message') || 'Giao dịch không thành công. Vui lòng thử lại.';

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.illustration}>🦌❄️</div>
        
        <h1 className={styles.heading}>Oops! Có chút trục trặc...</h1>
        
        <p className={styles.message}>
          {message}
        </p>

        {orderId && (
          <div className="alert alert-light border mb-4">
            <div className="small text-muted mb-1">Mã đơn hàng</div>
            <div className="fw-bold">#{orderId}</div>
          </div>
        )}

        <p className={styles.message}>
          Đơn hàng của bạn vẫn được lưu. Bạn có thể <strong>thử lại thanh toán</strong> hoặc chọn phương thức khác!
        </p>

        <div className={styles.buttons}>
          <button className={styles.retryButton} onClick={() => navigate('/checkout')}>
            🔄 Thử lại thanh toán
          </button>
          
          <button className={styles.backButton} onClick={() => navigate('/cart')}>
            🛒 Quay lại giỏ hàng
          </button>
        </div>

        <p className={styles.helpText}>
          Cần hỗ trợ? Gọi ngay: <strong>1900 xxxx</strong>
        </p>
      </div>
    </div>
  );
};

export default PaymentFailedPage;
