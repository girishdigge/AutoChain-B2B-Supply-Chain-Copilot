import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import WebSocketIndicator from './WebSocketIndicator';
import { cn } from '../lib/utils';

const Topbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { status } = useWebSocket();

  // Check if we're in mock mode from environment
  const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

  return (
    <header
      className='h-16 bg-card border-b border-border flex items-center justify-between px-6'
      role='banner'
      aria-label='Application header'
    >
      {/* Left side - could be used for breadcrumbs in the future */}
      <div className='flex items-center space-x-4'>
        {/* Placeholder for breadcrumbs or page title */}
      </div>

      {/* Right side - Status indicators and controls */}
      <div
        className='flex items-center space-x-4'
        role='toolbar'
        aria-label='Application controls'
      >
        {/* Mock Mode Badge */}
        {isMockMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className='px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-2xl text-sm font-medium'
            role='status'
            aria-label='Application is running in mock mode'
          >
            Mock Mode
          </motion.div>
        )}

        {/* WebSocket Status Indicator */}
        <WebSocketIndicator />

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className={cn(
            'p-2 rounded-2xl border transition-all duration-200',
            'hover:bg-accent hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20',
            'bg-background border-border'
          )}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
          type='button'
        >
          <motion.div
            initial={false}
            animate={{ rotate: theme === 'dark' ? 0 : 180 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {theme === 'dark' ? (
              <Sun className='h-4 w-4 text-foreground' />
            ) : (
              <Moon className='h-4 w-4 text-foreground' />
            )}
          </motion.div>
        </motion.button>
      </div>
    </header>
  );
};

export default Topbar;
