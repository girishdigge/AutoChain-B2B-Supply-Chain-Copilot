import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  cn,
  createCardStyle,
  hoverEffects,
  motionVariants,
} from '../lib/styling';

export interface MetricCardProps {
  title: string;
  value: number | string;
  delta?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  sparklineData?: number[];
  icon?: React.ReactNode;
  gradient?: boolean;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = React.memo(
  ({
    title,
    value,
    delta,
    sparklineData,
    icon,
    gradient = true,
    className = '',
  }) => {
    const formatValue = (val: number | string): string => {
      if (typeof val === 'number') {
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        }
        if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}K`;
        }
        return val.toLocaleString();
      }
      return val;
    };

    const getDeltaColor = (
      type: 'increase' | 'decrease' | 'neutral'
    ): string => {
      switch (type) {
        case 'increase':
          return 'text-emerald-500 bg-emerald-500/10';
        case 'decrease':
          return 'text-rose-500 bg-rose-500/10';
        case 'neutral':
          return 'text-slate-500 bg-slate-500/10';
        default:
          return 'text-slate-500 bg-slate-500/10';
      }
    };

    const getDeltaIcon = (type: 'increase' | 'decrease' | 'neutral') => {
      switch (type) {
        case 'increase':
          return <TrendingUp className='w-3 h-3' />;
        case 'decrease':
          return <TrendingDown className='w-3 h-3' />;
        case 'neutral':
          return <Minus className='w-3 h-3' />;
        default:
          return null;
      }
    };

    // Simple sparkline SVG generation
    const generateSparkline = (data: number[]): string => {
      if (!data || data.length < 2) return '';

      const width = 60;
      const height = 20;
      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;

      const points = data
        .map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          return `${x},${y}`;
        })
        .join(' ');

      return `M ${points.replace(/,/g, ' L ').replace(/L /, 'M ')}`;
    };

    return (
      <motion.div
        className={cn(
          createCardStyle(gradient ? 'gradient' : 'glass'),
          'relative overflow-hidden p-6',
          'focus:outline-none focus:ring-2 focus:ring-primary/20',
          hoverEffects.glow,
          className
        )}
        variants={motionVariants.cardHover}
        initial='rest'
        whileHover='hover'
        whileTap='tap'
        role='article'
        aria-label={`Metric: ${title}`}
        tabIndex={0}
      >
        {/* Gradient border effect */}
        {gradient && (
          <div className='absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-fuchsia-500/20 p-[1px]'>
            <div className='h-full w-full rounded-2xl bg-card/90 backdrop-blur-sm' />
          </div>
        )}

        {/* Content */}
        <div className='relative z-10'>
          {/* Header with icon and title */}
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              {icon && (
                <div
                  className='p-2 rounded-lg bg-primary/10 text-primary'
                  aria-hidden='true'
                >
                  {icon}
                </div>
              )}
              <h3 className='text-sm font-medium text-muted-foreground'>
                {title}
              </h3>
            </div>

            {/* Sparkline */}
            {sparklineData && sparklineData.length > 1 && (
              <div className='w-16 h-6' aria-label={`Trend chart for ${title}`}>
                <svg
                  width='60'
                  height='20'
                  viewBox='0 0 60 20'
                  className='text-primary/60'
                  role='img'
                  aria-label={`Sparkline showing trend data for ${title}`}
                >
                  <path
                    d={generateSparkline(sparklineData)}
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Value and delta */}
          <div className='flex items-end justify-between'>
            <div className='flex-1'>
              <motion.div
                className='text-3xl font-bold text-foreground mb-1'
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                aria-label={`Current value: ${formatValue(value)}`}
              >
                {formatValue(value)}
              </motion.div>

              {delta && (
                <motion.div
                  className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  ${getDeltaColor(delta.type)}
                `}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  role='status'
                  aria-label={`Change: ${delta.type} by ${Math.abs(
                    delta.value
                  )}${
                    typeof delta.value === 'number' && delta.value % 1 !== 0
                      ? ' percent'
                      : ''
                  }`}
                >
                  <span aria-hidden='true'>{getDeltaIcon(delta.type)}</span>
                  <span>
                    {delta.type === 'increase'
                      ? '+'
                      : delta.type === 'decrease'
                      ? '-'
                      : ''}
                    {Math.abs(delta.value)}
                    {typeof delta.value === 'number' && delta.value % 1 !== 0
                      ? '%'
                      : ''}
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Glassmorphism overlay */}
        <div className='absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-2xl' />
      </motion.div>
    );
  }
);

MetricCard.displayName = 'MetricCard';

export default MetricCard;
