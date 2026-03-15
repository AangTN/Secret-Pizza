import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import styles from './OrderSuccessPage.module.css';

const OrderSuccessPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.illustration}>🎅🦌</div>
        <h1 className={styles.heading}>Ho Ho Ho! Đơn hàng đã bay đi!</h1>
        <p className={styles.message}>
          Cảm ơn bạn đã chọn Secret Pizza. Món ăn ngon đang trên đường đến với bạn!
        </p>
        <div className={styles.buttons}>
          <button className={styles.primaryButton} onClick={() => navigate('/menu')}>
            Tiếp tục đặt món
          </button>
          <button className={styles.secondaryButton} onClick={() => navigate('/track-order')}>
            Theo dõi đơn hàng
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
