import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from './StatusBadge';
import type { Order } from '@/types';
import {
  Package,
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  Truck,
  Calendar,
  DollarSign,
  CreditCard,
  ExternalLink,
  Copy,
  CheckCircle,
  Star,
  Clock,
  Hash,
  FileText,
} from 'lucide-react';

export interface OrderDetailDrawerProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
  order?: Order;
  loading?: boolean;
}

const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  orderId,
  open,
  onClose,
  order,
  loading = false,
}) => {
  const [copiedPaymentLink, setCopiedPaymentLink] = useState(false);

  const handleCopyPaymentLink = async () => {
    if (order?.paymentLink) {
      try {
        await navigator.clipboard.writeText(order.paymentLink);
        setCopiedPaymentLink(true);
        setTimeout(() => setCopiedPaymentLink(false), 2000);
        // Use enhanced toast system
        const { toast } = await import('../lib/toast');
        toast.success('Payment link copied to clipboard');
      } catch (err) {
        console.error('Failed to copy payment link:', err);
      }
    }
  };

  const handleViewOnPolygonscan = () => {
    if (order?.blockchainTx) {
      const polygonscanUrl = `https://polygonscan.com/tx/${order.blockchainTx}`;
      window.open(polygonscanUrl, '_blank');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const truncateHash = (hash: string, startLength = 6, endLength = 4) => {
    if (hash.length <= startLength + endLength) return hash;
    return `${hash.slice(0, startLength)}...${hash.slice(-endLength)}`;
  };

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className='w-full sm:max-w-2xl overflow-y-auto'>
          <SheetHeader>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-4 w-32' />
          </SheetHeader>
          <div className='mt-6 space-y-4'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-64 w-full' />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!order) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className='w-full sm:max-w-2xl'>
          <SheetHeader>
            <SheetTitle>Order Not Found</SheetTitle>
            <SheetDescription>
              The order with ID {orderId} could not be found.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className='w-full sm:max-w-2xl overflow-y-auto'>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <SheetHeader className='pb-6'>
            <div className='flex items-center justify-between'>
              <div>
                <SheetTitle className='text-xl font-semibold'>
                  Order #{order.id}
                </SheetTitle>
                <SheetDescription className='flex items-center gap-2 mt-1'>
                  <StatusBadge status={order.status} size='sm' />
                  <span>•</span>
                  <span>{formatDate(order.updatedAt)}</span>
                </SheetDescription>
              </div>
              <div className='flex gap-2'>
                {order.paymentLink && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleCopyPaymentLink}
                    className='gap-2'
                  >
                    {copiedPaymentLink ? (
                      <CheckCircle className='h-4 w-4' />
                    ) : (
                      <Copy className='h-4 w-4' />
                    )}
                    {copiedPaymentLink ? 'Copied!' : 'Copy Payment Link'}
                  </Button>
                )}
                {order.blockchainTx && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleViewOnPolygonscan}
                    className='gap-2'
                  >
                    <ExternalLink className='h-4 w-4' />
                    Polygonscan
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue='summary' className='w-full'>
            <TabsList className='grid w-full grid-cols-4 rounded-2xl'>
              <TabsTrigger value='summary' className='rounded-xl'>
                Summary
              </TabsTrigger>
              <TabsTrigger value='pricing' className='rounded-xl'>
                Pricing & Finance
              </TabsTrigger>
              <TabsTrigger value='logistics' className='rounded-xl'>
                Logistics
              </TabsTrigger>
              <TabsTrigger value='blockchain' className='rounded-xl'>
                Blockchain
              </TabsTrigger>
            </TabsList>

            <TabsContent value='summary' className='mt-6 space-y-6'>
              {/* Buyer Information */}
              <Card className='rounded-2xl border-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 shadow-xl'>
                <CardHeader className='pb-4'>
                  <CardTitle className='flex items-center gap-2 text-lg'>
                    <User className='h-5 w-5' />
                    Buyer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                        <Mail className='h-4 w-4' />
                        Email
                      </div>
                      <p className='font-medium'>{order.buyer.email}</p>
                    </div>
                    {order.buyer.name && (
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <User className='h-4 w-4' />
                          Name
                        </div>
                        <p className='font-medium'>{order.buyer.name}</p>
                      </div>
                    )}
                    {order.buyer.company && (
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Building2 className='h-4 w-4' />
                          Company
                        </div>
                        <p className='font-medium'>{order.buyer.company}</p>
                      </div>
                    )}
                    {order.buyer.phone && (
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Phone className='h-4 w-4' />
                          Phone
                        </div>
                        <p className='font-medium'>{order.buyer.phone}</p>
                      </div>
                    )}
                  </div>
                  {order.buyer.address && (
                    <div className='space-y-2 pt-2 border-t'>
                      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                        <MapPin className='h-4 w-4' />
                        Address
                      </div>
                      <p className='font-medium'>
                        {order.buyer.address.street}, {order.buyer.address.city}
                        , {order.buyer.address.state}{' '}
                        {order.buyer.address.zipCode},{' '}
                        {order.buyer.address.country}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card className='rounded-2xl border-0 bg-gradient-to-br from-green-500/5 to-blue-500/5 shadow-xl'>
                <CardHeader className='pb-4'>
                  <CardTitle className='flex items-center gap-2 text-lg'>
                    <Package className='h-5 w-5' />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    {order.items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className='flex items-center justify-between p-4 rounded-xl bg-background/50 border'
                      >
                        <div className='flex-1'>
                          <h4 className='font-medium'>{item.name}</h4>
                          <p className='text-sm text-muted-foreground'>
                            Model: {item.model}
                          </p>
                          {item.specifications && (
                            <div className='mt-2 flex flex-wrap gap-1'>
                              {Object.entries(item.specifications).map(
                                ([key, value]) => (
                                  <Badge
                                    key={key}
                                    variant='secondary'
                                    className='text-xs'
                                  >
                                    {key}: {String(value)}
                                  </Badge>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        <div className='text-right'>
                          <p className='font-medium'>
                            {formatCurrency(item.totalPrice, order.currency)}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {item.quantity} ×{' '}
                            {formatCurrency(item.unitPrice, order.currency)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Supplier Information */}
              {order.supplier && (
                <Card className='rounded-2xl border-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 shadow-xl'>
                  <CardHeader className='pb-4'>
                    <CardTitle className='flex items-center gap-2 text-lg'>
                      <Building2 className='h-5 w-5' />
                      Supplier Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Building2 className='h-4 w-4' />
                          Company
                        </div>
                        <p className='font-medium'>{order.supplier.company}</p>
                      </div>
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Mail className='h-4 w-4' />
                          Email
                        </div>
                        <p className='font-medium'>{order.supplier.email}</p>
                      </div>
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Star className='h-4 w-4' />
                          Rating
                        </div>
                        <div className='flex items-center gap-1'>
                          <span className='font-medium'>
                            {order.supplier.rating}
                          </span>
                          <div className='flex'>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(order.supplier!.rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Clock className='h-4 w-4' />
                          Lead Time
                        </div>
                        <p className='font-medium'>
                          {order.supplier.leadTime} days
                        </p>
                      </div>
                    </div>
                    <div className='space-y-2 pt-2 border-t'>
                      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                        <MapPin className='h-4 w-4' />
                        Address
                      </div>
                      <p className='font-medium'>
                        {order.supplier.address.street},{' '}
                        {order.supplier.address.city},{' '}
                        {order.supplier.address.state}{' '}
                        {order.supplier.address.zipCode},{' '}
                        {order.supplier.address.country}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value='pricing' className='mt-6 space-y-6'>
              {order.finance ? (
                <Card className='rounded-2xl border-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 shadow-xl'>
                  <CardHeader className='pb-4'>
                    <CardTitle className='flex items-center gap-2 text-lg'>
                      <DollarSign className='h-5 w-5' />
                      Financial Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-3'>
                      <div className='flex justify-between items-center'>
                        <span className='text-muted-foreground'>Subtotal</span>
                        <span className='font-medium'>
                          {formatCurrency(
                            order.finance.subtotal,
                            order.finance.currency
                          )}
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='text-muted-foreground'>Tax</span>
                        <span className='font-medium'>
                          {formatCurrency(
                            order.finance.tax,
                            order.finance.currency
                          )}
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='text-muted-foreground'>Shipping</span>
                        <span className='font-medium'>
                          {formatCurrency(
                            order.finance.shipping,
                            order.finance.currency
                          )}
                        </span>
                      </div>
                      <Separator />
                      <div className='flex justify-between items-center text-lg font-semibold'>
                        <span>Total</span>
                        <span>
                          {formatCurrency(
                            order.finance.total,
                            order.finance.currency
                          )}
                        </span>
                      </div>
                    </div>

                    {order.finance.paymentMethod && (
                      <div className='pt-4 border-t space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <CreditCard className='h-4 w-4' />
                          Payment Method
                        </div>
                        <p className='font-medium'>
                          {order.finance.paymentMethod}
                        </p>
                      </div>
                    )}

                    <div className='pt-2 space-y-2'>
                      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                        Payment Status
                      </div>
                      <StatusBadge
                        status={
                          order.finance.paymentStatus === 'processing'
                            ? 'processing'
                            : order.finance.paymentStatus === 'completed'
                            ? 'completed'
                            : order.finance.paymentStatus === 'failed'
                            ? 'failed'
                            : 'pending'
                        }
                        size='sm'
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className='rounded-2xl border-0 bg-gradient-to-br from-gray-500/5 to-slate-500/5 shadow-xl'>
                  <CardContent className='flex items-center justify-center py-12'>
                    <div className='text-center'>
                      <DollarSign className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                      <p className='text-muted-foreground'>
                        Financial information not available yet
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value='logistics' className='mt-6 space-y-6'>
              {order.logistics ? (
                <Card className='rounded-2xl border-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 shadow-xl'>
                  <CardHeader className='pb-4'>
                    <CardTitle className='flex items-center gap-2 text-lg'>
                      <Truck className='h-5 w-5' />
                      Logistics Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Truck className='h-4 w-4' />
                          Shipping Method
                        </div>
                        <p className='font-medium'>
                          {order.logistics.shippingMethod}
                        </p>
                      </div>
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Calendar className='h-4 w-4' />
                          Estimated Delivery
                        </div>
                        <p className='font-medium'>
                          {formatDate(order.logistics.estimatedDelivery)}
                        </p>
                      </div>
                      {order.logistics.carrier && (
                        <div className='space-y-2'>
                          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                            <Building2 className='h-4 w-4' />
                            Carrier
                          </div>
                          <p className='font-medium'>
                            {order.logistics.carrier}
                          </p>
                        </div>
                      )}
                      {order.logistics.trackingNumber && (
                        <div className='space-y-2'>
                          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                            <Hash className='h-4 w-4' />
                            Tracking Number
                          </div>
                          <p className='font-medium font-mono'>
                            {order.logistics.trackingNumber}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className='pt-2 border-t'>
                      <div className='flex justify-between items-center'>
                        <span className='text-muted-foreground'>
                          Shipping Cost
                        </span>
                        <span className='font-medium'>
                          {formatCurrency(
                            order.logistics.shippingCost,
                            order.currency
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className='rounded-2xl border-0 bg-gradient-to-br from-gray-500/5 to-slate-500/5 shadow-xl'>
                  <CardContent className='flex items-center justify-center py-12'>
                    <div className='text-center'>
                      <Truck className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                      <p className='text-muted-foreground'>
                        Logistics information not available yet
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value='blockchain' className='mt-6 space-y-6'>
              {order.blockchainTx ? (
                <Card className='rounded-2xl border-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 shadow-xl'>
                  <CardHeader className='pb-4'>
                    <CardTitle className='flex items-center gap-2 text-lg'>
                      <Hash className='h-5 w-5' />
                      Blockchain Transaction
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-3'>
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Hash className='h-4 w-4' />
                          Transaction Hash
                        </div>
                        <div className='flex items-center gap-2'>
                          <code className='font-mono text-sm bg-muted px-2 py-1 rounded'>
                            {truncateHash(order.blockchainTx)}
                          </code>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={handleViewOnPolygonscan}
                            className='gap-2'
                          >
                            <ExternalLink className='h-4 w-4' />
                            View on Polygonscan
                          </Button>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          Status
                        </div>
                        <StatusBadge status='completed' size='sm' />
                      </div>

                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Calendar className='h-4 w-4' />
                          Recorded At
                        </div>
                        <p className='font-medium'>
                          {formatDate(order.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <div className='pt-4 border-t'>
                      <div className='flex items-center gap-2 text-sm text-muted-foreground mb-3'>
                        <FileText className='h-4 w-4' />
                        Transaction Flow
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-sm'>
                          <CheckCircle className='h-4 w-4' />
                          Order
                        </div>
                        <div className='w-4 h-px bg-border'></div>
                        <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-sm'>
                          <CheckCircle className='h-4 w-4' />
                          Payment
                        </div>
                        <div className='w-4 h-px bg-border'></div>
                        <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-sm'>
                          <CheckCircle className='h-4 w-4' />
                          Anchor
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className='rounded-2xl border-0 bg-gradient-to-br from-gray-500/5 to-slate-500/5 shadow-xl'>
                  <CardContent className='flex items-center justify-center py-12'>
                    <div className='text-center'>
                      <Hash className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                      <p className='text-muted-foreground'>
                        Blockchain transaction not recorded yet
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
};

export default OrderDetailDrawer;
