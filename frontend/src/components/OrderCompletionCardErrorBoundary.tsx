import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, X, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';

interface Props {
  children: ReactNode;
  onClose: () => void;
  fallbackData?: {
    orderId?: string;
    buyerEmail?: string;
    paymentLink?: string;
    blockchainTxHash?: string;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class OrderCompletionCardErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('🚨 OrderCompletionCard Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error, {
        context: 'OrderCompletionCard',
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(
        `🔄 Retrying OrderCompletionCard (attempt ${
          this.state.retryCount + 1
        }/${this.maxRetries})`
      );

      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
      });
    }
  };

  handleClose = () => {
    console.log('🔴 Closing completion card from error boundary');
    this.props.onClose();
  };

  handlePaymentFallback = () => {
    const { fallbackData } = this.props;

    if (
      fallbackData?.paymentLink &&
      fallbackData.paymentLink.includes('checkout.stripe.com')
    ) {
      console.log(
        '💳 Opening fallback payment link:',
        fallbackData.paymentLink
      );
      window.open(fallbackData.paymentLink, '_blank', 'noopener,noreferrer');
    } else {
      alert(
        'Payment link is not available. Please check the workflow logs or contact support.'
      );
    }
  };

  handleBlockchainFallback = () => {
    const { fallbackData } = this.props;

    if (
      fallbackData?.blockchainTxHash &&
      fallbackData.blockchainTxHash.length >= 40
    ) {
      let cleanHash = fallbackData.blockchainTxHash;

      // Clean the hash
      if (cleanHash.includes('/tx/')) {
        cleanHash = cleanHash.split('/tx/')[1];
      }
      cleanHash = cleanHash.replace(/^0x/, '');

      if (/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
        const url = `https://amoy.polygonscan.com/tx/0x${cleanHash}`;
        console.log('🔗 Opening fallback blockchain URL:', url);
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Blockchain transaction hash format is invalid.');
      }
    } else {
      alert('Blockchain transaction hash is not available.');
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallbackData } = this.props;
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center p-4'>
          {/* Backdrop */}
          <div
            className='absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer'
            onClick={this.handleClose}
          />

          {/* Error Card */}
          <motion.div
            className='relative z-10 w-full max-w-2xl'
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Card className='w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white via-red-50 to-orange-50 dark:from-slate-900 dark:via-red-950 dark:to-orange-950 border-2 border-red-200 dark:border-red-800 shadow-2xl relative'>
              {/* Close button */}
              <button
                className='absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-red-100 dark:bg-slate-800/80 dark:hover:bg-red-900 transition-colors cursor-pointer'
                onClick={this.handleClose}
                type='button'
                aria-label='Close error dialog'
              >
                <X className='w-4 h-4 text-gray-600 dark:text-gray-300' />
              </button>

              <CardHeader className='text-center pb-4 pt-4'>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                  className='flex items-center justify-center mb-4'
                >
                  <AlertTriangle className='w-16 h-16 text-red-500' />
                </motion.div>

                <motion.h2
                  className='text-3xl font-bold text-red-700 dark:text-red-300 mb-2'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Order Completion Card Error
                </motion.h2>

                <motion.p
                  className='text-slate-600 dark:text-slate-300'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  There was an error displaying your order completion details,
                  but your order was processed successfully.
                </motion.p>
              </CardHeader>

              <CardContent className='space-y-6 pb-4'>
                {/* Error Details */}
                <motion.div
                  className='bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 border border-red-200 dark:border-red-800'
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                    <AlertTriangle className='w-5 h-5 text-red-500' />
                    Error Information
                  </h3>

                  <div className='space-y-3'>
                    <div className='p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800'>
                      <p className='text-sm font-medium text-red-700 dark:text-red-300 mb-1'>
                        Error Message:
                      </p>
                      <p className='text-sm text-red-600 dark:text-red-400 font-mono'>
                        {this.state.error?.message || 'Unknown error occurred'}
                      </p>
                    </div>

                    <div className='p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800'>
                      <p className='text-sm font-medium text-orange-700 dark:text-orange-300 mb-1'>
                        What this means:
                      </p>
                      <p className='text-sm text-orange-600 dark:text-orange-400'>
                        Your order was processed successfully, but there was a
                        display issue with the completion card. You can still
                        access your payment link and blockchain transaction
                        using the buttons below.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Fallback Order Information */}
                {fallbackData && (
                  <motion.div
                    className='bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 border border-blue-200 dark:border-blue-800'
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                      <ExternalLink className='w-5 h-5 text-blue-500' />
                      Available Order Information
                    </h3>

                    <div className='space-y-3 text-sm'>
                      {fallbackData.orderId && (
                        <div className='flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded'>
                          <span className='text-slate-600 dark:text-slate-400'>
                            Order ID:
                          </span>
                          <span className='font-mono font-medium'>
                            {fallbackData.orderId}
                          </span>
                        </div>
                      )}

                      {fallbackData.buyerEmail && (
                        <div className='flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded'>
                          <span className='text-slate-600 dark:text-slate-400'>
                            Buyer Email:
                          </span>
                          <span className='font-medium'>
                            {fallbackData.buyerEmail}
                          </span>
                        </div>
                      )}

                      {fallbackData.paymentLink && (
                        <div className='p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800'>
                          <div className='flex items-center gap-2 mb-1'>
                            <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                              Payment Link Available
                            </span>
                            <Badge variant='secondary' className='text-xs'>
                              Ready
                            </Badge>
                          </div>
                          <p className='text-xs text-green-600 dark:text-green-400'>
                            Click the payment button below to complete your
                            purchase
                          </p>
                        </div>
                      )}

                      {fallbackData.blockchainTxHash && (
                        <div className='p-2 bg-purple-50 dark:bg-purple-950/30 rounded border border-purple-200 dark:border-purple-800'>
                          <div className='flex items-center gap-2 mb-1'>
                            <span className='text-sm font-medium text-purple-700 dark:text-purple-300'>
                              Blockchain Transaction
                            </span>
                            <Badge variant='secondary' className='text-xs'>
                              Recorded
                            </Badge>
                          </div>
                          <p className='text-xs text-purple-600 dark:text-purple-400'>
                            Transaction:{' '}
                            {fallbackData.blockchainTxHash.substring(0, 20)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                  className='space-y-4'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  {/* Retry Button */}
                  {canRetry && (
                    <button
                      onClick={this.handleRetry}
                      className='w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 transform hover:scale-105'
                      type='button'
                    >
                      <RefreshCw className='w-5 h-5' />
                      Retry Loading Completion Card
                      <span className='text-xs opacity-90'>
                        ({this.state.retryCount + 1}/{this.maxRetries})
                      </span>
                    </button>
                  )}

                  {/* Fallback Action Buttons */}
                  {fallbackData && (
                    <div className='flex flex-col sm:flex-row gap-4'>
                      {/* Payment Button */}
                      {fallbackData.paymentLink && (
                        <button
                          onClick={this.handlePaymentFallback}
                          className='flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 transform hover:scale-105'
                          type='button'
                        >
                          <ExternalLink className='w-5 h-5' />
                          Complete Payment
                        </button>
                      )}

                      {/* Blockchain Button */}
                      {fallbackData.blockchainTxHash && (
                        <button
                          onClick={this.handleBlockchainFallback}
                          className='flex-1 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:border-purple-700 dark:hover:bg-purple-950 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 transform hover:scale-105'
                          type='button'
                        >
                          <ExternalLink className='w-5 h-5' />
                          View on Blockchain
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Status Information */}
                <motion.div
                  className='bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <h4 className='text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-2'>
                    Important Information:
                  </h4>
                  <ul className='text-xs text-yellow-600 dark:text-yellow-400 space-y-1'>
                    <li>• Your order has been processed successfully</li>
                    <li>
                      • A confirmation email has been sent to your email address
                    </li>
                    <li>
                      • You can still complete payment using the payment link
                    </li>
                    <li>
                      • The blockchain transaction has been recorded (if
                      applicable)
                    </li>
                    <li>
                      • Contact support if you need assistance:
                      support@portia.ai
                    </li>
                  </ul>
                </motion.div>

                {/* Debug Information (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                  <motion.div
                    className='text-xs text-slate-500 dark:text-slate-400 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    <div className='font-mono space-y-1'>
                      <div className='font-semibold mb-2'>
                        Debug Information:
                      </div>
                      <div>Error: {this.state.error?.name}</div>
                      <div>Message: {this.state.error?.message}</div>
                      <div>
                        Retry Count: {this.state.retryCount}/{this.maxRetries}
                      </div>
                      <div>
                        Fallback Data Available: {fallbackData ? 'Yes' : 'No'}
                      </div>
                      {fallbackData && (
                        <>
                          <div>
                            Payment Link:{' '}
                            {fallbackData.paymentLink ? 'Available' : 'Missing'}
                          </div>
                          <div>
                            Blockchain Hash:{' '}
                            {fallbackData.blockchainTxHash
                              ? 'Available'
                              : 'Missing'}
                          </div>
                          <div>
                            Order ID: {fallbackData.orderId || 'Missing'}
                          </div>
                          <div>
                            Buyer Email: {fallbackData.buyerEmail || 'Missing'}
                          </div>
                        </>
                      )}
                      {this.state.errorInfo && (
                        <details className='mt-2'>
                          <summary className='cursor-pointer font-semibold'>
                            Component Stack
                          </summary>
                          <pre className='mt-1 text-xs whitespace-pre-wrap'>
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default OrderCompletionCardErrorBoundary;
