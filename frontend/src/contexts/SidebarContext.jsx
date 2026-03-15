import React, { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [screenSize, setScreenSize] = useState('desktop');

  // Detect screen size and adjust sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
        setIsOpen(false); // Auto-close on mobile
        setIsCollapsed(false);
      } else if (width < 1024) {
        setScreenSize('tablet');
        setIsOpen(true); // Keep open on tablet
        setIsCollapsed(true); // Auto-collapse on tablet
      } else {
        setScreenSize('desktop');
        setIsOpen(true); // Always open on desktop
        setIsCollapsed(false);
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (screenSize === 'mobile') {
      setIsOpen(!isOpen);
    } else if (screenSize === 'tablet') {
      setIsCollapsed(!isCollapsed);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const closeSidebar = () => {
    if (screenSize === 'mobile') {
      setIsOpen(false);
    }
  };

  const openSidebar = () => {
    setIsOpen(true);
  };

  const value = {
    isOpen,
    isCollapsed,
    screenSize,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    setIsCollapsed,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export default SidebarContext;