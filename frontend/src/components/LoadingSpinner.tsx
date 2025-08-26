import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  className?: string;
  text?: string;
  color?: 'primary' | 'secondary' | 'muted';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  className = '',
  text,
  color = 'primary',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    muted: 'text-muted-foreground',
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'spinner':
        return (
          <Loader2
            className={cn(
              'animate-spin',
              sizeClasses[size],
              colorClasses[color]
            )}
          />
        );

      case 'dots':
        return (
          <div className='flex items-center space-x-1'>
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  'rounded-full bg-current',
                  size === 'sm'
                    ? 'w-1 h-1'
                    : size === 'md'
                    ? 'w-2 h-2'
                    : size === 'lg'
                    ? 'w-3 h-3'
                    : 'w-4 h-4',
                  colorClasses[color]
                )}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <motion.div
            className={cn(
              'rounded-full bg-current',
              sizeClasses[size],
              colorClasses[color]
            )}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        );

      case 'bars':
        return (
          <div className='flex items-end space-x-1'>
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  'bg-current rounded-sm',
                  size === 'sm'
                    ? 'w-1'
                    : size === 'md'
                    ? 'w-1.5'
                    : size === 'lg'
                    ? 'w-2'
                    : 'w-3',
                  colorClasses[color]
                )}
                style={{
                  height:
                    size === 'sm'
                      ? '12px'
                      : size === 'md'
                      ? '20px'
                      : size === 'lg'
                      ? '32px'
                      : '48px',
                }}
                animate={{
                  scaleY: [1, 0.3, 1],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        );

      default:
        return (
          <div
            className={cn(
              'animate-spin rounded-full border-2 border-muted border-t-current',
              sizeClasses[size],
              colorClasses[color]
            )}
          />
        );
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className
      )}
    >
      {renderSpinner()}
      {text && (
        <motion.p
          className={cn('text-sm font-medium', colorClasses[color])}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;
