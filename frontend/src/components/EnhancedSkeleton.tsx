/**
 * Enhanced Skeleton Loading Components
 *
 * Provides sophisticated loading states with shimmer effects
 * and realistic content placeholders.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn, loadingStates, motionVariants } from '../lib/styling';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'shimmer' | 'pulse';
  children?: React.ReactNode;
}

// Base Skeleton component
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'shimmer',
  children,
}) => {
  const baseClasses = 'rounded-md bg-muted';

  const variantClasses = {
    default: loadingStates.skeleton,
    shimmer: loadingStates.shimmer,
    pulse: 'animate-pulse bg-muted',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      role='status'
      aria-label='Loading content'
    >
      {children}
    </div>
  );
};

// Card Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <motion.div
    className={cn(
      'p-6 rounded-2xl border bg-card/50 backdrop-blur-sm',
      className
    )}
    variants={motionVariants.slideUp}
    initial='initial'
    animate='animate'
  >
    <div className='flex items-center justify-between mb-4'>
      <div className='flex items-center gap-3'>
        <Skeleton className='w-10 h-10 rounded-lg' />
        <Skeleton className='w-24 h-4' />
      </div>
      <Skeleton className='w-16 h-6' />
    </div>

    <Skeleton className='w-20 h-8 mb-2' />
    <Skeleton className='w-16 h-4' />
  </motion.div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{
  columns: number;
  className?: string;
}> = ({ columns, className }) => (
  <motion.tr
    className={cn('border-b border-border/20', className)}
    variants={motionVariants.slideUp}
    initial='initial'
    animate='animate'
  >
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className='px-4 py-3'>
        <Skeleton
          className={cn(
            'h-4',
            index === 0 ? 'w-24' : index === columns - 1 ? 'w-16' : 'w-32'
          )}
        />
      </td>
    ))}
  </motion.tr>
);

// Table Skeleton
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 6, className }) => (
  <div className={cn('rounded-2xl border bg-card overflow-hidden', className)}>
    {/* Header Skeleton */}
    <div className='border-b border-border/30 bg-muted/20'>
      <div className='flex'>
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className='flex-1 px-4 py-3'>
            <Skeleton className='h-4 w-20' />
          </div>
        ))}
      </div>
    </div>

    {/* Rows Skeleton */}
    <div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          className='flex border-b border-border/20 last:border-b-0'
          variants={motionVariants.slideUp}
          initial='initial'
          animate='animate'
          transition={{ delay: rowIndex * 0.1 }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className='flex-1 px-4 py-3'>
              <Skeleton
                className={cn(
                  'h-4',
                  colIndex === 0
                    ? 'w-24'
                    : colIndex === 1
                    ? 'w-32'
                    : colIndex === columns - 1
                    ? 'w-16'
                    : 'w-28'
                )}
              />
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  </div>
);

// Chart Skeleton
export const ChartSkeleton: React.FC<{
  type?: 'line' | 'bar';
  className?: string;
}> = ({ type = 'line', className }) => (
  <motion.div
    className={cn('p-4 rounded-2xl border bg-card', className)}
    variants={motionVariants.slideUp}
    initial='initial'
    animate='animate'
  >
    <div className='flex items-center justify-between mb-4'>
      <Skeleton className='w-32 h-5' />
      <Skeleton className='w-20 h-4' />
    </div>

    <div className='h-48 flex items-end justify-between gap-2'>
      {type === 'bar' ? (
        // Bar chart skeleton
        Array.from({ length: 8 }).map((_, index) => (
          <motion.div
            key={index}
            className='flex-1 bg-gradient-to-t from-primary/20 to-primary/5 rounded-t'
            style={{ height: `${Math.random() * 80 + 20}%` }}
            variants={motionVariants.slideUp}
            initial='initial'
            animate='animate'
            transition={{ delay: index * 0.1 }}
          />
        ))
      ) : (
        // Line chart skeleton
        <div className='w-full h-full relative'>
          <svg className='w-full h-full'>
            <motion.path
              d='M 0 40 Q 50 20 100 30 T 200 25 T 300 35 T 400 20'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              className='text-primary/30'
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          </svg>
        </div>
      )}
    </div>
  </motion.div>
);

// Workflow Step Skeleton
export const WorkflowStepSkeleton: React.FC<{
  steps?: number;
  className?: string;
}> = ({ steps = 5, className }) => (
  <motion.div
    className={cn('space-y-4', className)}
    variants={motionVariants.staggerContainer}
    initial='initial'
    animate='animate'
  >
    {Array.from({ length: steps }).map((_, index) => (
      <motion.div
        key={index}
        className='flex items-center gap-4 p-4 rounded-2xl border bg-card/50'
        variants={motionVariants.slideUp}
      >
        <Skeleton className='w-8 h-8 rounded-full' />
        <div className='flex-1'>
          <Skeleton className='w-32 h-5 mb-2' />
          <Skeleton className='w-48 h-3' />
        </div>
        <Skeleton className='w-16 h-6 rounded-full' />
      </motion.div>
    ))}
  </motion.div>
);

// Dashboard Skeleton
export const DashboardSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <motion.div
    className={cn('p-6 space-y-8', className)}
    variants={motionVariants.staggerContainer}
    initial='initial'
    animate='animate'
  >
    {/* Header Skeleton */}
    <motion.div variants={motionVariants.slideUp}>
      <Skeleton className='w-64 h-8 mb-2' />
      <Skeleton className='w-96 h-4' />
    </motion.div>

    {/* KPI Cards Skeleton */}
    <motion.div
      className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
      variants={motionVariants.staggerContainer}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </motion.div>

    {/* Charts Skeleton */}
    <motion.div
      className='grid grid-cols-1 lg:grid-cols-2 gap-6'
      variants={motionVariants.staggerContainer}
    >
      <ChartSkeleton type='line' />
      <ChartSkeleton type='bar' />
    </motion.div>

    {/* Table Skeleton */}
    <motion.div variants={motionVariants.slideUp}>
      <Skeleton className='w-48 h-6 mb-4' />
      <TableSkeleton />
    </motion.div>
  </motion.div>
);

// Loading Spinner with enhanced animations
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <motion.div
      className={cn('relative', sizeClasses[size], className)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <div className='absolute inset-0 rounded-full border-2 border-muted' />
      <div className='absolute inset-0 rounded-full border-2 border-primary border-t-transparent' />
    </motion.div>
  );
};

// Shimmer Effect Component
export const ShimmerEffect: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <div className={cn('relative overflow-hidden', className)}>
    {children}
    <motion.div
      className='absolute inset-0 bg-gradient-shimmer'
      animate={{ x: ['-100%', '100%'] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  </div>
);

export default {
  Skeleton,
  CardSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  ChartSkeleton,
  WorkflowStepSkeleton,
  DashboardSkeleton,
  LoadingSpinner,
  ShimmerEffect,
};
