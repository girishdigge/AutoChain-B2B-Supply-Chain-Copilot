import React from 'react';
import { motion } from 'framer-motion';
import Skeleton from '../Skeleton';
import { cn } from '../../lib/utils';

interface DataTableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  animate?: boolean;
  showToolbar?: boolean;
  showPagination?: boolean;
}

const DataTableSkeleton: React.FC<DataTableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = '',
  animate = true,
  showToolbar = true,
  showPagination = true,
}) => {
  return (
    <motion.div
      className={cn(
        'bg-card rounded-2xl border border-border/50 overflow-hidden',
        className
      )}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? { duration: 0.3 } : undefined}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className='p-6 border-b border-border/50'>
          <div className='flex items-center justify-between gap-4'>
            <Skeleton className='h-10 w-64' animate={animate} />
            <div className='flex items-center gap-2'>
              <Skeleton
                variant='rounded'
                className='h-8 w-20'
                animate={animate}
              />
              <Skeleton
                variant='rounded'
                className='h-8 w-16'
                animate={animate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className='border-b border-border/50'>
        <div className='flex items-center px-6 py-4'>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className='flex-1 px-2'>
              <Skeleton className='h-4 w-20' animate={animate} />
            </div>
          ))}
        </div>
      </div>

      {/* Table Rows */}
      <div className='divide-y divide-border/30'>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <motion.div
            key={rowIndex}
            className='flex items-center px-6 py-4'
            initial={animate ? { opacity: 0, x: -20 } : undefined}
            animate={animate ? { opacity: 1, x: 0 } : undefined}
            transition={
              animate ? { duration: 0.3, delay: rowIndex * 0.1 } : undefined
            }
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className='flex-1 px-2'>
                {colIndex === 0 ? (
                  <div className='flex items-center gap-3'>
                    <Skeleton
                      variant='circular'
                      className='w-8 h-8'
                      animate={animate}
                    />
                    <Skeleton className='h-4 w-24' animate={animate} />
                  </div>
                ) : colIndex === columns - 1 ? (
                  <div className='flex items-center gap-2'>
                    <Skeleton
                      variant='rounded'
                      className='h-6 w-16'
                      animate={animate}
                    />
                    <Skeleton
                      variant='rounded'
                      className='h-6 w-6'
                      animate={animate}
                    />
                  </div>
                ) : (
                  <Skeleton
                    className={cn('h-4', colIndex === 1 ? 'w-32' : 'w-20')}
                    animate={animate}
                  />
                )}
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className='flex items-center justify-between px-6 py-4 border-t border-border/50'>
          <Skeleton className='h-4 w-40' animate={animate} />
          <div className='flex items-center gap-2'>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                variant='rounded'
                className='h-8 w-8'
                animate={animate}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DataTableSkeleton;
