import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Clock,
  Send,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { useWebSocket } from '../context/WebSocketContext';
import type { ClarificationRequest } from '../types';

interface ClarificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clarificationRequest?: ClarificationRequest;
}

const ClarificationDialog: React.FC<ClarificationDialogProps> = ({
  isOpen,
  onClose,
  clarificationRequest,
}) => {
  const { sendMessage } = useWebSocket();
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');

  // Calculate remaining time
  useEffect(() => {
    if (!clarificationRequest || !isOpen) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const requestTime = new Date(
        clarificationRequest.timestamp || Date.now()
      ).getTime();
      const elapsed = (now - requestTime) / 1000;
      const remaining = clarificationRequest.timeout_seconds - elapsed;

      if (remaining <= 0) {
        setTimeRemaining(0);
        return;
      }

      setTimeRemaining(Math.ceil(remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [clarificationRequest, isOpen]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setResponse('');
      setSelectedOption('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Auto-close when time runs out
  useEffect(() => {
    if (timeRemaining === 0) {
      onClose();
    }
  }, [timeRemaining, onClose]);

  const handleSubmit = async () => {
    if (!clarificationRequest) return;

    const finalResponse = selectedOption || response.trim();
    if (!finalResponse) return;

    setIsSubmitting(true);

    try {
      const success = sendMessage({
        type: 'clarification_response',
        data: {
          clarification_id: clarificationRequest.clarification_id,
          response: finalResponse,
          timestamp: new Date().toISOString(),
        },
      });

      if (success) {
        onClose();
      } else {
        throw new Error('Failed to send clarification response');
      }
    } catch (error) {
      console.error('Error sending clarification response:', error);
      // You could show an error toast here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    setResponse(''); // Clear text response when option is selected
  };

  const isUrgent = timeRemaining !== null && timeRemaining <= 30;
  const canSubmit = (selectedOption || response.trim()) && !isSubmitting;

  if (!clarificationRequest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[600px] max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <MessageSquare className='h-5 w-5 text-blue-500' />
              <DialogTitle>
                {isUrgent ? 'URGENT: ' : ''}Clarification Required
              </DialogTitle>
            </div>

            {timeRemaining !== null && (
              <div
                className={`flex items-center gap-1 text-sm ${
                  isUrgent ? 'text-red-600' : 'text-amber-600'
                }`}
              >
                <Clock className='h-4 w-4' />
                <span className='font-mono'>
                  {Math.floor(timeRemaining / 60)}:
                  {(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          <DialogDescription className='text-base'>
            {clarificationRequest.question}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Context information */}
          {clarificationRequest.context && (
            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                <strong>Context:</strong>{' '}
                {JSON.stringify(clarificationRequest.context)}
              </AlertDescription>
            </Alert>
          )}

          {/* Required badge */}
          {clarificationRequest.required && (
            <div className='flex items-center gap-2'>
              <Badge variant='destructive'>Required Response</Badge>
              <span className='text-sm text-muted-foreground'>
                This clarification is required to continue processing
              </span>
            </div>
          )}

          {/* Timeout warning */}
          {isUrgent && (
            <Alert className='border-red-500/50 bg-red-500/10'>
              <AlertCircle className='h-4 w-4 text-red-500' />
              <AlertDescription className='text-red-700'>
                <strong>Time Critical:</strong> Please respond within{' '}
                {timeRemaining} seconds or the request will timeout.
              </AlertDescription>
            </Alert>
          )}

          {/* Predefined options */}
          {clarificationRequest.options &&
            clarificationRequest.options.length > 0 && (
              <div className='space-y-3'>
                <label className='text-sm font-medium'>Choose an option:</label>
                <div className='grid gap-2'>
                  {clarificationRequest.options.map((option, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleOptionSelect(option)}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        selectedOption === option
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-border hover:border-blue-300 hover:bg-muted/50'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='text-sm'>{option}</span>
                        {selectedOption === option && (
                          <CheckCircle className='h-4 w-4 text-blue-500' />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <span className='w-full border-t' />
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-background px-2 text-muted-foreground'>
                      Or provide custom response
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* Custom response textarea */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              {clarificationRequest.options?.length
                ? 'Custom Response:'
                : 'Your Response:'}
            </label>
            <Textarea
              value={response}
              onChange={(e) => {
                setResponse(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedOption(''); // Clear option when typing
                }
              }}
              placeholder='Type your response here...'
              className='min-h-[100px] resize-none'
              disabled={isSubmitting}
            />
          </div>

          {/* Action buttons */}
          <div className='flex items-center justify-between pt-4 border-t'>
            <div className='text-xs text-muted-foreground'>
              ID: {clarificationRequest.clarification_id.slice(0, 12)}...
            </div>

            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={onClose}
                disabled={isSubmitting}
              >
                <X className='h-4 w-4 mr-1' />
                Cancel
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={isUrgent ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {isSubmitting ? (
                  <motion.div
                    className='h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2'
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                ) : (
                  <Send className='h-4 w-4 mr-1' />
                )}
                {isSubmitting ? 'Sending...' : 'Send Response'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClarificationDialog;
