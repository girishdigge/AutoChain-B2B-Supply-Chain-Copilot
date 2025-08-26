import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { cn } from '../lib/utils';

interface WebSocketIndicatorProps {
  showDetails?: boolean;
  onClick?: () => void;
}

const WebSocketIndicator: React.FC<WebSocketIndicatorProps> = ({
  showDetails = false,
  onClick,
}) => {
  const { status } = useWebSocket();

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
          label: 'Connected',
          description: 'WebSocket connection active',
        };
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          label: 'Connecting',
          description: 'Establishing connection...',
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
          label: 'Disconnected',
          description: 'No active connection',
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Error',
          description: 'Connection failed',
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
          label: 'Unknown',
          description: 'Unknown status',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex items-center space-x-2 px-3 py-2 rounded-2xl border transition-all duration-200',
        config.bgColor,
        config.borderColor,
        onClick &&
          'cursor-pointer hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20'
      )}
      onClick={onClick}
      role={onClick ? 'button' : 'status'}
      aria-label={`WebSocket connection status: ${config.label}. ${config.description}`}
      aria-live='polite'
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className='relative'>
        <Icon
          className={cn(
            'h-4 w-4',
            config.color,
            status === 'connecting' && 'animate-spin'
          )}
        />

        {/* Pulse animation for connected state */}
        {status === 'connected' && (
          <motion.div
            className='absolute inset-0 rounded-full bg-emerald-500/20'
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>

      {showDetails && (
        <div className='flex flex-col'>
          <span className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </span>
          <span className='text-xs text-muted-foreground'>
            {config.description}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default WebSocketIndicator;
