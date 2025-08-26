import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
  variant?: 'default' | 'rounded' | 'circular';
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  animate = true,
  variant = 'default',
  width,
  height,
}) => {
  const baseClasses = 'bg-muted/50';

  const variantClasses = {
    default: 'rounded',
    rounded: 'rounded-lg',
    circular: 'rounded-full',
  };

  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && {
      height: typeof height === 'number' ? `${height}px` : height,
    }),
  };

  if (animate) {
    return (
      <motion.div
        className={cn(baseClasses, variantClasses[variant], className)}
        style={style}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        'animate-pulse',
        className
      )}
      style={style}
    />
  );
};

// Skeleton variants for common use cases
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  animate?: boolean;
}> = ({ lines = 1, className = '', animate = true }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn('h-4', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        animate={animate}
      />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}> = ({ size = 'md', className = '', animate = true }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <Skeleton
      variant='circular'
      className={cn(sizeClasses[size], className)}
      animate={animate}
    />
  );
};

export const SkeletonButton: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}> = ({ size = 'md', className = '', animate = true }) => {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };

  return (
    <Skeleton
      variant='rounded'
      className={cn(sizeClasses[size], className)}
      animate={animate}
    />
  );
};

export const SkeletonCard: React.FC<{
  className?: string;
  animate?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}> = ({
  className = '',
  animate = true,
  showHeader = true,
  showFooter = false,
}) => (
  <div className={cn('p-6 space-y-4 bg-card rounded-2xl border', className)}>
    {showHeader && (
      <div className='flex items-center space-x-4'>
        <SkeletonAvatar size='md' animate={animate} />
        <div className='space-y-2 flex-1'>
          <Skeleton className='h-4 w-1/4' animate={animate} />
          <Skeleton className='h-3 w-1/2' animate={animate} />
        </div>
      </div>
    )}
    <div className='space-y-2'>
      <Skeleton className='h-4 w-full' animate={animate} />
      <Skeleton className='h-4 w-full' animate={animate} />
      <Skeleton className='h-4 w-3/4' animate={animate} />
    </div>
    {showFooter && (
      <div className='flex justify-between items-center pt-4'>
        <Skeleton className='h-8 w-20' animate={animate} />
        <Skeleton className='h-8 w-16' animate={animate} />
      </div>
    )}
  </div>
);

export default Skeleton;
