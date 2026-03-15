import React, { useMemo, useState } from 'react';
import AdminTableCard from '../AdminTableCard';
import styles from './ReviewCard.module.css';

// Star Rating Component
const StarRating = ({ rating, showValue = true }) => {
  return (
    <div className={styles.reviewCard__rating}>
      <div className={styles.reviewCard__stars}>
        {Array.from({ length: 5 }, (_, i) => (
          <span 
            key={i} 
            className={`${styles.reviewCard__star} ${
              i < rating ? styles['reviewCard__star--filled'] : ''
            }`}
          >
            {i < rating ? '⭐' : '☆'}
          </span>
        ))}
      </div>
      {showValue && (
        <span className={styles.reviewCard__ratingValue}>{rating}.0</span>
      )}
    </div>
  );
};

// Customer Avatar Component
const CustomerAvatar = ({ customer }) => {
  const initials = customer?.charAt(0) || '?';
  
  return (
    <div 
      className={styles.reviewCard__avatar}
      style={{
        background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)'
      }}
    >
      <span className={styles.reviewCard__avatarText}>{initials}</span>
    </div>
  );
};

// Comment Component with truncation
const CommentText = ({ comment, maxLength = 150 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!comment) return null;
  
  const shouldTruncate = comment.length > maxLength;
  const displayText = isExpanded || !shouldTruncate 
    ? comment 
    : comment.substring(0, maxLength) + '...';
  
  return (
    <div className={styles.reviewCard__comment}>
      <div className={styles.reviewCard__commentText}>
        {displayText}
      </div>
      {shouldTruncate && (
        <button
          className={styles.reviewCard__readMore}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Thu gọn' : 'Đọc thêm'}
        >
          {isExpanded ? 'Thu gọn' : 'Đọc thêm'}
        </button>
      )}
    </div>
  );
};

const ReviewCard = React.memo(({ 
  data, 
  onReply, 
  onHide, 
  onView, 
  loading = false, 
  animate = false, 
  index = 0, 
  maxCommentLength = 150 
}) => {
  // Data mapping function to transform review data to card props
  const mapToCardProps = useMemo(() => {
    if (!data) return null;

    const { orderId, customer, rating, comment, date } = data;
    
    // Determine sentiment-based styling
    const getSentimentVariant = (rating) => {
      if (rating >= 4) return 'success';
      if (rating >= 3) return 'warning';
      return 'error';
    };

    const sentimentVariant = getSentimentVariant(rating);

    return {
      variant: 'review',
      header: {
        avatar: {
          fallback: customer?.charAt(0) || '?',
          gradient: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)'
        },
        title: customer,
        subtitle: `Đơn hàng: ${orderId}`,
        badges: [{
          text: `${rating}.0`,
          variant: sentimentVariant,
          icon: '⭐'
        }]
      },
      body: {
        rating: {
          value: rating,
          showValue: true
        },
        primary: [{
          label: 'Nhận xét',
          value: comment,
          truncate: maxCommentLength
        }]
      },
      footer: {
        actions: [
          { 
            icon: '💬', 
            variant: 'success', 
            onClick: onReply,
            text: 'Trả lời',
            'aria-label': `Trả lời nhận xét của ${customer}`
          },
          { 
            icon: '👁️‍🗨️', 
            variant: 'warning', 
            onClick: onHide,
            text: 'Ẩn',
            'aria-label': `Ẩn nhận xét của ${customer}`
          },
          { 
            icon: '👁️', 
            variant: 'primary', 
            onClick: onView,
            text: 'Xem',
            'aria-label': `Xem chi tiết nhận xét của ${customer}`
          }
        ],
        timestamp: date
      }
    };
  }, [data, maxCommentLength, onReply, onHide, onView]);

  // Calculate animation delay for staggered animations
  const animationDelay = useMemo(() => {
    return animate ? index * 0.1 : 0;
  }, [animate, index]);

  // Generate CSS classes for the card
  const cardClasses = useMemo(() => {
    const baseClass = styles.reviewCard;
    const loadingClass = loading ? styles.loading : '';
    const animateClass = animate ? styles.animate : '';
    const sentimentClass = data?.rating ? styles[`sentiment-${data.rating >= 4 ? 'positive' : data.rating >= 3 ? 'neutral' : 'negative'}`] : '';
    
    return `${baseClass} ${loadingClass} ${animateClass} ${sentimentClass}`.trim();
  }, [loading, animate, data?.rating]);

  if (!data) {
    return (
      <div className={`${styles.reviewCard} ${styles.empty}`}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📋</span>
          <p>Không có dữ liệu đánh giá</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cardClasses}
      style={{ 
        animationDelay: `${animationDelay}s`
      }}
    >
      <AdminTableCard
        data={data}
        variant="review"
        header={mapToCardProps?.header}
        body={mapToCardProps?.body}
        footer={mapToCardProps?.footer}
        loading={loading}
        animate={animate}
      />
      
      {/* Custom review-specific content */}
      <div className={styles.reviewCard__content}>
        <div className={styles.reviewCard__header}>
          <CustomerAvatar customer={data.customer} />
          <div className={styles.reviewCard__headerInfo}>
            <h3 className={styles.reviewCard__customerName}>{data.customer}</h3>
            <p className={styles.reviewCard__orderRef}>Đơn hàng: {data.orderId}</p>
            <StarRating rating={data.rating} showValue={true} />
          </div>
        </div>
        
        <div className={styles.reviewCard__body}>
          <CommentText comment={data.comment} maxLength={maxCommentLength} />
        </div>
        
        <div className={styles.reviewCard__footer}>
          <div className={styles.reviewCard__actions}>
            <button
              className={`${styles.reviewCard__actionBtn} ${styles['reviewCard__actionBtn--success']}`}
              onClick={() => onReply?.(data.id)}
              aria-label={`Trả lời nhận xét của ${data.customer}`}
            >
              <span className={styles.reviewCard__actionIcon}>💬</span>
              <span>Trả lời</span>
            </button>
            <button
              className={`${styles.reviewCard__actionBtn} ${styles['reviewCard__actionBtn--warning']}`}
              onClick={() => onHide?.(data.id)}
              aria-label={`Ẩn nhận xét của ${data.customer}`}
            >
              <span className={styles.reviewCard__actionIcon}>👁️‍🗨️</span>
              <span>Ẩn</span>
            </button>
            <button
              className={`${styles.reviewCard__actionBtn} ${styles['reviewCard__actionBtn--primary']}`}
              onClick={() => onView?.(data.id)}
              aria-label={`Xem chi tiết nhận xét của ${data.customer}`}
            >
              <span className={styles.reviewCard__actionIcon}>👁️</span>
              <span>Xem</span>
            </button>
          </div>
          <div className={styles.reviewCard__timestamp}>
            {data.date}
          </div>
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

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;