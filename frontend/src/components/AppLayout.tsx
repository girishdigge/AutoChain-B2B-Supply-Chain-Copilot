import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import { ThemeProvider } from '../context/ThemeContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SkipLink from './SkipLink';
import AriaLiveRegion from './AriaLiveRegion';
import ClarificationDialog from './ClarificationDialog';
import { useClarificationManager } from '../hooks/useClarificationManager';

const AppLayoutContent: React.FC = () => {
  const { isCollapsed } = useSidebar();
  const [liveMessage, setLiveMessage] = useState('');
  const clarificationManager = useClarificationManager();

  // Make clarification manager globally available
  useEffect(() => {
    (window as any).clarificationManager = clarificationManager;
    return () => {
      delete (window as any).clarificationManager;
    };
  }, [clarificationManager]);

  return (
    <div className='min-h-screen bg-background flex'>
      {/* Skip Links */}
      <SkipLink href='#main-content'>Skip to main content</SkipLink>
      <SkipLink href='#navigation'>Skip to navigation</SkipLink>

      {/* Aria Live Region for dynamic updates */}
      <AriaLiveRegion message={liveMessage} />

      {/* Screen reader only heading for page structure */}
      <h1 className='sr-only'>Portia AI Supply Chain Management</h1>
      {/* Sidebar */}
      <AnimatePresence mode='wait'>
        <motion.div
          key={isCollapsed ? 'collapsed' : 'expanded'}
          initial={{ width: isCollapsed ? 240 : 64 }}
          animate={{ width: isCollapsed ? 64 : 240 }}
          exit={{ width: isCollapsed ? 240 : 64 }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
          }}
          className='flex-shrink-0'
        >
          <Sidebar />
        </motion.div>
      </AnimatePresence>

      {/* Main Content Area */}
      <div className='flex-1 flex flex-col min-w-0'>
        {/* Topbar */}
        <Topbar />

        {/* Page Content */}
        <motion.main
          id='main-content'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
          }}
          className='flex-1 overflow-auto'
          role='main'
          aria-label='Main content area'
          tabIndex={-1}
        >
          <div className='container mx-auto px-6 py-6'>
            <Outlet />
          </div>
        </motion.main>
      </div>

      {/* Clarification Dialog */}
      <ClarificationDialog
        isOpen={clarificationManager.isDialogOpen}
        onClose={clarificationManager.closeClarification}
        clarificationRequest={clarificationManager.currentRequest}
      />
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <ThemeProvider defaultTheme='dark'>
      <WebSocketProvider>
        <SidebarProvider>
          <AppLayoutContent />
        </SidebarProvider>
      </WebSocketProvider>
    </ThemeProvider>
  );
};

export default AppLayout;
