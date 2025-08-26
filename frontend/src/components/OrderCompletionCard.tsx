import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ExternalLink,
  CheckCircle,
  CreditCard,
  Link as LinkIcon,
  Sparkles,
  Mail,
  Package,
  MapPin,
  DollarSign,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import confetti from 'canvas-confetti';
import type { OrderCompletionData } from '../utils/WorkflowDataExtractor';

interface OrderCompletionCardProps {
  isVisible: boolean;
  onClose: () => void;
  orderData: OrderCompletionData;
}

// Confetti function using canvas-confetti
const triggerConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0.1, y: 0.8 },
      colors: colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 0.9, y: 0.8 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};

const OrderCompletionCard: React.FC<OrderCompletionCardProps> = ({
  isVisible,
  onClose,
  orderData,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Debug: Log the order data when component renders
  console.log('🎯 OrderCompletionCard RENDER:', {
    isVisible,
    orderData: {
      ...orderData,
      paymentLinkLength: orderData.paymentLink?.length,
      hasPaymentLink: !!orderData.paymentLink,
    },
    timestamp: new Date().toISOString(),
  });

  // Log when visibility changes
  useEffect(() => {
    console.log('🎯 OrderCompletionCard visibility changed:', isVisible);
  }, [isVisible]);

  // Simple close handler with guard against multiple calls
  const handleClose = () => {
    if (isClosing) return; // Prevent multiple calls

    console.log('🔴 Closing completion card');
    setIsClosing(true);
    setShowConfetti(false);

    // Add a small delay to prevent multiple calls
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 100);
  };

  useEffect(() => {
    if (isVisible && !showConfetti) {
      setShowConfetti(true);
      // Trigger confetti animation
      triggerConfetti();
      // Stop confetti after 5 seconds
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, showConfetti]);

  const handlePaymentClick = () => {
    console.log('💳 Opening payment link:', orderData.paymentLink);
    console.log('💳 Payment link validation:', {
      hasLink: !!orderData.paymentLink,
      isNotDemo:
        orderData.paymentLink !== 'https://checkout.stripe.com/pay/demo',
      includesStripe: orderData.paymentLink?.includes('checkout.stripe.com'),
      linkLength: orderData.paymentLink?.length,
      fullLink: orderData.paymentLink,
    });

    if (
      orderData.paymentLink &&
      orderData.paymentLink.includes('checkout.stripe.com')
    ) {
      console.log('💳 Opening valid Stripe link');
      window.open(orderData.paymentLink, '_blank', 'noopener,noreferrer');
    } else {
      console.error('Invalid or missing payment link:', orderData.paymentLink);

      // Show more helpful error message
      const errorMsg = !orderData.paymentLink
        ? 'Payment link is not available. The payment step may not have completed successfully.'
        : `Payment link appears invalid: ${orderData.paymentLink}`;

      alert(
        errorMsg + '\n\nPlease check the workflow logs or contact support.'
      );
    }
  };

  const handleBlockchainClick = () => {
    console.log('🔗 Opening blockchain link:', orderData.blockchainTxHash);
    if (
      orderData.blockchainTxHash &&
      orderData.blockchainTxHash !== '0x1234567890abcdef' &&
      orderData.blockchainTxHash.length >= 40 // Valid hash length check
    ) {
      // Clean the hash - remove any URL prefixes and ensure proper format
      let cleanHash = orderData.blockchainTxHash;

      // If it's a full URL, extract just the hash
      if (cleanHash.includes('/tx/')) {
        cleanHash = cleanHash.split('/tx/')[1];
      }

      // Remove 0x prefix if present, then add it back
      cleanHash = cleanHash.replace(/^0x/, '');

      // Validate hash format (should be 64 hex characters)
      if (!/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
        console.error('Invalid blockchain hash format:', cleanHash);
        alert('Invalid blockchain transaction hash format');
        return;
      }

      // Open PolygonScan with the clean hash - using amoy.polygonscan.com as specified in requirements
      const url = `https://amoy.polygonscan.com/tx/0x${cleanHash}`;
      console.log('🔗 Opening URL:', url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.error(
        'Invalid or missing blockchain hash:',
        orderData.blockchainTxHash
      );
      alert('Blockchain transaction hash not available or invalid');
    }
  };

  if (!isVisible) return null;

  return (
    <div className='fixed inset-0 z-[9999] flex items-center justify-center p-4'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer'
        onClick={handleClose}
      />

      {/* Card */}
      <motion.div
        className='relative z-10 w-full max-w-2xl'
        initial={{ scale: 0.8, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <Card className='w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white via-green-50 to-emerald-50 dark:from-slate-900 dark:via-green-950 dark:to-emerald-950 border-2 border-green-200 dark:border-green-800 shadow-2xl relative'>
          {/* Close button */}
          <button
            className='absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-red-100 dark:bg-slate-800/80 dark:hover:bg-red-900 transition-colors cursor-pointer'
            onClick={handleClose}
            type='button'
            aria-label='Close completion card'
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
              <div className='relative'>
                <CheckCircle className='w-16 h-16 text-green-500' />
                <motion.div
                  className='absolute -top-1 -right-1'
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className='w-6 h-6 text-yellow-500' />
                </motion.div>
              </div>
            </motion.div>

            <motion.h2
              className='text-3xl font-bold text-green-700 dark:text-green-300 mb-2'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Order Completed Successfully! 🎉
            </motion.h2>

            <motion.p
              className='text-slate-600 dark:text-slate-300'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Your order has been processed and is ready for payment
            </motion.p>
          </CardHeader>

          <CardContent className='space-y-6 pb-4'>
            {/* Order Summary */}
            <motion.div
              className='bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 border border-green-200 dark:border-green-800'
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                <CheckCircle className='w-5 h-5 text-green-500' />
                Order Summary
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                <div className='flex items-center gap-2'>
                  <Hash className='w-4 h-4 text-slate-400' />
                  <div>
                    <span className='text-slate-500 dark:text-slate-400'>
                      Order ID:
                    </span>
                    <p className='font-mono font-medium'>{orderData.orderId}</p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Package className='w-4 h-4 text-slate-400' />
                  <div>
                    <span className='text-slate-500 dark:text-slate-400'>
                      Model:
                    </span>
                    <p className='font-medium'>{orderData.model}</p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Package className='w-4 h-4 text-slate-400' />
                  <div>
                    <span className='text-slate-500 dark:text-slate-400'>
                      Quantity:
                    </span>
                    <p className='font-medium'>{orderData.quantity}</p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <DollarSign className='w-4 h-4 text-green-500' />
                  <div>
                    <span className='text-slate-500 dark:text-slate-400'>
                      Total Amount:
                    </span>
                    <p className='font-bold text-green-600 dark:text-green-400'>
                      {orderData.totalAmount}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Mail className='w-4 h-4 text-slate-400' />
                  <div>
                    <span className='text-slate-500 dark:text-slate-400'>
                      Buyer:
                    </span>
                    <p className='font-medium'>{orderData.buyerEmail}</p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <MapPin className='w-4 h-4 text-slate-400' />
                  <div>
                    <span className='text-slate-500 dark:text-slate-400'>
                      Delivery:
                    </span>
                    <p className='font-medium'>{orderData.deliveryLocation}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Payment and Blockchain Details */}
            <motion.div
              className='bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 border border-blue-200 dark:border-blue-800'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                <LinkIcon className='w-5 h-5 text-blue-500' />
                Transaction Details
              </h3>

              <div className='space-y-4'>
                {/* Payment Link */}
                <div className='p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800'>
                  <div className='flex items-center gap-2 mb-2'>
                    <CreditCard className='w-4 h-4 text-blue-500' />
                    <span className='text-sm font-medium text-blue-700 dark:text-blue-300'>
                      Payment Link
                    </span>
                  </div>
                  {orderData.paymentLink ? (
                    <div className='flex items-center gap-2'>
                      <p className='text-xs font-mono text-blue-600 dark:text-blue-400 truncate flex-1'>
                        {orderData.paymentLink.substring(0, 50)}...
                      </p>
                      <Badge variant='secondary' className='text-xs'>
                        Ready
                      </Badge>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2'>
                      <AlertCircle className='w-4 h-4 text-amber-500' />
                      <p className='text-xs text-amber-600 dark:text-amber-400'>
                        Payment link not available
                      </p>
                    </div>
                  )}
                </div>

                {/* Blockchain Hash */}
                {orderData.blockchainTxHash ? (
                  <div className='p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800'>
                    <div className='flex items-center gap-2 mb-2'>
                      <LinkIcon className='w-4 h-4 text-purple-500' />
                      <span className='text-sm font-medium text-purple-700 dark:text-purple-300'>
                        Blockchain Transaction
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <p className='text-xs font-mono text-purple-600 dark:text-purple-400 truncate flex-1'>
                        {orderData.blockchainTxHash}
                      </p>
                      <Badge variant='secondary' className='text-xs'>
                        Recorded
                      </Badge>
                    </div>
                    <p className='text-xs text-purple-500 dark:text-purple-400 mt-1'>
                      View on Polygon Amoy Testnet
                    </p>
                  </div>
                ) : (
                  <div className='p-4 bg-gray-50 dark:bg-gray-950/30 rounded-lg border border-gray-200 dark:border-gray-800'>
                    <div className='flex items-center gap-2'>
                      <AlertCircle className='w-4 h-4 text-gray-500' />
                      <span className='text-sm text-gray-600 dark:text-gray-400'>
                        Blockchain transaction not available
                      </span>
                    </div>
                  </div>
                )}

                {/* Email Confirmation */}
                {orderData.emailConfirmationId && (
                  <div className='p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Mail className='w-4 h-4 text-green-500' />
                      <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                        Email Confirmation
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <p className='text-xs font-mono text-green-600 dark:text-green-400'>
                        ID: {orderData.emailConfirmationId}
                      </p>
                      <Badge variant='secondary' className='text-xs'>
                        Sent
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className='flex flex-col sm:flex-row gap-4'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {/* Payment Button - Always visible with enhanced styling */}
              <button
                onClick={handlePaymentClick}
                disabled={
                  !orderData.paymentLink ||
                  !orderData.paymentLink.includes('checkout.stripe.com')
                }
                className={`flex-1 font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 ${
                  orderData.paymentLink &&
                  orderData.paymentLink.includes('checkout.stripe.com')
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transform hover:scale-105'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed opacity-75'
                }`}
                type='button'
              >
                <CreditCard className='w-5 h-5' />
                <div className='flex flex-col items-center'>
                  <span>
                    {orderData.paymentLink &&
                    orderData.paymentLink.includes('checkout.stripe.com')
                      ? 'Complete Payment'
                      : 'Payment Link Unavailable'}
                  </span>
                  {orderData.paymentLink &&
                    orderData.paymentLink.includes('checkout.stripe.com') && (
                      <span className='text-xs opacity-90'>
                        Secure Stripe Checkout
                      </span>
                    )}
                </div>
                <ExternalLink className='w-4 h-4' />
              </button>

              {/* Blockchain Button - Enhanced with fallback display */}
              <button
                onClick={handleBlockchainClick}
                disabled={!orderData.blockchainTxHash}
                className={`flex-1 font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 ${
                  orderData.blockchainTxHash
                    ? 'border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:border-purple-700 dark:hover:bg-purple-950 transform hover:scale-105'
                    : 'border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-75'
                }`}
                type='button'
              >
                <LinkIcon className='w-5 h-5' />
                <div className='flex flex-col items-center'>
                  <span>
                    {orderData.blockchainTxHash
                      ? 'View on Blockchain'
                      : 'Blockchain Pending'}
                  </span>
                  {orderData.blockchainTxHash && (
                    <span className='text-xs opacity-75'>
                      Polygon Amoy Testnet
                    </span>
                  )}
                </div>
                <ExternalLink className='w-4 h-4' />
              </button>
            </motion.div>

            {/* Status Badges */}
            <motion.div
              className='flex flex-wrap gap-2 justify-center'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Badge
                variant='secondary'
                className='bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center gap-1'
              >
                <CheckCircle className='w-3 h-3' />
                Order Processed
              </Badge>
              <Badge
                variant='secondary'
                className={`flex items-center gap-1 ${
                  orderData.paymentLink
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                }`}
              >
                <CreditCard className='w-3 h-3' />
                {orderData.paymentLink ? 'Payment Ready' : 'Payment Pending'}
              </Badge>
              <Badge
                variant='secondary'
                className={`flex items-center gap-1 ${
                  orderData.blockchainTxHash
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                }`}
              >
                <LinkIcon className='w-3 h-3' />
                {orderData.blockchainTxHash
                  ? 'Blockchain Recorded'
                  : 'Blockchain Pending'}
              </Badge>
              <Badge
                variant='secondary'
                className='bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 flex items-center gap-1'
              >
                <Mail className='w-3 h-3' />
                Email Sent
              </Badge>
            </motion.div>

            {/* Debug Info (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <motion.div
                className='text-xs text-slate-500 dark:text-slate-400 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <div className='font-mono space-y-1'>
                  <div className='font-semibold mb-2'>
                    WorkflowDataExtractor Debug Info:
                  </div>
                  <div>
                    Payment Link:{' '}
                    {orderData.paymentLink ? '✅ Present' : '❌ Missing'}
                  </div>
                  <div>Link Length: {orderData.paymentLink?.length || 0}</div>
                  <div>
                    Link Valid:{' '}
                    {orderData.paymentLink?.includes('checkout.stripe.com')
                      ? '✅ Valid Stripe'
                      : '❌ Invalid/Missing'}
                  </div>
                  <div>
                    Blockchain Hash:{' '}
                    {orderData.blockchainTxHash ? '✅ Present' : '❌ Missing'}
                  </div>
                  <div>
                    Hash Length: {orderData.blockchainTxHash?.length || 0}
                  </div>
                  <div>
                    Hash Format:{' '}
                    {orderData.blockchainTxHash &&
                    /^0x[a-fA-F0-9]{64}$/.test(orderData.blockchainTxHash)
                      ? '✅ Valid'
                      : '❌ Invalid'}
                  </div>
                  <div>Buyer Email: {orderData.buyerEmail}</div>
                  <div>Model: {orderData.model}</div>
                  <div>Quantity: {orderData.quantity}</div>
                  <div>Total Amount: {orderData.totalAmount}</div>
                  <div>Delivery Location: {orderData.deliveryLocation}</div>
                  {orderData.emailConfirmationId && (
                    <div>Email ID: {orderData.emailConfirmationId}</div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Footer */}
            <motion.div
              className='text-center text-sm text-slate-500 dark:text-slate-400 pt-4 border-t border-green-200 dark:border-green-800'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
            >
              <div className='space-y-2'>
                <p>
                  Thank you for your order! A confirmation email has been sent
                  to{' '}
                  <span className='font-medium text-slate-700 dark:text-slate-300'>
                    {orderData.buyerEmail}
                  </span>
                </p>
                <div className='flex items-center justify-center gap-4 text-xs'>
                  {orderData.paymentLink && (
                    <span className='flex items-center gap-1'>
                      <CheckCircle className='w-3 h-3 text-green-500' />
                      Payment link ready
                    </span>
                  )}
                  {orderData.blockchainTxHash && (
                    <span className='flex items-center gap-1'>
                      <CheckCircle className='w-3 h-3 text-purple-500' />
                      Blockchain verified
                    </span>
                  )}
                  <span className='flex items-center gap-1'>
                    <CheckCircle className='w-3 h-3 text-orange-500' />
                    Email delivered
                  </span>
                </div>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OrderCompletionCard;
