import React from 'react';
import { motion } from 'framer-motion';
import Skeleton from '../Skeleton';
import { cn } from '../../lib/utils';

interface MetricCardSkeletonProps {
  className?: string;
  animate?: boolean;
  showSparkline?: boolean;
}

const MetricCardSkeleton: React.FC<MetricCardSkeletonProps> = ({
  className = '',
  animate = true,
  showSparkline = true,
}) => {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6',
        'bg-card/50 backdrop-blur-sm border border-border/50',
        'shadow-xl',
        className
      )}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? { duration: 0.3, ease: 'easeOut' } : undefined}
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <Skeleton variant='rounded' className='w-8 h-8' animate={animate} />
          <Skeleton className='h-4 w-24' animate={animate} />
        </div>
        {showSparkline && <Skeleton className='w-16 h-6' animate={animate} />}
      </div>

      {/* Value and delta */}
      <div className='flex items-end justify-between'>
        <div className='flex-1'>
          <Skeleton className='h-8 w-20 mb-2' animate={animate} />
          <Skeleton variant='rounded' className='h-6 w-16' animate={animate} />
        </div>
      </div>

      {/* Glassmorphism overlay */}
      <div className='absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-2xl' />
    </motion.div>
  );
};

export default MetricCardSkeleton;
