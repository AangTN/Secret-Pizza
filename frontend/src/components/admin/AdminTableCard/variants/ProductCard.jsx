import React, { useMemo, useState } from 'react';
import AdminTableCard from '../AdminTableCard';
import styles from './ProductCard.module.css';

// Product Image/Avatar Component
const ProductImage = React.memo(({ src, name, type }) => {
  const [imageError, setImageError] = useState(false);

  if (src && type === 'product' && !imageError) {
    return (
      <img 
        src={src} 
        alt={name}
        className={styles.productCard__image}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    );
  }
  
  return (
    <div className={styles.productCard__avatar}>
      <span className={styles.productCard__avatarIcon}>
        {type === 'product' ? '🍕' : '⚙️'}
      </span>
    </div>
  );
});

ProductImage.displayName = 'ProductImage';

// Category Badges Component
const CategoryBadges = React.memo(({ categories }) => {
  if (!categories || categories.length === 0) {
    return <span className={styles.productCard__noCategories}>Chưa phân loại</span>;
  }

  return (
    <div className={styles.productCard__categories}>
      {categories.map((category, index) => (
        <span 
          key={index}
          className={styles.productCard__categoryBadge}
        >
          {category.TenDanhMuc || category}
        </span>
      ))}
    </div>
  );
});

CategoryBadges.displayName = 'CategoryBadges';

// Price Display Component
const PriceDisplay = React.memo(({ data, type }) => {
  if (type === 'option' && data.priceTable) {
    return (
      <div className={styles.productCard__priceVariations}>
        {data.priceTable.map((price, index) => (
          <div key={index} className={styles.productCard__priceVariation}>
            <span className={styles.productCard__sizeLabel}>{price.size}</span>
            <span className={styles.productCard__priceValue}>
              {price.value.toLocaleString()} đ
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.productCard__price}>
      <span className={styles.productCard__priceValue}>
        {data.Gia?.toLocaleString() || data.price?.toLocaleString() || 0} đ
      </span>
    </div>
  );
});

PriceDisplay.displayName = 'PriceDisplay';

// Description Component with truncation
const DescriptionText = React.memo(({ text, maxLength = 120 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text) return null;
  
  const shouldTruncate = text.length > maxLength;
  const displayText = isExpanded || !shouldTruncate 
    ? text 
    : text.substring(0, maxLength) + '...';
  
  return (
    <div className={styles.productCard__description}>
      <div className={styles.productCard__descriptionText}>
        {displayText}
      </div>
      {shouldTruncate && (
        <button
          className={styles.productCard__readMore}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Thu gọn' : 'Đọc thêm'}
        >
          {isExpanded ? 'Thu gọn' : 'Đọc thêm'}
        </button>
      )}
    </div>
  );
});

DescriptionText.displayName = 'DescriptionText';

const ProductCard = React.memo(({ 
  data, 
  type, 
  typeMap, 
  onEdit, 
  onDelete, 
  onView, 
  loading = false, 
  animate = false, 
  index = 0, 
  showImage = true, 
  maxDescriptionLength = 120 
}) => {
  

  // Calculate animation delay for staggered animations
  const animationDelay = useMemo(() => {
    return animate ? index * 0.1 : 0;
  }, [animate, index]);

  // Generate CSS classes for the card
  const cardClasses = useMemo(() => {
    const baseClass = styles.productCard;
    const typeClass = styles[type] || '';
    const loadingClass = loading ? styles.loading : '';
    const animateClass = animate ? styles.animate : '';
    const imageClass = showImage ? styles.withImage : styles.withoutImage;
    
    return `${baseClass} ${typeClass} ${loadingClass} ${animateClass} ${imageClass}`.trim();
  }, [type, loading, animate, showImage]);

  if (!data) {
    return (
      <div className={`${styles.productCard} ${styles.empty}`}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📦</span>
          <p>Không có dữ liệu {type === 'product' ? 'sản phẩm' : 'tùy chọn'}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cardClasses}
      style={{ 
        animationDelay: `${animationDelay}s`,
        '--product-gradient': type === 'product' 
          ? 'linear-gradient(135deg, #ff4d4f 0%, #ff6b6b 100%)'
          : 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)'
      }}
    >
      {/* Custom product-specific content */}
      <div className={styles.productCard__content}>
        <div className={styles.productCard__header}>
          {showImage && (
            <div className={styles.productCard__imageContainer}>
              <ProductImage 
                src={data.HinhAnh} 
                name={data.TenMonAn || data.name} 
                type={type} 
              />
            </div>
          )}
          
          <div className={styles.productCard__headerInfo}>
            <h3 className={styles.productCard__productName}>
              {data.TenMonAn || data.name}
            </h3>
            <p className={styles.productCard__productCode}>
              Mã: {data.MaMonAn || data.id}
            </p>
            <div className={styles.productCard__typeBadge}>
              <span className={styles.productCard__typeIcon}>🏷️</span>
              <span>{typeMap?.[data.MaLoaiMonAn] || data.group || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div className={styles.productCard__body}>
          <div className={styles.productCard__categoriesSection}>
            <h4 className={styles.productCard__sectionTitle}>Danh mục</h4>
            <CategoryBadges categories={data.DanhMuc} />
          </div>
          
          <div className={styles.productCard__descriptionSection}>
            <h4 className={styles.productCard__sectionTitle}>Mô tả</h4>
            <DescriptionText 
              text={data.MoTa || data.description} 
              maxLength={maxDescriptionLength} 
            />
          </div>
          
          <div className={styles.productCard__priceSection}>
            <h4 className={styles.productCard__sectionTitle}>Giá</h4>
            <PriceDisplay data={data} type={type} />
          </div>
        </div>
        
        <div className={styles.productCard__footer}>
          <div className={styles.productCard__actions}>
            <button
              className={`${styles.productCard__actionBtn} ${styles['productCard__actionBtn--success']}`}
              onClick={() => onEdit?.(data)}
              aria-label={`Sửa ${type === 'product' ? 'sản phẩm' : 'tùy chọn'} ${data.TenMonAn || data.name}`}
            >
              <span className={styles.productCard__actionIcon}>✏️</span>
              <span>Sửa</span>
            </button>
            <button
              className={`${styles.productCard__actionBtn} ${styles['productCard__actionBtn--danger']}`}
              onClick={() => onDelete?.(data)}
              aria-label={`Xóa ${type === 'product' ? 'sản phẩm' : 'tùy chọn'} ${data.TenMonAn || data.name}`}
            >
              <span className={styles.productCard__actionIcon}>🗑️</span>
              <span>Xóa</span>
            </button>
            <button
              className={`${styles.productCard__actionBtn} ${styles['productCard__actionBtn--primary']}`}
              onClick={() => onView?.(data)}
              aria-label={`Xem chi tiết ${type === 'product' ? 'sản phẩm' : 'tùy chọn'} ${data.TenMonAn || data.name}`}
            >
              <span className={styles.productCard__actionIcon}>👁️</span>
              <span>Xem</span>
            </button>
          </div>
          
          {data.updatedAt && (
            <div className={styles.productCard__timestamp}>
              Cập nhật: {new Date(data.updatedAt).toLocaleDateString('vi-VN')}
            </div>
          )}
        </div>
      </div>
      
      {/* Loading overlay */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;