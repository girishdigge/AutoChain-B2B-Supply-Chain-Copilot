/**
 * Enhanced Empty State Components
 *
 * Provides engaging empty states with animations and helpful messaging.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Search,
  Plus,
  FileText,
  Database,
  Workflow,
  Link,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn, motionVariants } from '../lib/styling';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  animated?: boolean;
}

// Base Empty State Component
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  animated = true,
}) => {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center text-center p-12',
        'bg-gradient-to-br from-muted/20 to-muted/5',
        'rounded-2xl border border-dashed border-muted-foreground/20',
        className
      )}
      variants={animated ? motionVariants.slideUp : undefined}
      initial={animated ? 'initial' : undefined}
      animate={animated ? 'animate' : undefined}
    >
      {/* Icon */}
      {icon && (
        <motion.div
          className='mb-6 p-4 rounded-2xl bg-muted/20 text-muted-foreground/60'
          variants={animated ? motionVariants.scaleIn : undefined}
          initial={animated ? 'initial' : undefined}
          animate={animated ? 'animate' : undefined}
          transition={animated ? { delay: 0.2 } : undefined}
        >
          {icon}
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        className='max-w-md'
        variants={animated ? motionVariants.slideUp : undefined}
        initial={animated ? 'initial' : undefined}
        animate={animated ? 'animate' : undefined}
        transition={animated ? { delay: 0.3 } : undefined}
      >
        <h3 className='text-lg font-semibold text-foreground mb-2'>{title}</h3>
        <p className='text-muted-foreground mb-6 leading-relaxed'>
          {description}
        </p>

        {/* Actions */}
        {(action || secondaryAction) && (
          <motion.div
            className='flex flex-col sm:flex-row gap-3 justify-center'
            variants={animated ? motionVariants.slideUp : undefined}
            initial={animated ? 'initial' : undefined}
            animate={animated ? 'animate' : undefined}
            transition={animated ? { delay: 0.4 } : undefined}
          >
            {action && (
              <Button
                onClick={action.onClick}
                variant={
                  (action.variant === 'primary' ? 'default' : action.variant) ||
                  'default'
                }
                className='min-w-[120px]'
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant='outline'
                className='min-w-[120px]'
              >
                {secondaryAction.label}
              </Button>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Specific Empty State Components

// No Orders Empty State
export const NoOrdersEmptyState: React.FC<{
  onCreateOrder?: () => void;
  className?: string;
}> = ({ onCreateOrder, className }) => (
  <EmptyState
    icon={<Package className='w-12 h-12' />}
    title='No Orders Found'
    description="You haven't created any orders yet. Start by creating your first order to begin tracking your supply chain operations."
    action={
      onCreateOrder
        ? {
            label: 'Create Order',
            onClick: onCreateOrder,
            variant: 'primary',
          }
        : undefined
    }
    className={className}
  />
);

// No Search Results Empty State
export const NoSearchResultsEmptyState: React.FC<{
  searchTerm: string;
  onClearSearch?: () => void;
  className?: string;
}> = ({ searchTerm, onClearSearch, className }) => (
  <EmptyState
    icon={<Search className='w-12 h-12' />}
    title='No Results Found'
    description={`No items match your search for "${searchTerm}". Try adjusting your search terms or filters.`}
    action={
      onClearSearch
        ? {
            label: 'Clear Search',
            onClick: onClearSearch,
            variant: 'outline',
          }
        : undefined
    }
    className={className}
  />
);

// No Workflow Empty State
export const NoWorkflowEmptyState: React.FC<{
  onViewOrders?: () => void;
  className?: string;
}> = ({ onViewOrders, className }) => (
  <EmptyState
    icon={<Workflow className='w-12 h-12' />}
    title='No Active Workflows'
    description='There are no workflow processes currently running. Start processing an order to see the workflow visualization here.'
    action={
      onViewOrders
        ? {
            label: 'View Orders',
            onClick: onViewOrders,
            variant: 'primary',
          }
        : undefined
    }
    className={className}
  />
);

// No Blockchain Transactions Empty State
export const NoBlockchainEmptyState: React.FC<{
  onRefresh?: () => void;
  className?: string;
}> = ({ onRefresh, className }) => (
  <EmptyState
    icon={<Link className='w-12 h-12' />}
    title='No Blockchain Transactions'
    description='No blockchain transactions have been recorded yet. Transactions will appear here once orders are processed and anchored to the blockchain.'
    action={
      onRefresh
        ? {
            label: 'Refresh',
            onClick: onRefresh,
            variant: 'outline',
          }
        : undefined
    }
    className={className}
  />
);

// Error State Component
export const ErrorState: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}> = ({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  onRetry,
  onGoBack,
  className,
}) => (
  <EmptyState
    icon={<AlertCircle className='w-12 h-12 text-destructive' />}
    title={title}
    description={description}
    action={
      onRetry
        ? {
            label: 'Try Again',
            onClick: onRetry,
            variant: 'primary',
          }
        : undefined
    }
    secondaryAction={
      onGoBack
        ? {
            label: 'Go Back',
            onClick: onGoBack,
          }
        : undefined
    }
    className={cn('border-destructive/20 bg-destructive/5', className)}
  />
);

// Loading State Component
export const LoadingState: React.FC<{
  title?: string;
  description?: string;
  className?: string;
}> = ({
  title = 'Loading...',
  description = 'Please wait while we fetch your data.',
  className,
}) => (
  <motion.div
    className={cn(
      'flex flex-col items-center justify-center text-center p-12',
      className
    )}
    variants={motionVariants.slideUp}
    initial='initial'
    animate='animate'
  >
    <motion.div
      className='mb-6'
      animate={{ rotate: 360 }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <RefreshCw className='w-12 h-12 text-primary' />
    </motion.div>

    <h3 className='text-lg font-semibold text-foreground mb-2'>{title}</h3>
    <p className='text-muted-foreground max-w-md'>{description}</p>
  </motion.div>
);

// Connection Error State
export const ConnectionErrorState: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <EmptyState
    icon={<AlertCircle className='w-12 h-12 text-amber-500' />}
    title='Connection Error'
    description='Unable to connect to the server. Please check your internet connection and try again.'
    action={
      onRetry
        ? {
            label: 'Retry Connection',
            onClick: onRetry,
            variant: 'primary',
          }
        : undefined
    }
    className={cn('border-amber-500/20 bg-amber-500/5', className)}
  />
);

// Maintenance State
export const MaintenanceState: React.FC<{
  estimatedTime?: string;
  className?: string;
}> = ({ estimatedTime, className }) => (
  <EmptyState
    icon={<AlertCircle className='w-12 h-12 text-blue-500' />}
    title='System Maintenance'
    description={`The system is currently undergoing maintenance. ${
      estimatedTime
        ? `Expected completion: ${estimatedTime}`
        : 'Please check back later.'
    }`}
    className={cn('border-blue-500/20 bg-blue-500/5', className)}
  />
);

// Coming Soon State
export const ComingSoonState: React.FC<{
  feature: string;
  description?: string;
  className?: string;
}> = ({ feature, description, className }) => (
  <EmptyState
    icon={<Plus className='w-12 h-12 text-purple-500' />}
    title={`${feature} Coming Soon`}
    description={
      description ||
      `We're working hard to bring you ${feature}. Stay tuned for updates!`
    }
    className={cn('border-purple-500/20 bg-purple-500/5', className)}
  />
);

export default {
  EmptyState,
  NoOrdersEmptyState,
  NoSearchResultsEmptyState,
  NoWorkflowEmptyState,
  NoBlockchainEmptyState,
  ErrorState,
  LoadingState,
  ConnectionErrorState,
  MaintenanceState,
  ComingSoonState,
};
