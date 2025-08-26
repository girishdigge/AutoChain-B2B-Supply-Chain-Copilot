import React from 'react';
import { motion } from 'framer-motion';
import Skeleton from '../Skeleton';
import MetricCardSkeleton from './MetricCardSkeleton';
import DataTableSkeleton from './DataTableSkeleton';
import ChartSkeleton from './ChartSkeleton';
import { cn } from '../../lib/utils';

interface PageSkeletonProps {
  type: 'dashboard' | 'orders' | 'workflow' | 'blockchain';
  className?: string;
  animate?: boolean;
}

const PageSkeleton: React.FC<PageSkeletonProps> = ({
  type,
  className = '',
  animate = true,
}) => {
  const renderDashboardSkeleton = () => (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <Skeleton className='h-8 w-48 mb-2' animate={animate} />
          <Skeleton className='h-4 w-64' animate={animate} />
        </div>
        <div className='flex items-center gap-3'>
          <Skeleton variant='rounded' className='h-10 w-24' animate={animate} />
          <Skeleton variant='rounded' className='h-10 w-32' animate={animate} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} animate={animate} />
        ))}
      </div>

      {/* Charts Row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <ChartSkeleton type='line' animate={animate} />
        <ChartSkeleton type='bar' animate={animate} />
      </div>

      {/* Recent Orders Table */}
      <div>
        <Skeleton className='h-6 w-32 mb-4' animate={animate} />
        <DataTableSkeleton rows={5} animate={animate} />
      </div>
    </div>
  );

  const renderOrdersSkeleton = () => (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <Skeleton className='h-8 w-48 mb-2' animate={animate} />
          <Skeleton className='h-4 w-64' animate={animate} />
        </div>
        <div className='flex items-center gap-3'>
          <Skeleton variant='rounded' className='h-10 w-24' animate={animate} />
          <Skeleton variant='rounded' className='h-10 w-32' animate={animate} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className='p-4 rounded-2xl border bg-gradient-to-br from-blue-500/10 to-purple-500/10'
          >
            <Skeleton className='h-6 w-12 mb-2' animate={animate} />
            <Skeleton className='h-4 w-16' animate={animate} />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className='flex items-center gap-4'>
        <Skeleton className='h-4 w-16' animate={animate} />
        <Skeleton variant='rounded' className='h-10 w-48' animate={animate} />
        <Skeleton variant='rounded' className='h-8 w-24' animate={animate} />
      </div>

      {/* Orders Table */}
      <DataTableSkeleton rows={8} columns={8} animate={animate} />
    </div>
  );

  const renderWorkflowSkeleton = () => (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <Skeleton className='h-8 w-48 mb-2' animate={animate} />
          <Skeleton className='h-4 w-64' animate={animate} />
        </div>
        <div className='flex items-center gap-3'>
          <Skeleton variant='circular' className='w-8 h-8' animate={animate} />
          <Skeleton variant='rounded' className='h-8 w-20' animate={animate} />
        </div>
      </div>

      {/* Workflow Progress */}
      <div className='bg-card rounded-2xl border border-border/50 p-6'>
        <div className='flex items-center justify-between mb-4'>
          <Skeleton className='h-5 w-32' animate={animate} />
          <Skeleton className='h-4 w-24' animate={animate} />
        </div>
        <div className='w-full bg-muted/30 rounded-full h-2 mb-4'>
          <motion.div
            className='bg-primary/30 h-2 rounded-full'
            initial={animate ? { width: 0 } : { width: '60%' }}
            animate={animate ? { width: '60%' } : undefined}
            transition={animate ? { duration: 1, delay: 0.5 } : undefined}
          />
        </div>
        <div className='flex items-center justify-between text-sm'>
          <Skeleton className='h-3 w-20' animate={animate} />
          <Skeleton className='h-3 w-16' animate={animate} />
        </div>
      </div>

      {/* Workflow Steps */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Steps */}
        <div className='space-y-4'>
          <Skeleton className='h-5 w-24 mb-4' animate={animate} />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center gap-4 p-4 bg-card rounded-lg border'
            >
              <Skeleton
                variant='circular'
                className='w-8 h-8'
                animate={animate}
              />
              <div className='flex-1'>
                <Skeleton className='h-4 w-32 mb-2' animate={animate} />
                <Skeleton className='h-3 w-48' animate={animate} />
              </div>
              <Skeleton
                variant='rounded'
                className='h-6 w-16'
                animate={animate}
              />
            </div>
          ))}
        </div>

        {/* Log Stream */}
        <div>
          <Skeleton className='h-5 w-24 mb-4' animate={animate} />
          <div className='bg-card rounded-2xl border border-border/50 h-96'>
            <div className='p-4 border-b border-border/50'>
              <div className='flex items-center justify-between'>
                <Skeleton className='h-5 w-24' animate={animate} />
                <div className='flex items-center gap-2'>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      variant='rounded'
                      className='h-6 w-6'
                      animate={animate}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className='p-4 space-y-3'>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className='flex items-start gap-3'>
                  <Skeleton className='h-3 w-16' animate={animate} />
                  <Skeleton
                    variant='rounded'
                    className='h-5 w-12'
                    animate={animate}
                  />
                  <Skeleton className='h-3 flex-1' animate={animate} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBlockchainSkeleton = () => (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <Skeleton className='h-8 w-48 mb-2' animate={animate} />
          <Skeleton className='h-4 w-64' animate={animate} />
        </div>
        <div className='flex items-center gap-3'>
          <Skeleton variant='rounded' className='h-10 w-24' animate={animate} />
          <Skeleton variant='rounded' className='h-10 w-32' animate={animate} />
        </div>
      </div>

      {/* Network Status */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className='p-4 rounded-2xl border bg-gradient-to-br from-emerald-500/10 to-blue-500/10'
          >
            <div className='flex items-center gap-3 mb-2'>
              <Skeleton
                variant='circular'
                className='w-8 h-8'
                animate={animate}
              />
              <Skeleton className='h-5 w-24' animate={animate} />
            </div>
            <Skeleton className='h-6 w-16 mb-1' animate={animate} />
            <Skeleton className='h-3 w-20' animate={animate} />
          </div>
        ))}
      </div>

      {/* Transactions Table */}
      <DataTableSkeleton rows={10} columns={7} animate={animate} />
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'dashboard':
        return renderDashboardSkeleton();
      case 'orders':
        return renderOrdersSkeleton();
      case 'workflow':
        return renderWorkflowSkeleton();
      case 'blockchain':
        return renderBlockchainSkeleton();
      default:
        return renderDashboardSkeleton();
    }
  };

  return (
    <motion.div
      className={cn('p-6', className)}
      initial={animate ? { opacity: 0 } : undefined}
      animate={animate ? { opacity: 1 } : undefined}
      transition={animate ? { duration: 0.3 } : undefined}
    >
      {renderContent()}
    </motion.div>
  );
};

export default PageSkeleton;
