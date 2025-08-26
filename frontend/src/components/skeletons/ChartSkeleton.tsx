import React from 'react';
import { motion } from 'framer-motion';
import Skeleton from '../Skeleton';
import { cn } from '../../lib/utils';

interface ChartSkeletonProps {
  type?: 'line' | 'bar' | 'pie' | 'area';
  className?: string;
  animate?: boolean;
  showLegend?: boolean;
  showTitle?: boolean;
  height?: number;
}

const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  type = 'line',
  className = '',
  animate = true,
  showLegend = true,
  showTitle = true,
  height = 300,
}) => {
  const renderChartContent = () => {
    switch (type) {
      case 'line':
        return (
          <div className='relative w-full h-full'>
            {/* Y-axis labels */}
            <div className='absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between py-4'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-3 w-6' animate={animate} />
              ))}
            </div>

            {/* Chart area */}
            <div className='ml-10 mr-4 h-full relative'>
              {/* Grid lines */}
              <div className='absolute inset-0 flex flex-col justify-between'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className='h-px bg-border/30' />
                ))}
              </div>

              {/* Line path */}
              <svg className='absolute inset-0 w-full h-full'>
                <motion.path
                  d='M 0 80 Q 50 60 100 70 T 200 50 T 300 60 T 400 40'
                  stroke='currentColor'
                  strokeWidth='2'
                  fill='none'
                  className='text-primary/30'
                  initial={animate ? { pathLength: 0 } : undefined}
                  animate={animate ? { pathLength: 1 } : undefined}
                  transition={
                    animate ? { duration: 2, ease: 'easeInOut' } : undefined
                  }
                />
              </svg>
            </div>

            {/* X-axis labels */}
            <div className='ml-10 mr-4 flex justify-between pt-2'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className='h-3 w-8' animate={animate} />
              ))}
            </div>
          </div>
        );

      case 'bar':
        return (
          <div className='relative w-full h-full'>
            {/* Y-axis labels */}
            <div className='absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between py-4'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-3 w-6' animate={animate} />
              ))}
            </div>

            {/* Bars */}
            <div className='ml-10 mr-4 h-full flex items-end justify-between gap-2 pb-8'>
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className='bg-primary/20 rounded-t flex-1'
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                  initial={animate ? { scaleY: 0 } : undefined}
                  animate={animate ? { scaleY: 1 } : undefined}
                  transition={
                    animate
                      ? { duration: 0.5, delay: i * 0.1, ease: 'easeOut' }
                      : undefined
                  }
                />
              ))}
            </div>

            {/* X-axis labels */}
            <div className='ml-10 mr-4 flex justify-between'>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className='h-3 w-8' animate={animate} />
              ))}
            </div>
          </div>
        );

      case 'pie':
        return (
          <div className='flex items-center justify-center h-full'>
            <div className='relative'>
              <Skeleton
                variant='circular'
                className='w-48 h-48'
                animate={animate}
              />
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='w-20 h-20 bg-background rounded-full' />
              </div>
            </div>
          </div>
        );

      case 'area':
        return (
          <div className='relative w-full h-full'>
            {/* Y-axis labels */}
            <div className='absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between py-4'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-3 w-6' animate={animate} />
              ))}
            </div>

            {/* Chart area */}
            <div className='ml-10 mr-4 h-full relative'>
              {/* Area fill */}
              <motion.div
                className='absolute bottom-8 left-0 right-0 bg-gradient-to-t from-primary/20 to-transparent rounded-t'
                style={{ height: '60%' }}
                initial={animate ? { scaleY: 0 } : undefined}
                animate={animate ? { scaleY: 1 } : undefined}
                transition={
                  animate ? { duration: 1, ease: 'easeOut' } : undefined
                }
              />
            </div>

            {/* X-axis labels */}
            <div className='ml-10 mr-4 flex justify-between pt-2'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className='h-3 w-8' animate={animate} />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      className={cn(
        'bg-card rounded-2xl border border-border/50 p-6',
        className
      )}
      style={{ height }}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? { duration: 0.3 } : undefined}
    >
      {/* Title */}
      {showTitle && (
        <div className='mb-4'>
          <Skeleton className='h-6 w-48 mb-2' animate={animate} />
          <Skeleton className='h-4 w-32' animate={animate} />
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className='flex items-center gap-4 mb-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='flex items-center gap-2'>
              <Skeleton
                variant='circular'
                className='w-3 h-3'
                animate={animate}
              />
              <Skeleton className='h-3 w-16' animate={animate} />
            </div>
          ))}
        </div>
      )}

      {/* Chart content */}
      <div
        className='flex-1'
        style={{
          height: height - (showTitle ? 80 : 40) - (showLegend ? 40 : 0),
        }}
      >
        {renderChartContent()}
      </div>
    </motion.div>
  );
};

export default ChartSkeleton;
