import React from 'react';
import { Link } from 'react-router-dom';
import styles from './CategoryPill.module.css';

const CategoryPill = ({ label, icon, image, to, active = false, onClick }) => {
  const content = (
    <>
      <span className={styles.thumb} data-hasimage={Boolean(image)}>
        {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : (icon || label?.charAt(0) || '🍕')}
      </span>
      <span className={styles.label}>{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`${styles.pill} ${active ? styles.active : ''}`} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={`${styles.pill} ${styles.buttonReset} ${active ? styles.active : ''}`} onClick={onClick}>
      {content}
    </button>
  );
};

export default CategoryPill;
