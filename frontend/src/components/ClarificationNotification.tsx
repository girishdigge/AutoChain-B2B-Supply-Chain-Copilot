import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { LogEntry } from '../types';

interface ClarificationNotificationProps {
  clarificationLogs: LogEntry[];
  onDismiss?: (clarificationId: string) => void;
  className?: string;
}

interface ActiveClarification {
  id: string;
  question: string;
  timestamp: string;
  timeout?: number;
  options?: string[];
  required: boolean;
  isResolved: boolean;
}

const ClarificationNotification: React.FC<ClarificationNotificationProps> = ({
  clarificationLogs,
  onDismiss,
  className = '',
}) => {
  const [activeClarifications, setActiveClarifications] = useState<
    ActiveClarification[]
  >([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Process clarification logs to extract active clarifications
  useEffect(() => {
    const clarificationMap = new Map<string, ActiveClarification>();

    clarificationLogs.forEach((log) => {
      if (log.metadata?.clarificationId) {
        const id = log.metadata.clarificationId;

        if (log.metadata.type === 'clarification_request') {
          // Extract question from log message
          const question = log.message.replace(
            /^🤔\s*Clarification Required:\s*/,
            ''
          );

          clarificationMap.set(id, {
            id,
            question,
            timestamp: log.timestamp,
            timeout: log.metadata.timeout_seconds,
            options: log.metadata.options,
            required: log.metadata.required || false,
            isResolved: false,
          });
        } else if (log.metadata.type === 'clarification_response') {
          // Mark as resolved
          const existing = clarificationMap.get(id);
          if (existing) {
            clarificationMap.set(id, {
              ...existing,
              isResolved: true,
            });
          }
        }
      }
    });

    // Filter out dismissed and resolved clarifications
    const active = Array.from(clarificationMap.values()).filter(
      (clarification) =>
        !clarification.isResolved && !dismissedIds.has(clarification.id)
    );

    setActiveClarifications(active);
  }, [clarificationLogs, dismissedIds]);

  // Handle dismissing a clarification
  const handleDismiss = (clarificationId: string) => {
    setDismissedIds((prev) => new Set(prev).add(clarificationId));
    onDismiss?.(clarificationId);
  };

  // Calculate remaining time for timeout
  const getRemainingTime = (
    clarification: ActiveClarification
  ): number | null => {
    if (!clarification.timeout) return null;

    const elapsed =
      (Date.now() - new Date(clarification.timestamp).getTime()) / 1000;
    const remaining = clarification.timeout - elapsed;

    return Math.max(0, remaining);
  };

  // Show timeout warning toast
  useEffect(() => {
    activeClarifications.forEach((clarification) => {
      const remaining = getRemainingTime(clarification);

      if (remaining !== null && remaining <= 30 && remaining > 25) {
        toast.warning('⏰ Clarification Timeout Warning', {
          description: `Response needed within ${Math.ceil(remaining)} seconds`,
          duration: 5000,
        });
      }
    });
  }, [activeClarifications]);

  if (activeClarifications.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <AnimatePresence mode='popLayout'>
        {activeClarifications.map((clarification) => {
          const remainingTime = getRemainingTime(clarification);
          const isUrgent = remainingTime !== null && remainingTime <= 30;

          return (
            <motion.div
              key={clarification.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              layout
            >
              <Alert
                className={`${
                  isUrgent
                    ? 'border-red-500/50 bg-red-500/10 animate-pulse'
                    : clarification.required
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-blue-500/50 bg-blue-500/10'
                }`}
              >
                <div className='flex items-start gap-3'>
                  <div className='flex-shrink-0 mt-0.5'>
                    {isUrgent ? (
                      <AlertCircle className='h-5 w-5 text-red-500' />
                    ) : (
                      <MessageSquare className='h-5 w-5 text-amber-500' />
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <AlertDescription>
                      <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-sm'>
                            {isUrgent
                              ? 'URGENT: Clarification Required'
                              : 'Clarification Required'}
                          </span>
                          {clarification.required && (
                            <Badge variant='destructive' className='text-xs'>
                              Required
                            </Badge>
                          )}
                        </div>

                        <div className='flex items-center gap-2'>
                          {remainingTime !== null && (
                            <div
                              className={`flex items-center gap-1 text-xs ${
                                isUrgent ? 'text-red-600' : 'text-amber-600'
                              }`}
                            >
                              <Clock className='h-3 w-3' />
                              <span>{Math.ceil(remainingTime)}s</span>
                            </div>
                          )}

                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleDismiss(clarification.id)}
                            className='h-6 w-6 p-0 hover:bg-muted/50'
                          >
                            <X className='h-3 w-3' />
                          </Button>
                        </div>
                      </div>

                      <p className='text-sm mb-3 text-foreground'>
                        {clarification.question}
                      </p>

                      {clarification.options &&
                        clarification.options.length > 0 && (
                          <div className='space-y-2'>
                            <span className='text-xs text-muted-foreground'>
                              Available options:
                            </span>
                            <div className='flex flex-wrap gap-1'>
                              {clarification.options.map((option, index) => (
                                <Badge
                                  key={index}
                                  variant='outline'
                                  className='text-xs'
                                >
                                  {option}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className='flex items-center justify-between mt-3 pt-2 border-t border-border/50'>
                        <span className='text-xs text-muted-foreground'>
                          ID: {clarification.id.slice(0, 8)}...
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          {new Date(
                            clarification.timestamp
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ClarificationNotification;
