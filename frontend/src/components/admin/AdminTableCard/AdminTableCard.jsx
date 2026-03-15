import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './AdminTableCard.module.css';

// Props interface based on design specification
const AdminTableCard = ({ 
  variant = 'simple', 
  header, 
  body, 
  footer, 
  animate = false, 
  onClick 
}) => {
  // Memoize sections to prevent unnecessary re-renders
  const headerSection = useMemo(() => {
    if (!header) return null;
    
    return (
      <div className={styles.cardHeader}>
        {header.avatar && (
          <div className={styles.headerAvatar}>
            {header.avatar.gradient ? (
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: header.avatar.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--admin-font-size-lg)',
                  fontWeight: 'var(--admin-font-weight-bold)',
                  color: 'var(--admin-white)',
                  boxShadow: 'var(--admin-shadow-sm)'
                }}
              >
                {header.avatar.icon ? (
                  <span style={{ fontSize: '20px' }}>{header.avatar.icon}</span>
                ) : (
                  <img 
                    src={header.avatar.fallback} 
                    alt={header.avatar.alt || 'Avatar'}
                    style={{ width: '24px', height: '24px' }}
                  />
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--admin-space-sm)' }}>
                <h3 className={styles.cardTitle}>{header.title}</h3>
                {header.subtitle && (
                  <p className={styles.cardSubtitle}>{header.subtitle}</p>
                )}
              </div>
            )}
            
            {header.badges && header.badges.length > 0 && (
              <div style={{ display: 'flex', gap: 'var(--admin-space-xs)', marginTop: 'var(--admin-space-xs)' }}>
                {header.badges.map((badge, index) => (
                  <span 
                    key={index}
                    className={`badge bg-${badge.type || 'primary'}`}
                    style={{
                      padding: '2px 6px',
                      borderRadius: 'var(--admin-radius-sm)',
                      fontSize: 'var(--admin-font-size-xs)',
                      fontWeight: 'var(--admin-font-weight-medium)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: badge.type === 'success' ? 'var(--admin-success)' : 
                                 badge.type === 'warning' ? 'var(--admin-warning)' : 
                                 badge.type === 'error' ? 'var(--admin-error)' : 
                                 'var(--admin-primary)',
                      color: 'var(--admin-white)'
                    }}
                  >
                    {badge.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        
        {!header.avatar && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--admin-space-sm)' }}>
            <h3 className={styles.cardTitle}>{header.title}</h3>
            {header.subtitle && (
              <p className={styles.cardSubtitle}>{header.subtitle}</p>
            )}
          </div>
        )}
        
        {header.badges && header.badges.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--admin-space-xs)', marginTop: 'var(--admin-space-xs)' }}>
            {header.badges.map((badge, index) => (
              <span 
                key={index}
                className={`badge bg-${badge.type || 'primary'}`}
                style={{
                  padding: '2px 6px',
                  borderRadius: 'var(--admin-radius-sm)',
                  fontSize: 'var(--admin-font-size-xs)',
                  fontWeight: 'var(--admin-font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: badge.type === 'success' ? 'var(--admin-success)' : 
                             badge.type === 'warning' ? 'var(--admin-warning)' : 
                             badge.type === 'error' ? 'var(--admin-error)' : 
                             'var(--admin-primary)',
                  color: 'var(--admin-white)'
                }}
              >
                {badge.text}
              </span>
            ))}
          </div>
        )}
      </div>
    );
    }, [header]);

  const bodySection = useMemo(() => {
    if (!body) return null;
    
    // Handle different body content types
    const RenderBodyContent = () => {
      if (body.primary && body.primary.length > 0) {
        return (
          <div style={{ marginBottom: 'var(--admin-space-md)' }}>
            {body.primary.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 'var(--admin-space-sm)', 
                borderRadius: 'var(--admin-radius-md)',
                background: 'var(--admin-bg-secondary)',
                marginBottom: 'var(--admin-space-xs)'
              }}>
                <div>
                  <div style={{ 
                    fontSize: 'var(--admin-font-size-sm)', 
                    fontWeight: 'var(--admin-font-weight-medium)', 
                    color: 'var(--admin-text-secondary)',
                    flex: 1
                  }}>
                    {item.label}
                  </div>
                  <div style={{ 
                    fontSize: 'var(--admin-font-size-lg)', 
                    fontWeight: 'var(--admin-font-weight-bold)', 
                    color: 'var(--admin-text-primary)'
                  }}>
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      if (body.metadata && body.metadata.length > 0) {
        return (
          <div style={{ marginBottom: 'var(--admin-space-md)' }}>
            {body.metadata.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 'var(--admin-space-sm)', 
                borderRadius: 'var(--admin-radius-md)',
                background: 'var(--admin-bg-tertiary)',
                marginBottom: 'var(--admin-space-xs)'
              }}>
                <div>
                  <div style={{ 
                    fontSize: 'var(--admin-font-size-sm)', 
                    fontWeight: 'var(--admin-font-weight-medium)', 
                    color: 'var(--admin-text-secondary)',
                    flex: 1
                  }}>
                    {item.label}
                  </div>
                  <div style={{ 
                    fontSize: 'var(--admin-font-size-sm)', 
                    color: 'var(--admin-text-primary)'
                  }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      if (body.badges && body.badges.length > 0) {
        return (
          <div style={{ marginBottom: 'var(--admin-space-md)' }}>
            {body.badges.map((badge, index) => (
              <span 
                key={index}
                className={`badge bg-${badge.type || 'primary'}`}
                style={{
                  padding: '2px 6px',
                  borderRadius: 'var(--admin-radius-sm)',
                  fontSize: 'var(--admin-font-size-xs)',
                  fontWeight: 'var(--admin-font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: badge.type === 'success' ? 'var(--admin-success)' : 
                                 badge.type === 'warning' ? 'var(--admin-warning)' : 
                                 badge.type === 'error' ? 'var(--admin-error)' : 
                                 'var(--admin-primary)',
                  color: 'var(--admin-white)'
                }}
              >
                {badge.text}
              </span>
            ))}
          </div>
        );
      }
      
      if (body.rating) {
        return (
          <div className={styles.cardStats}>
            <div className={styles.cardStatIcon} style={{ background: 'linear-gradient(135deg, var(--admin-info) 0%, var(--admin-secondary-light) 100%)' }}>
              <span style={{ fontSize: '24px' }}>⭐</span>
            </div>
            <div className={styles.cardStatValue}>{body.rating.avg?.toFixed(1)}</div>
            <div className={styles.cardStatLabel}>({body.rating.count} đánh giá)</div>
          </div>
        );
      }
      
      if (body.expandable) {
        return (
          <div style={{ marginTop: 'var(--admin-space-md)' }}>
            {Object.entries(body.expandable).map(([key, value], index) => (
              <div key={index} style={{ 
                marginBottom: 'var(--admin-space-xs)', 
                padding: 'var(--admin-space-sm)', 
                borderRadius: 'var(--admin-radius-md)', 
                background: 'var(--admin-bg-secondary)' 
              }}>
                <div style={{ 
                  fontSize: 'var(--admin-font-size-sm)', 
                  fontWeight: 'var(--admin-font-weight-medium)', 
                  color: 'var(--admin-text-secondary)', 
                  marginBottom: 'var(--admin-space-xs)' 
                }}>
                  {key}
                </div>
                <div style={{ 
                  fontSize: 'var(--admin-font-size-base)', 
                  color: 'var(--admin-text-primary)' 
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      return (
        <div className={styles.cardBody}>
          <RenderBodyContent />
        </div>
      );
    };
  }, [body]);

  const footerSection = useMemo(() => {
    if (!footer) return null;
    
    return (
      <div className={styles.cardFooter}>
        {footer.actions && footer.actions.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--admin-space-xs)' }}>
            {footer.actions.map((action, index) => (
              <button
                key={index}
                className={`btn btn-${action.type || 'primary'}`}
                style={{
                  padding: 'var(--admin-space-xs)',
                  borderRadius: 'var(--admin-radius-sm)',
                  fontSize: 'var(--admin-font-size-sm)',
                  fontWeight: 'var(--admin-font-weight-medium)',
                  border: 'none',
                  background: action.type === 'primary' ? 'var(--admin-primary)' : 
                             action.type === 'success' ? 'var(--admin-success)' : 
                             action.type === 'warning' ? 'var(--admin-warning)' : 
                             action.type === 'danger' ? 'var(--admin-error)' : 
                             'var(--admin-secondary)',
                  color: 'var(--admin-white)',
                  cursor: 'pointer',
                  transition: 'var(--admin-transition-base)'
                }}
                onClick={action.onClick}
              >
                {action.text}
              </button>
            ))}
          </div>
        )}
        
        {footer.secondary && (
          <div style={{ marginTop: 'var(--admin-space-sm)' }}>
            <span style={{ 
              fontSize: 'var(--admin-font-size-xs)', 
              color: 'var(--admin-text-tertiary)', 
              fontWeight: 'var(--admin-font-weight-normal)' 
            }}>
              {footer.secondary}
            </span>
          </div>
        )}
        
        {footer.timestamp && (
          <div style={{ 
            fontSize: 'var(--admin-font-size-xs)', 
            color: 'var(--admin-text-tertiary)', 
            marginTop: 'var(--admin-space-xs)' 
          }}>
            Cập nhật: {footer.timestamp}
          </div>
        )}
      </div>
    );
  }, [footer]);

  // Combine all sections
  const cardClassName = useMemo(() => {
    const baseClass = styles.card;
    const variantClass = styles[variant] || styles.card;
    const animationClass = animate ? styles.cardAnimateIn : '';
    const clickableClass = onClick ? styles.cardClickable : '';
    
    return `${baseClass} ${variantClass} ${animationClass} ${clickableClass}`.trim();
  }, [variant, animate, onClick]);

  return (
    <div 
      className={cardClassName}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {headerSection}
      {bodySection}
      {footerSection}
    </div>
  );
};

export default AdminTableCard;