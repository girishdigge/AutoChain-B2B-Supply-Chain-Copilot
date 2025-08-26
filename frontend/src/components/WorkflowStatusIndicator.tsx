import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import type { WorkflowRun } from '../types';

interface WorkflowStatusIndicatorProps {
  workflowRun?: WorkflowRun;
  className?: string;
}

const WorkflowStatusIndicator: React.FC<WorkflowStatusIndicatorProps> = ({
  workflowRun,
  className = '',
}) => {
  if (!workflowRun) {
    return (
      <div
        className={`flex items-center gap-2 text-muted-foreground ${className}`}
      >
        <Clock className='h-4 w-4' />
        <span className='text-sm'>No active workflow</span>
        <span className='text-xs text-muted-foreground/60'>
          (Workflow will appear when processing starts)
        </span>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (workflowRun.status) {
      case 'running':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />;
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-500' />;
      case 'pending':
        return <Clock className='h-4 w-4 text-amber-500' />;
      default:
        return <AlertCircle className='h-4 w-4 text-gray-500' />;
    }
  };

  const getStatusColor = () => {
    switch (workflowRun.status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'pending':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (workflowRun.status) {
      case 'running':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const currentStepName = workflowRun.currentStep
    ? workflowRun.steps.find((step) => step.id === workflowRun.currentStep)
        ?.name
    : null;

  const waitingSteps = workflowRun.steps.filter(
    (step) => step.status === 'waiting'
  );
  const hasWaitingSteps = waitingSteps.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Status Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {getStatusIcon()}
          <span className='font-medium text-sm'>{getStatusText()}</span>
          <Badge variant='outline' className='text-xs'>
            {workflowRun.orderId}
          </Badge>
        </div>

        <div className='text-xs text-muted-foreground'>
          {workflowRun.completedSteps} / {workflowRun.totalSteps} steps
        </div>
      </div>

      {/* Progress Bar */}
      <div className='space-y-1'>
        <Progress value={workflowRun.progress} className='h-2' />
        <div className='flex justify-between text-xs text-muted-foreground'>
          <span>{Math.round(workflowRun.progress)}% complete</span>
          {workflowRun.status === 'running' && currentStepName && (
            <span className='flex items-center gap-1'>
              <motion.div
                className={`w-2 h-2 rounded-full ${getStatusColor()}`}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {currentStepName}
            </span>
          )}
        </div>
      </div>

      {/* Waiting Steps Alert */}
      {hasWaitingSteps && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md'
        >
          <AlertCircle className='h-4 w-4 text-amber-600' />
          <span className='text-sm text-amber-700 dark:text-amber-300'>
            {waitingSteps.length} step{waitingSteps.length > 1 ? 's' : ''}{' '}
            waiting for input
          </span>
        </motion.div>
      )}

      {/* Execution Time */}
      {workflowRun.startTime && (
        <div className='text-xs text-muted-foreground'>
          Started: {new Date(workflowRun.startTime).toLocaleTimeString()}
          {workflowRun.endTime && (
            <span className='ml-2'>
              • Duration:{' '}
              {Math.round(
                (new Date(workflowRun.endTime).getTime() -
                  new Date(workflowRun.startTime).getTime()) /
                  1000
              )}
              s
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowStatusIndicator;
