import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn, motionVariants } from '../lib/styling';

export type StatusType =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'active'
  | 'waiting'
  | 'skipped';

export interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
  animate?: boolean;
  showIcon?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = React.memo(
  ({
    status,
    size = 'md',
    showGlow = true,
    animate = true,
    showIcon = true,
    className = '',
  }) => {
    const getStatusConfig = (status: StatusType) => {
      const configs = {
        pending: {
          label: 'Pending',
          colors: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
          glowColors: 'shadow-amber-500/25',
          icon: Clock,
        },
        processing: {
          label: 'Processing',
          colors: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
          glowColors: 'shadow-blue-500/25',
          icon: Loader2,
        },
        active: {
          label: 'Active',
          colors: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
          glowColors: 'shadow-purple-500/25',
          icon: Play,
        },
        completed: {
          label: 'Completed',
          colors: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
          glowColors: 'shadow-emerald-500/25',
          icon: CheckCircle,
        },
        failed: {
          label: 'Failed',
          colors: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
          glowColors: 'shadow-rose-500/25',
          icon: XCircle,
        },
        waiting: {
          label: 'Waiting',
          colors: 'text-slate-600 bg-slate-500/10 border-slate-500/20',
          glowColors: 'shadow-slate-500/25',
          icon: Clock,
        },
        skipped: {
          label: 'Skipped',
          colors: 'text-slate-500 bg-slate-400/10 border-slate-400/20',
          glowColors: 'shadow-slate-400/25',
          icon: AlertCircle,
        },
      };

      return configs[status] || configs.pending;
    };

    const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
      const sizes = {
        sm: {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          gap: 'gap-1',
        },
        md: {
          container: 'px-3 py-1.5 text-sm',
          icon: 'w-4 h-4',
          gap: 'gap-1.5',
        },
        lg: {
          container: 'px-4 py-2 text-base',
          icon: 'w-5 h-5',
          gap: 'gap-2',
        },
      };

      return sizes[size];
    };

    const config = getStatusConfig(status);
    const sizeClasses = getSizeClasses(size);
    const IconComponent = config.icon;

    const isAnimatedStatus = status === 'processing' || status === 'active';

    return (
      <motion.div
        className={cn(
          'inline-flex items-center font-medium rounded-full border relative',
          sizeClasses.container,
          sizeClasses.gap,
          config.colors,
          showGlow ? `shadow-lg ${config.glowColors}` : '',
          className
        )}
        variants={animate ? motionVariants.scaleIn : undefined}
        initial={animate ? 'initial' : undefined}
        animate={animate ? 'animate' : undefined}
        whileHover={
          animate
            ? {
                scale: 1.05,
                transition: { duration: 0.2 },
              }
            : undefined
        }
        role='status'
        aria-label={`Status: ${config.label}`}
        aria-live={isAnimatedStatus ? 'polite' : 'off'}
      >
        {showIcon && (
          <motion.div
            animate={
              isAnimatedStatus && animate
                ? {
                    rotate: status === 'processing' ? 360 : 0,
                  }
                : undefined
            }
            transition={
              isAnimatedStatus && animate
                ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  }
                : undefined
            }
            aria-hidden='true'
          >
            <IconComponent className={sizeClasses.icon} />
          </motion.div>
        )}

        <span>{config.label}</span>

        {/* Animated glow effect for active states */}
        {showGlow && isAnimatedStatus && (
          <motion.div
            className={`
            absolute inset-0 rounded-full
            ${config.colors.split(' ')[2]} // Extract background color
            opacity-20
          `}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;
