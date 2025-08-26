import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import StatusBadge from './StatusBadge';
import type { WorkflowStep, LogEntry } from '../types';

export interface StepCardProps {
  step: WorkflowStep;
  isActive?: boolean;
  isCompleted?: boolean;
  onClick?: () => void;
  compact?: boolean;
  showConnector?: boolean;
  connectorStatus?: 'pending' | 'active' | 'completed';
  className?: string;
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  isActive = false,
  isCompleted = false,
  onClick,
  compact = false,
  showConnector = false,
  connectorStatus = 'pending',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'active':
        return Play;
      case 'completed':
        return CheckCircle;
      case 'failed':
        return XCircle;
      case 'waiting':
        return Clock;
      case 'skipped':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getConnectorColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'active':
        return 'bg-blue-500';
      default:
        return 'bg-slate-300 dark:bg-slate-600';
    }
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return null;

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600)
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor(
      (duration % 3600) / 60
    )}m`;
  };

  const getRecentLogPreview = (logs: LogEntry[]) => {
    if (!logs || logs.length === 0) return null;

    // Get the most recent log entry
    const recentLog = logs[logs.length - 1];
    return recentLog.message.length > 60
      ? `${recentLog.message.substring(0, 60)}...`
      : recentLog.message;
  };

  const IconComponent = getStepIcon(step.status);
  const duration = formatDuration(step.startTime, step.endTime);
  const logPreview = getRecentLogPreview(step.logs);
  const hasLogs = step.logs && step.logs.length > 0;

  const cardVariants = {
    idle: {
      scale: 1,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    hover: {
      scale: 1.02,
      boxShadow:
        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      transition: { duration: 0.2 },
    },
    active: {
      scale: 1.01,
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
    },
  };

  const expandVariants = {
    collapsed: {
      height: 0,
      opacity: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
    },
  };

  const expandTransition = {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1] as const,
  };

  // Determine visual state based on step status (primary) and props (secondary)
  const isStepActive = step.status === 'active' || isActive;
  const isStepCompleted = step.status === 'completed' || isCompleted;
  const isStepFailed = step.status === 'failed';

  // Debug logging
  console.log(`🎯 StepCard ${step.id}:`, {
    stepStatus: step.status,
    isActive,
    isCompleted,
    isStepActive,
    isStepCompleted,
    isStepFailed,
  });

  if (compact) {
    return (
      <div className='relative'>
        <motion.div
          className={`
            relative p-3 rounded-2xl border cursor-pointer
            ${
              isStepActive
                ? 'border-blue-500 bg-blue-500/5'
                : isStepCompleted
                ? 'border-emerald-500 bg-emerald-500/5'
                : isStepFailed
                ? 'border-rose-500 bg-rose-500/5'
                : 'border-slate-200 dark:border-slate-700'
            }
            ${className}
          `}
          variants={cardVariants}
          initial='idle'
          animate={isStepActive ? 'active' : 'idle'}
          whileHover={onClick ? 'hover' : undefined}
          onClick={onClick}
        >
          <div className='flex items-center gap-2'>
            <IconComponent
              className={`w-4 h-4 ${
                isStepCompleted
                  ? 'text-emerald-500'
                  : isStepActive
                  ? 'text-blue-500'
                  : isStepFailed
                  ? 'text-rose-500'
                  : 'text-slate-400'
              }`}
            />
            <span
              className={`text-sm font-medium ${
                isStepActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : isStepCompleted
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isStepFailed
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {step.name}
            </span>
          </div>

          {step.progress !== undefined && step.progress > 0 && (
            <div className='mt-2'>
              <Progress value={step.progress} className='h-1' />
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className='relative'>
      <motion.div
        variants={cardVariants}
        initial='idle'
        animate={isStepActive ? 'active' : 'idle'}
        whileHover={onClick ? 'hover' : undefined}
      >
        <Card
          className={`rounded-2xl border-2 transition-all duration-300 ${
            isStepActive
              ? 'border-blue-500 shadow-blue-500/20'
              : isStepCompleted
              ? 'border-emerald-500 shadow-emerald-500/20'
              : isStepFailed
              ? 'border-rose-500 shadow-rose-500/20'
              : 'border-slate-200 dark:border-slate-700'
          } ${className}`}
        >
          <CardHeader
            className={`pb-3 ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <motion.div
                  animate={isStepActive ? { rotate: 360 } : { rotate: 0 }}
                  transition={
                    isStepActive
                      ? {
                          duration: 2,
                          repeat: Infinity,
                          ease: 'linear',
                        }
                      : undefined
                  }
                >
                  <IconComponent
                    className={`w-5 h-5 ${
                      isStepCompleted
                        ? 'text-emerald-500'
                        : isStepActive
                        ? 'text-blue-500'
                        : isStepFailed
                        ? 'text-rose-500'
                        : 'text-slate-400'
                    }`}
                  />
                </motion.div>

                <div>
                  <h3 className='font-semibold text-lg'>{step.name}</h3>
                  {duration && (
                    <div className='flex items-center gap-1 text-sm text-slate-500'>
                      <Timer className='w-3 h-3' />
                      <span>{duration}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <StatusBadge
                  status={step.status as any}
                  size='sm'
                  animate={isActive}
                />

                {hasLogs && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className='p-1 h-auto'
                  >
                    {isExpanded ? (
                      <ChevronUp className='w-4 h-4' />
                    ) : (
                      <ChevronDown className='w-4 h-4' />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Progress bar for active steps */}
            {step.status === 'active' && step.progress !== undefined && (
              <div className='mt-3'>
                <div className='flex justify-between text-sm text-slate-500 mb-1'>
                  <span>Progress</span>
                  <span>{Math.round(step.progress)}%</span>
                </div>
                <Progress value={step.progress} className='h-2' />
              </div>
            )}

            {/* Log preview */}
            {logPreview && !isExpanded && (
              <div className='mt-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg'>
                <div className='flex items-start gap-2'>
                  <FileText className='w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0' />
                  <p className='text-sm text-slate-600 dark:text-slate-300 font-mono'>
                    {logPreview}
                  </p>
                </div>
              </div>
            )}

            {/* Error message */}
            {step.error && (
              <div className='mt-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg'>
                <div className='flex items-start gap-2'>
                  <XCircle className='w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0' />
                  <p className='text-sm text-rose-700 dark:text-rose-300'>
                    {step.error}
                  </p>
                </div>
              </div>
            )}
          </CardHeader>

          {/* Expandable logs section */}
          <AnimatePresence>
            {isExpanded && hasLogs && (
              <motion.div
                variants={expandVariants}
                initial='collapsed'
                animate='expanded'
                exit='collapsed'
                transition={expandTransition}
                className='overflow-hidden'
              >
                <CardContent className='pt-0'>
                  <div className='border-t border-slate-200 dark:border-slate-700 pt-3'>
                    <div className='flex items-center gap-2 mb-3'>
                      <FileText className='w-4 h-4 text-slate-500' />
                      <span className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                        Logs ({step.logs.length})
                      </span>
                    </div>

                    <div className='space-y-2 max-h-48 overflow-y-auto'>
                      {step.logs.slice(-10).map((log, index) => (
                        <div
                          key={index}
                          className='p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs font-mono'
                        >
                          <div className='flex items-start gap-2'>
                            <span className='text-slate-400 flex-shrink-0'>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span
                              className={`flex-shrink-0 uppercase font-semibold ${
                                log.level === 'error'
                                  ? 'text-rose-500'
                                  : log.level === 'warn'
                                  ? 'text-amber-500'
                                  : log.level === 'info'
                                  ? 'text-blue-500'
                                  : 'text-slate-500'
                              }`}
                            >
                              {log.level}
                            </span>
                            <span className='text-slate-700 dark:text-slate-300'>
                              {log.message}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {step.logs.length > 10 && (
                      <div className='mt-2 text-center'>
                        <Button variant='ghost' size='sm' className='text-xs'>
                          View all {step.logs.length} logs
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Connector line for vertical layout */}
      {showConnector && (
        <div className='absolute left-6 top-full w-0.5 h-4 -mt-1'>
          <motion.div
            className={`w-full h-full ${getConnectorColor(connectorStatus)}`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        </div>
      )}
    </div>
  );
};

export default StepCard;
