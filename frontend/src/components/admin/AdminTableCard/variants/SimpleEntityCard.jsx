import React, { useMemo } from 'react';
import AdminTableCard from '../AdminTableCard';
import styles from './SimpleEntityCard.module.css';

const SimpleEntityCard = React.memo(({ 
  data, 
  type, 
  onEdit, 
  onDelete, 
  loading = false, 
  animate = false, 
  index = 0 
}) => {
  // Data mapping function to transform entity data to card props
  const mapToCardProps = useMemo(() => {
    if (!data) return null;

    // Determine entity configuration based on type
    const entityConfig = type === 'category' 
      ? {
          icon: '📁',
          gradient: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
          idField: 'MaDanhMuc',
          nameField: 'TenDanhMuc'
        }
      : {
          icon: '🏷️',
          gradient: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
          idField: 'MaLoaiMonAn',
          nameField: 'TenLoaiMonAn'
        };

    const entityId = data[entityConfig.idField];
    const entityName = data[entityConfig.nameField];
    const fallbackText = entityName?.charAt(0) || '?';

    return {
      variant: 'simple',
      header: {
        avatar: {
          icon: entityConfig.icon,
          fallback: fallbackText,
          gradient: entityConfig.gradient
        },
        title: entityName,
        subtitle: `Mã: ${entityId}`
      },
      footer: {
        actions: [
          { 
            icon: '✏️', 
            variant: 'success', 
            onClick: onEdit,
            text: 'Sửa',
            'aria-label': `Sửa ${type === 'category' ? 'danh mục' : 'loại món'} ${entityName}`
          },
          { 
            icon: '🗑️', 
            variant: 'danger', 
            onClick: onDelete,
            text: 'Xóa',
            'aria-label': `Xóa ${type === 'category' ? 'danh mục' : 'loại món'} ${entityName}`
          }
        ]
      }
    };
  }, [data, type, onEdit, onDelete]);

  // Calculate animation delay for staggered animations
  const animationDelay = useMemo(() => {
    return animate ? index * 0.1 : 0;
  }, [animate, index]);

  // Generate CSS classes for the card
  const cardClasses = useMemo(() => {
    const baseClass = styles.simpleEntityCard;
    const typeClass = styles[type] || '';
    const loadingClass = loading ? styles.loading : '';
    const animateClass = animate ? styles.animate : '';
    
    return `${baseClass} ${typeClass} ${loadingClass} ${animateClass}`.trim();
  }, [type, loading, animate]);

  if (!data) {
    return (
      <div className={`${styles.simpleEntityCard} ${styles.empty}`}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📋</span>
          <p>Không có dữ liệu</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cardClasses}
      style={{ 
        animationDelay: `${animationDelay}s`,
        '--entity-gradient': type === 'category' 
          ? 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
          : 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
      }}
    >
      <AdminTableCard
        data={data}
        variant="simple"
        header={mapToCardProps?.header}
        footer={mapToCardProps?.footer}
        loading={loading}
        animate={animate}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}
    </div>
  );
});

SimpleEntityCard.displayName = 'SimpleEntityCard';

export default SimpleEntityCard;