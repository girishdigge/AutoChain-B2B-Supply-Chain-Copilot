import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DataTable, { type Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import OrderDetailDrawer from '@/components/OrderDetailDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '../lib/toast';
import type { Order } from '@/types';
import { mockOrders } from '@/lib/mockData';
import {
  Eye,
  Copy,
  ExternalLink,
  Filter,
  Download,
  Plus,
  Workflow,
} from 'lucide-react';

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter orders based on status
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return mockOrders;
    return mockOrders.filter((order) => order.status === statusFilter);
  }, [statusFilter]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    setDrawerOpen(true);
  };

  const handleViewWorkflow = (order: Order) => {
    navigate(`/workflow?orderId=${order.id}`);
  };

  const handleCopyPaymentLink = async (order: Order) => {
    if (order.paymentLink) {
      try {
        await navigator.clipboard.writeText(order.paymentLink);
        toast.success('Payment link copied to clipboard');
      } catch (err) {
        toast.error('Failed to copy payment link');
      }
    } else {
      toast.error('No payment link available for this order');
    }
  };

  const handleViewOnPolygonscan = (order: Order) => {
    if (order.blockchainTx) {
      const polygonscanUrl = `https://polygonscan.com/tx/${order.blockchainTx}`;
      window.open(polygonscanUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('No blockchain transaction available for this order');
    }
  };

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: 'Order ID',
      width: 'w-32',
      render: (value: string) => (
        <code className='text-sm font-mono bg-muted px-2 py-1 rounded'>
          {value}
        </code>
      ),
    },
    {
      key: 'buyerEmail',
      header: 'Buyer Email',
      width: 'w-48',
      render: (value: string) => (
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium'>
            {value.charAt(0).toUpperCase()}
          </div>
          <span className='truncate'>{value}</span>
        </div>
      ),
    },
    {
      key: 'model',
      header: 'Model',
      width: 'w-64',
      render: (value: string) => (
        <div className='max-w-xs'>
          <p className='font-medium truncate'>{value}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      width: 'w-20',
      render: (value: number) => (
        <Badge variant='secondary' className='font-mono'>
          {value}
        </Badge>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      width: 'w-32',
      render: (value: number, row: Order) => (
        <span className='font-medium'>
          {value ? formatCurrency(value, row.currency) : 'N/A'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-32',
      render: (value: Order['status']) => (
        <StatusBadge status={value} size='sm' />
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      width: 'w-32',
      render: (value: string) => (
        <span className='text-sm text-muted-foreground'>
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 'w-48',
      sortable: false,
      render: (_, row: Order) => (
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='sm'
            onClick={(e) => {
              e.stopPropagation();
              handleViewOrder(row);
            }}
            className='h-8 w-8 p-0'
            title='View Details'
          >
            <Eye className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={(e) => {
              e.stopPropagation();
              handleViewWorkflow(row);
            }}
            className='h-8 w-8 p-0'
            title='View Workflow'
          >
            <Workflow className='h-4 w-4' />
          </Button>
          {row.paymentLink && (
            <Button
              variant='ghost'
              size='sm'
              onClick={(e) => {
                e.stopPropagation();
                handleCopyPaymentLink(row);
              }}
              className='h-8 w-8 p-0'
              title='Copy Payment Link'
            >
              <Copy className='h-4 w-4' />
            </Button>
          )}
          {row.blockchainTx && (
            <Button
              variant='ghost'
              size='sm'
              onClick={(e) => {
                e.stopPropagation();
                handleViewOnPolygonscan(row);
              }}
              className='h-8 w-8 p-0'
              title='View on Polygonscan'
            >
              <ExternalLink className='h-4 w-4' />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const selectedOrder = selectedOrderId
    ? mockOrders.find((order) => order.id === selectedOrderId)
    : undefined;

  return (
    <motion.div
      className='p-6 space-y-6'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
            Orders Management
          </h1>
          <p className='text-muted-foreground mt-1'>
            Track and manage all supply chain orders
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='outline' className='gap-2'>
            <Download className='h-4 w-4' />
            Export
          </Button>
          <Button className='gap-2'>
            <Plus className='h-4 w-4' />
            New Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        {[
          {
            label: 'Total Orders',
            value: mockOrders.length,
            color: 'from-blue-500/20 to-cyan-500/20',
          },
          {
            label: 'Pending',
            value: mockOrders.filter((o) => o.status === 'pending').length,
            color: 'from-amber-500/20 to-orange-500/20',
          },
          {
            label: 'Processing',
            value: mockOrders.filter((o) => o.status === 'processing').length,
            color: 'from-blue-500/20 to-indigo-500/20',
          },
          {
            label: 'Completed',
            value: mockOrders.filter((o) => o.status === 'completed').length,
            color: 'from-emerald-500/20 to-green-500/20',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className={`p-4 rounded-2xl border bg-gradient-to-br ${stat.color} backdrop-blur-sm`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className='text-2xl font-bold'>{stat.value}</div>
            <div className='text-sm text-muted-foreground'>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <Filter className='h-4 w-4 text-muted-foreground' />
          <span className='text-sm font-medium'>Filters:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='w-48'>
            <SelectValue placeholder='Filter by status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Status</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='processing'>Processing</SelectItem>
            <SelectItem value='completed'>Completed</SelectItem>
            <SelectItem value='failed'>Failed</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setStatusFilter('all')}
            className='text-muted-foreground hover:text-foreground'
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Orders Table */}
      <DataTable
        data={filteredOrders}
        columns={columns}
        searchable={true}
        sortable={true}
        pagination={true}
        pageSize={10}
        onRowClick={handleViewOrder}
        emptyState={
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <div className='w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4'>
              <Eye className='w-8 h-8 text-muted-foreground/50' />
            </div>
            <h3 className='text-lg font-medium text-foreground mb-2'>
              No Orders Found
            </h3>
            <p className='text-muted-foreground max-w-sm'>
              {statusFilter !== 'all'
                ? `No orders with status "${statusFilter}" found. Try adjusting your filters.`
                : 'No orders have been created yet. Create your first order to get started.'}
            </p>
          </div>
        }
        className='shadow-xl'
      />

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        orderId={selectedOrderId || ''}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrderId(null);
        }}
        order={selectedOrder}
      />
    </motion.div>
  );
};

export default Orders;
