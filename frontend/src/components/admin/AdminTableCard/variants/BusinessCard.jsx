import React, { useMemo, useState } from 'react';
import AdminTableCard from '../AdminTableCard';
import styles from './BusinessCard.module.css';

// Status Badge Component
const StatusBadge = ({ status, type }) => {
  const statusConfig = {
    order: {
      'Đang xử lý': { variant: 'warning', icon: '⏳' },
      'Đang giao': { variant: 'primary', icon: '🚚' },
      'Đã giao': { variant: 'success', icon: '✅' },
      'Đã hủy': { variant: 'secondary', icon: '❌' }
    },
    promotion: {
      'Đang hoạt động': { variant: 'success', icon: '🎉' },
      'Sắp diễn ra': { variant: 'warning', icon: '⏰' },
      'Đã kết thúc': { variant: 'secondary', icon: '🔚' }
    },
    user: {
      'Hoạt động': { variant: 'success', icon: '🟢' },
      'Đã khóa': { variant: 'danger', icon: '🔒' },
      'Chưa xác thực': { variant: 'warning', icon: '⚠️' }
    }
  };

  const config = statusConfig[type]?.[status] || { variant: 'default', icon: '📋' };
  
  return (
    <span className={`${styles.businessCard__statusBadge} ${styles[`businessCard__statusBadge--${config.variant}`]}`}>
      <span className={styles.businessCard__statusIcon}>{config.icon}</span>
      {status}
    </span>
  );
};

// Timeline Component
const Timeline = ({ events, compact }) => {
  if (!events || events.length === 0) return null;

  return (
    <div className={styles.businessCard__timeline}>
      {events.slice(0, compact ? 2 : 5).map((event, index) => (
        <div key={index} className={styles.businessCard__timelineItem}>
          <div className={styles.businessCard__timelineDot} />
          <div className={styles.businessCard__timelineContent}>
            <div className={styles.businessCard__timelineEvent}>{event.event}</div>
            <div className={styles.businessCard__timelineTime}>{event.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Action Buttons Component
const ActionButtons = ({ data, type, actions, compact }) => {
  const getActions = () => {
    switch (type) {
      case 'order':
        return [
          { icon: '👁️', variant: 'success', label: 'Xem', onClick: actions.onView },
          { icon: '📝', variant: 'primary', label: 'Cập nhật', onClick: actions.onEdit },
          // Allow cancelling for any order that is not already delivered or cancelled
          ...((data.status !== 'Đã giao' && data.status !== 'Đã hủy') ?
            [{ icon: '❌', variant: 'danger', label: 'Hủy', onClick: actions.onCancel }] : [])
        ];
      case 'promotion':
        return [
          { icon: '✏️', variant: 'success', label: 'Sửa', onClick: actions.onEdit },
          { icon: data.status === 'Đang hoạt động' ? '⏸️' : '▶️', 
            variant: 'primary', label: data.status === 'Đang hoạt động' ? 'Tạm dừng' : 'Kích hoạt',
            onClick: actions.onToggleStatus },
          { icon: '🗑️', variant: 'danger', label: 'Xóa', onClick: actions.onDelete }
        ];
      case 'user':
        return [
          { icon: '👁️', variant: 'primary', label: 'Xem', onClick: actions.onView },
          { icon: '🔒', variant: data.status === 'Hoạt động' ? 'warning' : 'success',
            label: data.status === 'Hoạt động' ? 'Khóa' : 'Mở khóa',
            onClick: actions.onToggleStatus },
          { icon: '🔄', variant: 'secondary', label: 'Đặt lại MK', onClick: actions.onResetPassword }
        ];
      default:
        return [];
    }
  };

  return (
    <div className={styles.businessCard__actions}>
      {getActions().map((action, index) => (
        <button
          key={index}
          className={`${styles.businessCard__action} ${styles[`businessCard__action--${action.variant}`]}`}
          onClick={action.onClick}
          title={action.label}
          aria-label={action.label}
        >
          <span className={styles.businessCard__actionIcon}>{action.icon}</span>
          {!compact && <span className={styles.businessCard__actionLabel}>{action.label}</span>}
        </button>
      ))}
    </div>
  );
};

// Business Avatar Component
const BusinessAvatar = ({ data, type }) => {
  const getAvatarGradient = (type) => {
    switch (type) {
      case 'order':
        return 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)';
      case 'promotion':
        return 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)';
      case 'user':
        return 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)';
      default:
        return 'linear-gradient(135deg, #8c8c8c 0%, #bfbfbf 100%)';
    }
  };

  const getFallbackText = () => {
    switch (type) {
      case 'order':
        return data.customer?.charAt(0) || data.id?.charAt(0) || '?';
      case 'promotion':
        return data.code?.charAt(0) || data.name?.charAt(0) || '?';
      case 'user':
        return data.name?.charAt(0) || data.email?.charAt(0) || '?';
      default:
        return '?';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'order':
        return '📦';
      case 'promotion':
        return '🎯';
      case 'user':
        return '👤';
      default:
        return '📋';
    }
  };

  return (
    <div 
      className={styles.businessCard__avatar}
      style={{ background: getAvatarGradient(type) }}
    >
      <span className={styles.businessCard__avatarIcon}>
        {data.avatar ? (
          <img src={data.avatar} alt="" className={styles.businessCard__avatarImage} />
        ) : (
          getFallbackText()
        )}
      </span>
      <span className={styles.businessCard__avatarTypeIcon}>{getIcon()}</span>
    </div>
  );
};

// Metrics Display Component
const MetricsDisplay = ({ data, type }) => {
  const getMetrics = () => {
    switch (type) {
      case 'order':
        return [
          { label: 'Tổng tiền', value: `${data.total?.toLocaleString() || 0} đ`, highlight: true },
          { label: 'Số món', value: data.items?.length || 0 },
          { label: 'Thời gian', value: data.time || 'N/A' }
        ];
      case 'promotion':
        return [
          { label: 'Giảm giá', value: `${data.value || 0}%`, highlight: true },
          { label: 'Đơn tối thiểu', value: `${data.minOrder?.toLocaleString() || 0} đ` },
          { label: 'Lượt dùng', value: data.usage || 0 }
        ];
      case 'user':
        return [
          { label: 'Đơn hàng', value: data.orders || 0, highlight: true },
          { label: 'Vai trò', value: data.role || 'N/A' },
          { label: 'Đăng nhập cuối', value: data.lastLogin || 'N/A' }
        ];
      default:
        return [];
    }
  };

  const metrics = getMetrics();

  return (
    <div className={styles.businessCard__metrics}>
      {metrics.map((metric, index) => (
        <div 
          key={index} 
          className={`${styles.businessCard__metric} ${metric.highlight ? styles.businessCard__metricHighlight : ''}`}
        >
          <div className={styles.businessCard__metricLabel}>{metric.label}</div>
          <div className={styles.businessCard__metricValue}>{metric.value}</div>
        </div>
      ))}
    </div>
  );
};

// Expandable Details Component
const ExpandableDetails = ({ data, type }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDetails = () => {
    switch (type) {
      case 'order':
        return {
          phone: data.phone,
          items: data.items?.slice(0, 3) || [],
          address: data.address
        };
      case 'promotion':
        return {
          timeStart: data.timeStart,
          timeEnd: data.timeEnd,
          description: data.description
        };
      case 'user':
        return {
          email: data.email,
          phone: data.phone,
          lastOrder: data.lastOrder,
          address: data.address
        };
      default:
        return {};
    }
  };

  const details = getDetails();
  const hasDetails = Object.values(details).some(value => value && (Array.isArray(value) ? value.length > 0 : true));

  if (!hasDetails) return null;

  return (
    <div className={styles.businessCard__expandable}>
      <button
        className={styles.businessCard__expandToggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.businessCard__expandToggleText}>
          {isExpanded ? 'Thu gọn' : 'Chi tiết'}
        </span>
        <span className={`${styles.businessCard__expandToggleIcon} ${isExpanded ? styles.businessCard__expandToggleIconOpen : ''}`}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div className={styles.businessCard__expandContent}>
          {Object.entries(details).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            
            if (Array.isArray(value)) {
              return (
                <div key={key} className={styles.businessCard__detailSection}>
                  <div className={styles.businessCard__detailLabel}>
                    {key === 'items' ? 'Sản phẩm' : key}
                  </div>
                  <div className={styles.businessCard__detailList}>
                    {value.map((item, index) => (
                      <div key={index} className={styles.businessCard__detailItem}>
                        {item.name || item.TenMonAn || item}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            
            return (
              <div key={key} className={styles.businessCard__detailSection}>
                <div className={styles.businessCard__detailLabel}>
                  {key === 'phone' ? 'Số điện thoại' : 
                   key === 'email' ? 'Email' :
                   key === 'timeStart' ? 'Bắt đầu' :
                   key === 'timeEnd' ? 'Kết thúc' :
                   key === 'address' ? 'Địa chỉ' :
                   key === 'lastOrder' ? 'Đơn hàng cuối' :
                   key === 'description' ? 'Mô tả' : key}
                </div>
                <div className={styles.businessCard__detailValue}>{value}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Main BusinessCard Component
const BusinessCard = React.memo(({ 
  data, 
  type, 
  onView, 
  onEdit, 
  onDelete, 
  onCancel, 
  onToggleStatus, 
  onResetPassword, 
  loading = false, 
  animate = false, 
  index = 0, 
  showTimeline = false, 
  compact = false 
}) => {
  // Generate timeline events based on type and data
  const generateTimelineEvents = () => {
    switch (type) {
      case 'order':
        return [
          { event: 'Đơn hàng được tạo', time: data.time },
          ...(data.status === 'Đang xử lý' ? [{ event: 'Đang xử lý', time: data.updatedAt }] : []),
          ...(data.status === 'Đang giao' ? [{ event: 'Đang giao hàng', time: data.shippedAt }] : []),
          ...(data.status === 'Đã giao' ? [{ event: 'Đã giao hàng', time: data.deliveredAt }] : []),
        ].filter(Boolean);
      case 'promotion':
        return [
          { event: 'Khuyến mãi được tạo', time: data.createdAt },
          ...(data.status === 'Đang hoạt động' ? [{ event: 'Đang hoạt động', time: data.startedAt }] : []),
          ...(data.status === 'Đã kết thúc' ? [{ event: 'Đã kết thúc', time: data.endedAt }] : []),
        ].filter(Boolean);
      case 'user':
        return [
          { event: 'Tài khoản được tạo', time: data.createdAt },
          ...(data.lastLogin ? [{ event: 'Đăng nhập cuối', time: data.lastLogin }] : []),
          ...(data.lastOrder ? [{ event: 'Đơn hàng cuối', time: data.lastOrder }] : []),
        ].filter(Boolean);
      default:
        return [];
    }
  };

  const timelineEvents = generateTimelineEvents();

  // Map data to AdminTableCard props
  const CARD_PROPS = useMemo(() => {
    const getPrimaryTitle = () => {
      switch (type) {
        case 'order':
          return `Đơn hàng #${data.id}`;
        case 'promotion':
          return data.name || data.code;
        case 'user':
          return data.name;
        default:
          return 'N/A';
      }
    };

    const getSubtitle = () => {
      switch (type) {
        case 'order':
          return data.customer;
        case 'promotion':
          return `Mã: ${data.code}`;
        case 'user':
          return data.email;
        default:
          return '';
      }
    };

    return {
      variant: 'business',
      header: {
        avatar: {
          fallback: data.name?.charAt(0) || data.customer?.charAt(0) || data.code?.charAt(0) || '?',
          gradient: type === 'order' ? 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)' :
                     type === 'promotion' ? 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)' :
                     'linear-gradient(135deg, #722ed1 0%, #9254de 100%)'
        },
        title: getPrimaryTitle(),
        subtitle: getSubtitle(),
        badges: [
          { text: data.status, type: type === 'order' ? 'primary' : type === 'promotion' ? 'success' : 'info' }
        ]
      },
      body: {
        primary: [
          { label: type === 'order' ? 'Tổng tiền' : type === 'promotion' ? 'Giảm giá' : 'Đơn hàng', 
            value: type === 'order' ? `${data.total?.toLocaleString() || 0} đ` : 
                   type === 'promotion' ? `${data.value || 0}%` : 
                   data.orders || 0 }
        ]
      },
      footer: {
        actions: [
          { text: 'Xem', type: 'primary', onClick: onView },
          { text: 'Sửa', type: 'success', onClick: onEdit },
          ...(type === 'order' && data.status !== 'Đã giao' && data.status !== 'Đã hủy' ? 
            [{ text: 'Hủy', type: 'danger', onClick: onCancel }] : []),
          ...(type === 'promotion' ? 
            [{ text: data.status === 'Đang hoạt động' ? 'Tạm dừng' : 'Kích hoạt', 
               type: 'warning', onClick: onToggleStatus }] : []),
          ...(type === 'user' ? 
            [{ text: data.status === 'Hoạt động' ? 'Khóa' : 'Mở khóa', 
               type: 'warning', onClick: onToggleStatus }] : [])
        ],
        timestamp: data.updatedAt || data.createdAt
      }
    };
  }, [data, type, onView, onEdit, onCancel, onToggleStatus]);

  // Calculate animation delay
  const animationDelay = useMemo(() => {
    return animate ? index * 0.1 : 0;
  }, [animate, index]);

  // Generate CSS classes
  const cardClasses = useMemo(() => {
    const baseClass = styles.businessCard;
    const typeClass = styles[`businessCard--${type}`] || '';
    const loadingClass = loading ? styles.loading : '';
    const animateClass = animate ? styles.animate : '';
    const compactClass = compact ? styles.compact : '';
    
    return `${baseClass} ${typeClass} ${loadingClass} ${animateClass} ${compactClass}`.trim();
  }, [type, loading, animate, compact]);

  if (!data) {
    return (
      <div className={`${styles.businessCard} ${styles.empty}`}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📊</span>
          <p>Không có dữ liệu {type === 'order' ? 'đơn hàng' : type === 'promotion' ? 'khuyến mãi' : 'người dùng'}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cardClasses}
      style={{ animationDelay: `${animationDelay}s` }}
    >
      {/* Custom Business Card Content */}
      <div className={styles.businessCard__content}>
        {/* Header */}
        <div className={styles.businessCard__header}>
          <BusinessAvatar data={data} type={type} />
          <div className={styles.businessCard__headerInfo}>
            <h3 className={styles.businessCard__title}>
              {type === 'order' && `Đơn hàng #${data.id}`}
              {type === 'promotion' && (data.name || data.code)}
              {type === 'user' && data.name}
            </h3>
            <p className={styles.businessCard__subtitle}>
              {type === 'order' && data.customer}
              {type === 'promotion' && `Mã: ${data.code}`}
              {type === 'user' && data.email}
            </p>
            <StatusBadge status={data.status} type={type} />
          </div>
        </div>

        {/* Body */}
        <div className={styles.businessCard__body}>
          <MetricsDisplay data={data} type={type} />
          
          {showTimeline && timelineEvents.length > 0 && (
            <div className={styles.businessCard__timelineSection}>
              <h4 className={styles.businessCard__sectionTitle}>Lịch sử</h4>
              <Timeline events={timelineEvents} compact={compact} />
            </div>
          )}
          
          <ExpandableDetails data={data} type={type} />
        </div>

        {/* Footer */}
        <div className={styles.businessCard__footer}>
          <ActionButtons 
            data={data} 
            type={type} 
            actions={{
              onView,
              onEdit,
              onDelete,
              onCancel,
              onToggleStatus,
              onResetPassword
            }}
            compact={compact}
          />
          
          {data.updatedAt && (
            <div className={styles.businessCard__timestamp}>
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

BusinessCard.displayName = 'BusinessCard';

export default BusinessCard;