/**
 * Performance Monitor Component
 *
 * A development-only component that displays real-time performance
 * metrics and provides performance insights.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Zap,
  Clock,
  BarChart3,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { usePerformanceMonitor, useMemoryMonitor } from '../lib/performance';
import { cn } from '../lib/styling';

interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const { metrics, recordMetric, getCoreWebVitals } = usePerformanceMonitor();
  const memoryInfo = useMemoryMonitor();
  const [vitals, setVitals] = useState<any>({});

  // Update Core Web Vitals periodically
  useEffect(() => {
    if (!enabled) return;

    const updateVitals = async () => {
      const newVitals = await getCoreWebVitals();
      setVitals(newVitals);
    };

    updateVitals();
    const interval = setInterval(updateVitals, 5000);

    return () => clearInterval(interval);
  }, [enabled, getCoreWebVitals]);

  // Record component render time
  useEffect(() => {
    if (!enabled) return;

    const renderStart = performance.now();
    return () => {
      const renderTime = performance.now() - renderStart;
      recordMetric('component.render', renderTime);
    };
  }, [enabled, recordMetric]);

  if (!enabled) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className='w-4 h-4' />;
    if (score >= 70) return <AlertTriangle className='w-4 h-4' />;
    return <X className='w-4 h-4' />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Calculate performance scores
  const performanceScore = Math.max(
    0,
    100 -
      (vitals.lcp > 2500 ? 30 : vitals.lcp > 1800 ? 15 : 0) -
      (vitals.fid > 100 ? 25 : vitals.fid > 50 ? 10 : 0) -
      (vitals.cls > 0.1 ? 25 : vitals.cls > 0.05 ? 10 : 0)
  );

  return (
    <div className={cn('fixed z-50', positionClasses[position], className)}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className='mb-2 w-80 bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl'
          >
            {/* Header */}
            <div className='flex items-center justify-between p-4 border-b border-border/30'>
              <div className='flex items-center gap-2'>
                <Activity className='w-5 h-5 text-primary' />
                <h3 className='font-semibold text-sm'>Performance Monitor</h3>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setIsMinimized(!isMinimized)}
                  className='h-6 w-6 p-0'
                >
                  {isMinimized ? (
                    <ChevronDown className='w-4 h-4' />
                  ) : (
                    <ChevronUp className='w-4 h-4' />
                  )}
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setIsOpen(false)}
                  className='h-6 w-6 p-0'
                >
                  <X className='w-4 h-4' />
                </Button>
              </div>
            </div>

            {/* Content */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className='overflow-hidden'
                >
                  <div className='p-4 space-y-4'>
                    {/* Performance Score */}
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>
                        Performance Score
                      </span>
                      <div className='flex items-center gap-2'>
                        <span
                          className={cn(
                            'text-sm font-bold',
                            getScoreColor(performanceScore)
                          )}
                        >
                          {performanceScore.toFixed(0)}
                        </span>
                        {getScoreIcon(performanceScore)}
                      </div>
                    </div>

                    {/* Core Web Vitals */}
                    <div className='space-y-2'>
                      <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                        Core Web Vitals
                      </h4>
                      <div className='grid grid-cols-2 gap-2 text-xs'>
                        <div className='flex justify-between'>
                          <span>LCP:</span>
                          <Badge
                            variant={
                              vitals.lcp > 2500
                                ? 'destructive'
                                : vitals.lcp > 1800
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {vitals.lcp ? formatTime(vitals.lcp) : 'N/A'}
                          </Badge>
                        </div>
                        <div className='flex justify-between'>
                          <span>FID:</span>
                          <Badge
                            variant={
                              vitals.fid > 100
                                ? 'destructive'
                                : vitals.fid > 50
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {vitals.fid ? formatTime(vitals.fid) : 'N/A'}
                          </Badge>
                        </div>
                        <div className='flex justify-between'>
                          <span>CLS:</span>
                          <Badge
                            variant={
                              vitals.cls > 0.1
                                ? 'destructive'
                                : vitals.cls > 0.05
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {vitals.cls ? vitals.cls.toFixed(3) : 'N/A'}
                          </Badge>
                        </div>
                        <div className='flex justify-between'>
                          <span>FCP:</span>
                          <Badge
                            variant={
                              vitals.fcp > 1800
                                ? 'destructive'
                                : vitals.fcp > 1200
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {vitals.fcp ? formatTime(vitals.fcp) : 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Memory Usage */}
                    {memoryInfo && (
                      <div className='space-y-2'>
                        <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                          Memory Usage
                        </h4>
                        <div className='space-y-1 text-xs'>
                          <div className='flex justify-between'>
                            <span>Used:</span>
                            <span className='font-mono'>
                              {formatBytes(memoryInfo.usedJSHeapSize)}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span>Total:</span>
                            <span className='font-mono'>
                              {formatBytes(memoryInfo.totalJSHeapSize)}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span>Limit:</span>
                            <span className='font-mono'>
                              {formatBytes(memoryInfo.jsHeapSizeLimit)}
                            </span>
                          </div>
                        </div>
                        <div className='w-full bg-muted rounded-full h-2'>
                          <div
                            className='bg-primary h-2 rounded-full transition-all duration-300'
                            style={{
                              width: `${
                                (memoryInfo.usedJSHeapSize /
                                  memoryInfo.totalJSHeapSize) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Performance Metrics */}
                    {Object.keys(metrics).length > 0 && (
                      <div className='space-y-2'>
                        <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                          Metrics
                        </h4>
                        <div className='space-y-1 text-xs max-h-32 overflow-y-auto scrollbar-thin'>
                          {Object.entries(metrics)
                            .slice(0, 8)
                            .map(([name, data]) => (
                              <div key={name} className='flex justify-between'>
                                <span className='truncate'>{name}:</span>
                                <span className='font-mono'>
                                  {formatTime((data as any).avg)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          // Clear metrics
                          window.location.reload();
                        }}
                        className='flex-1 text-xs'
                      >
                        <Zap className='w-3 h-3 mr-1' />
                        Refresh
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          // Export metrics
                          const data = { vitals, metrics, memoryInfo };
                          const blob = new Blob(
                            [JSON.stringify(data, null, 2)],
                            { type: 'application/json' }
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `performance-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className='flex-1 text-xs'
                      >
                        <BarChart3 className='w-3 h-3 mr-1' />
                        Export
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-md',
          'border border-border/50 rounded-full shadow-lg',
          'hover:bg-card transition-colors',
          'text-sm font-medium'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Activity className='w-4 h-4 text-primary' />
        {!isOpen && (
          <>
            <span className={getScoreColor(performanceScore)}>
              {performanceScore.toFixed(0)}
            </span>
            <Clock className='w-4 h-4 text-muted-foreground' />
          </>
        )}
      </motion.button>
    </div>
  );
};

export default PerformanceMonitor;
