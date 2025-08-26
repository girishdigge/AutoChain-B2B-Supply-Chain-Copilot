import React from 'react';
import { motion } from 'framer-motion';
import Skeleton from '../Skeleton';
import { cn } from '../../lib/utils';

interface WorkflowStepperSkeletonProps {
  steps?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  animate?: boolean;
}

const WorkflowStepperSkeleton: React.FC<WorkflowStepperSkeletonProps> = ({
  steps = 6,
  orientation = 'horizontal',
  className = '',
  animate = true,
}) => {
  if (orientation === 'vertical') {
    return (
      <motion.div
        className={cn('space-y-4', className)}
        initial={animate ? { opacity: 0, x: -20 } : undefined}
        animate={animate ? { opacity: 1, x: 0 } : undefined}
        transition={animate ? { duration: 0.3 } : undefined}
      >
        {Array.from({ length: steps }).map((_, index) => (
          <motion.div
            key={index}
            className='flex items-start gap-4'
            initial={animate ? { opacity: 0, y: 20 } : undefined}
            animate={animate ? { opacity: 1, y: 0 } : undefined}
            transition={
              animate ? { duration: 0.3, delay: index * 0.1 } : undefined
            }
          >
            {/* Step indicator */}
            <div className='flex flex-col items-center'>
              <Skeleton
                variant='circular'
                className='w-8 h-8'
                animate={animate}
              />
              {index < steps - 1 && (
                <div className='w-px h-12 bg-border/30 mt-2' />
              )}
            </div>

            {/* Step content */}
            <div className='flex-1 pb-8'>
              <div className='bg-card rounded-2xl border border-border/50 p-4'>
                <div className='flex items-center justify-between mb-3'>
                  <Skeleton className='h-5 w-32' animate={animate} />
                  <Skeleton
                    variant='rounded'
                    className='h-6 w-20'
                    animate={animate}
                  />
                </div>
                <div className='space-y-2'>
                  <Skeleton className='h-3 w-full' animate={animate} />
                  <Skeleton className='h-3 w-3/4' animate={animate} />
                </div>
                <div className='flex items-center justify-between mt-4'>
                  <Skeleton className='h-3 w-24' animate={animate} />
                  <Skeleton
                    variant='rounded'
                    className='h-6 w-16'
                    animate={animate}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        'bg-card rounded-2xl border border-border/50 p-6',
        className
      )}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? { duration: 0.3 } : undefined}
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <Skeleton className='h-6 w-48 mb-2' animate={animate} />
          <Skeleton className='h-4 w-32' animate={animate} />
        </div>
        <div className='flex items-center gap-2'>
          <Skeleton variant='rounded' className='h-8 w-20' animate={animate} />
          <Skeleton variant='rounded' className='h-8 w-8' animate={animate} />
        </div>
      </div>

      {/* Progress bar */}
      <div className='mb-8'>
        <div className='flex items-center justify-between mb-2'>
          <Skeleton className='h-4 w-24' animate={animate} />
          <Skeleton className='h-4 w-16' animate={animate} />
        </div>
        <div className='w-full bg-muted/30 rounded-full h-2'>
          <motion.div
            className='bg-primary/30 h-2 rounded-full'
            initial={animate ? { width: 0 } : { width: '45%' }}
            animate={animate ? { width: '45%' } : undefined}
            transition={animate ? { duration: 1, delay: 0.5 } : undefined}
          />
        </div>
      </div>

      {/* Steps */}
      <div className='flex items-center justify-between relative'>
        {/* Connection line */}
        <div className='absolute top-4 left-4 right-4 h-px bg-border/30' />

        {Array.from({ length: steps }).map((_, index) => (
          <motion.div
            key={index}
            className='flex flex-col items-center relative z-10'
            initial={animate ? { opacity: 0, scale: 0.8 } : undefined}
            animate={animate ? { opacity: 1, scale: 1 } : undefined}
            transition={
              animate ? { duration: 0.3, delay: index * 0.1 } : undefined
            }
          >
            {/* Step circle */}
            <div className='bg-background border-2 border-border/50 rounded-full p-1'>
              <Skeleton
                variant='circular'
                className='w-6 h-6'
                animate={animate}
              />
            </div>

            {/* Step label */}
            <div className='mt-3 text-center'>
              <Skeleton className='h-3 w-16 mb-1' animate={animate} />
              <Skeleton className='h-2 w-12' animate={animate} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Current step details */}
      <div className='mt-8 p-4 bg-muted/20 rounded-lg'>
        <div className='flex items-center gap-3 mb-3'>
          <Skeleton variant='circular' className='w-6 h-6' animate={animate} />
          <Skeleton className='h-5 w-40' animate={animate} />
        </div>
        <div className='space-y-2'>
          <Skeleton className='h-3 w-full' animate={animate} />
          <Skeleton className='h-3 w-2/3' animate={animate} />
        </div>
      </div>
    </motion.div>
  );
};

export default WorkflowStepperSkeleton;
