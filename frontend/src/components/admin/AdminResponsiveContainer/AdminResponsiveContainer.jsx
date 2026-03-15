import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './AdminResponsiveContainer.module.css';

/**
 * Enhanced AdminResponsiveContainer - A wrapper component that automatically switches between
 * table and card views based on screen size for optimal admin interface experience.
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Table component to render on desktop
 * @param {ReactNode} props.cardComponent - Card component to render on mobile (optional)
 * @param {Array} props.data - Data array for auto-generation and both views (optional)
 * @param {boolean} props.loading - Loading state (default: false)
 * @param {boolean} props.empty - Empty state (default: false)
 * @param {number} props.breakpoint - Custom breakpoint in pixels (default: 768)
 * @param {boolean} props.useCSSOnly - Use CSS media queries only (default: false)
 * @param {boolean} props.autoGenerateCards - Auto-generate cards from table data (default: false)
 * @param {boolean} props.mobileFirst - Mobile-first approach (default: false)
 * @param {number} props.transitionDuration - Transition duration in ms (default: 300)
 * @param {Function} props.onResponsiveChange - Callback when view changes
 * @param {Object} props.accessibility - Accessibility options
 * @param {boolean} props.accessibility.announceViewChanges - Announce view changes to screen readers (default: true)
 * @param {string} props.accessibility.viewChangeMessage - Custom message for view changes
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.breakpoints - Custom breakpoints
 * @param {number} props.breakpoints.mobile - Mobile breakpoint (default: 768)
 * @param {number} props.breakpoints.tablet - Tablet breakpoint (default: 1024)
 */
const AdminResponsiveContainer = ({
  children,
  cardComponent,
  data = [],
  loading = false,
  empty = false,
  breakpoint = 768,
  useCSSOnly = false,
  autoGenerateCards = false,
  mobileFirst = false,
  transitionDuration = 300,
  onResponsiveChange,
  accessibility = {},
  className = '',
  breakpoints: customBreakpoints = {},
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const containerRef = useRef(null);
  const previousViewRef = useRef(null);
  const resizeObserverRef = useRef(null);
  // Performance optimization: Debounce resize events
  const debounceTimeout = useRef(null);
  
  // Performance optimization: Intersection Observer for lazy loading
  const intersectionObserver = useRef(null);

  // Merge default accessibility options with custom ones
  const accessibilityOptions = useMemo(() => ({
    announceViewChanges: true,
    viewChangeMessage: 'View changed to {view}',
    ...accessibility
  }), [accessibility]);

  // Merge default breakpoints with custom ones
  const breakpoints = useMemo(() => ({
    mobile: 768,
    tablet: 1024,
    ...customBreakpoints
  }), [customBreakpoints]);

  // Use the specified breakpoint or mobile breakpoint from breakpoints
  const effectiveBreakpoint = breakpoint || breakpoints.mobile;
  
  // Performance optimization: Detect large datasets
  const isLargeDataset = data && data.length > 100;

  // Auto-generate card component if needed
  const generatedCardComponent = useMemo(() => {
    if (cardComponent || !autoGenerateCards || !data || data.length === 0) {
      return cardComponent;
    }

    // Simple auto-generated card component
    return (
      <div className="admin-auto-generated-cards">
        {data.map((item, index) => (
          <div 
            key={item.id || item.MaMonAn || item.MaDanhMuc || item.MaLoaiMonAn || index}
            className="admin-auto-card"
            style={{
              animationDelay: `${index * 0.1}s`
            }}
          >
            <div className="admin-auto-card-content">
              {Object.entries(item).map(([key, value]) => (
                <div key={key} className="admin-auto-card-field">
                  <span className="admin-auto-card-label">{key}:</span>
                  <span className="admin-auto-card-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }, [cardComponent, autoGenerateCards, data]);

  // Enhanced viewport detection with ResizeObserver fallback
  const checkViewport = useCallback(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      const newIsMobile = width < effectiveBreakpoint;
      const newIsTablet = width >= effectiveBreakpoint && width < breakpoints.tablet;
      
      // Only trigger view change if actual change occurs
      if (newIsMobile !== isMobile || newIsTablet !== isTablet) {
        setIsTransitioning(true);
        
        // Clear transition timeout
        if (previousViewRef.current) {
          clearTimeout(previousViewRef.current);
        }
        
        // Set new view after a brief delay for smooth transition
        previousViewRef.current = setTimeout(() => {
          const previousMobile = isMobile;
          setIsMobile(newIsMobile);
          setIsTablet(newIsTablet);
          setIsTransitioning(false);
          
          // Determine view type for callback
          let newViewType = 'table';
          if (newIsMobile) {
            newViewType = 'card';
          } else if (newIsTablet && mobileFirst) {
            newViewType = 'card';
          }
          
          // Notify parent of view change
          if (onResponsiveChange) {
            onResponsiveChange({
              isMobile: newIsMobile,
              isTablet: newIsTablet,
              width,
              height: containerRef.current.getBoundingClientRect().height,
              view: newViewType,
              breakpoint: effectiveBreakpoint,
              previousView: previousMobile ? 'card' : 'table'
            });
          }

          // Announce view change to screen readers
          if (accessibilityOptions.announceViewChanges && newIsMobile !== previousMobile) {
            const message = accessibilityOptions.viewChangeMessage
              .replace('{view}', newIsMobile ? 'mobile card view' : 'desktop table view');
            
            // Create a live region for screen reader announcements
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.textContent = message;
            document.body.appendChild(announcement);
            
            setTimeout(() => {
              document.body.removeChild(announcement);
            }, 1000);
          }
        }, transitionDuration / 3); // Shorter delay for better UX
      }
    }
  }, [effectiveBreakpoint, breakpoints.tablet, isMobile, isTablet, mobileFirst, onResponsiveChange, accessibilityOptions, transitionDuration]);
  // Performance optimization: Memoized viewport check with debouncing
  const debouncedViewportCheck = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      checkViewport();
    }, 16); // ~60fps throttling
  }, [checkViewport]);


  // Setup ResizeObserver with fallback
  useEffect(() => {
    const setupResizeObserver = () => {
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          debouncedViewportCheck();
        });
        resizeObserverRef.current.observe(containerRef.current);
      } else {
        // Fallback to window resize listener with debouncing
        const handleResize = () => {
          debouncedViewportCheck();
        };
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
      }
    };

    const cleanup = setupResizeObserver();

    // Initial check
    checkViewport();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (previousViewRef.current) {
        clearTimeout(previousViewRef.current);
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect();
      }
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [checkViewport]);

  // CSS-only mode - use media queries instead of JavaScript
  if (useCSSOnly) {
    return (
      <div 
        className={`admin-responsive-container admin-responsive-css-only ${className}`}
        role="region"
        aria-label="Responsive admin content"
      >
        <div className="responsive-content">
          {/* Table view - hidden on mobile */}
          <div className="table-view admin-table-hide-on-mobile">
            {children}
          </div>
          
          {/* Card view - hidden on desktop */}
          <div className="card-view admin-table-show-on-mobile">
            {generatedCardComponent || cardComponent}
          </div>
        </div>
      </div>
    );
  }

  // JavaScript mode with enhanced transitions and accessibility
  const renderContent = () => {
    const activeView = isMobile ? 'card' : 'table';
    const effectiveCardComponent = generatedCardComponent || cardComponent;
    
    return (
      <div 
        ref={containerRef}
        className={`admin-responsive-container ${isTransitioning ? 'transitioning' : ''} ${className}`}
        data-large-dataset={isLargeDataset}
        role="region"
        aria-label={`Admin content view: ${activeView}`}
        aria-live={accessibilityOptions.announceViewChanges ? 'polite' : undefined}
        style={{
          '--transition-duration': `${transitionDuration}ms`
        }}
      >
        {/* Loading overlay with enhanced accessibility */}
        {loading && (
          <div className="loading-overlay" aria-live="polite" aria-busy="true">
            <div className="loading-spinner" aria-hidden="true" />
            <span className="loading-text">Loading content...</span>
          </div>
        )}
        
        {/* Enhanced empty state */}
        {empty && !loading && (
          <div className="empty-state" role="alert" aria-live="polite">
            <div className="empty-icon" aria-hidden="true">📊</div>
            <h3 className="empty-title">No Data Available</h3>
            <p className="empty-message">
              {isMobile 
                ? 'No items to display in card view'
                : 'No items to display in table view'
              }
            </p>
          </div>
        )}
        
        {/* Enhanced content area with transitions */}
        <div 
          className={`content-area ${isTransitioning ? 'fade-out' : 'fade-in'}`}
          aria-hidden={isTransitioning}
        >
          {/* Table view - desktop */}
          <div 
            className={`table-wrapper ${!isMobile ? 'active' : 'hidden'} admin-table-hide-on-mobile`}
            role="tabpanel"
            aria-labelledby="table-view-tab"
            aria-hidden={isMobile}
          >
            {children}
          </div>
          
          {/* Card view - mobile */}
          <div 
            className={`card-wrapper ${isMobile ? 'active' : 'hidden'} admin-table-show-on-mobile`}
            role="tabpanel"
            aria-labelledby="card-view-tab"
            aria-hidden={!isMobile}
          >
            {effectiveCardComponent}
          </div>
        </div>
        
        {/* Enhanced view indicators for accessibility */}
        <div className="view-indicators" role="tablist" aria-label="View options">
          <button
            type="button"
            className={`indicator ${!isMobile ? 'active' : ''}`}
            onClick={() => {
              if (!isMobile) return;
              setIsTransitioning(true);
              previousViewRef.current = setTimeout(() => {
                setIsMobile(false);
                setIsTransitioning(false);
                if (onResponsiveChange) {
                  onResponsiveChange({
                    isMobile: false,
                    view: 'table',
                    manual: true
                  });
                }
              }, transitionDuration / 3);
            }}
            role="tab"
            aria-selected={!isMobile}
            aria-controls="table-view"
            id="table-view-tab"
            disabled={!isMobile}
          >
            <span className="indicator-icon" aria-hidden="true">📊</span>
            <span className="indicator-label">Table View</span>
          </button>
          
          <button
            type="button"
            className={`indicator ${isMobile ? 'active' : ''}`}
            onClick={() => {
              if (isMobile) return;
              setIsTransitioning(true);
              previousViewRef.current = setTimeout(() => {
                setIsMobile(true);
                setIsTransitioning(false);
                if (onResponsiveChange) {
                  onResponsiveChange({
                    isMobile: true,
                    view: 'card',
                    manual: true
                  });
                }
              }, transitionDuration / 3);
            }}
            role="tab"
            aria-selected={isMobile}
            aria-controls="card-view"
            id="card-view-tab"
            disabled={isMobile}
          >
            <span className="indicator-icon" aria-hidden="true">📱</span>
            <span className="indicator-label">Card View</span>
          </button>
        </div>
      </div>
    );
  };

  return renderContent();
};

export default AdminResponsiveContainer;