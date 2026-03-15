import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for detecting element resize using ResizeObserver API
 * Provides better performance than window resize events
 * 
 * @param {React.Ref} elementRef - Ref to the element to observe
 * @param {Function} callback - Callback function called on resize
 * @returns {Function} Cleanup function
 */
export const useResizeObserver = (elementRef, callback) => {
  const callbackRef = useRef(callback);
  const observerRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;

    // Check if ResizeObserver is supported
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observerRef.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry && callbackRef.current) {
          const { width } = entry.contentRect;
          callbackRef.current({ width, entry });
        }
      });

      const element = elementRef.current;
      if (element) {
        observerRef.current.observe(element);
      }
    }

    // Fallback for browsers without ResizeObserver
    else {
      const handleResize = () => {
        const element = elementRef.current;
        if (element) {
          const { width } = element.getBoundingClientRect();
          if (callbackRef.current) {
            callbackRef.current({ width, entry: null });
          }
        }
      };

      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      // Fallback cleanup
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [elementRef]);

  return () => {
    // Trigger initial measurement
    const element = elementRef.current;
    if (element && callbackRef.current) {
      const { width } = element.getBoundingClientRect();
      callbackRef.current({ width, entry: null });
    }
  };
};