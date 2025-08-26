import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Copy, CheckCircle, Clock, XCircle } from 'lucide-react';
import DataTable, { type Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { mockBlockchainTransactions, mockOrders } from '../lib/mockData';
import type { BlockchainTransaction } from '../types';
import { toast } from '../lib/toast';
import {
  ellipsizeHash,
  formatBlockchainTimestamp,
  getPolygonscanTxUrl,
  openExternalUrl,
  copyToClipboard,
  getCurrentNetwork,
  formatGasAmount,
} from '../lib/blockchain';

// Transaction Flow Component
const TransactionFlow: React.FC<{ transaction: BlockchainTransaction }> = ({
  transaction,
}) => {
  // Determine step completion based on transaction type and status
  const getStepStatus = (stepType: string) => {
    switch (stepType) {
      case 'order':
        return true; // Order step is always completed if we have a transaction
      case 'payment':
        return transaction.type === 'payment' || transaction.type === 'anchor';
      case 'anchor':
        return (
          transaction.type === 'anchor' && transaction.status === 'confirmed'
        );
      default:
        return false;
    }
  };

  const steps = [
    {
      key: 'order',
      label: 'Order',
      completed: getStepStatus('order'),
      icon: CheckCircle,
    },
    {
      key: 'payment',
      label: 'Payment',
      completed: getStepStatus('payment'),
      icon:
        transaction.type === 'payment' && transaction.status === 'pending'
          ? Clock
          : CheckCircle,
    },
    {
      key: 'anchor',
      label: 'Anchor',
      completed: getStepStatus('anchor'),
      icon:
        transaction.type === 'anchor' && transaction.status === 'pending'
          ? Clock
          : transaction.type === 'anchor' && transaction.status === 'confirmed'
          ? CheckCircle
          : Clock,
    },
  ];

  return (
    <div className='flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full px-3 py-1.5 border border-slate-200 dark:border-slate-700'>
      {steps.map((step, index) => {
        const IconComponent = step.icon;
        const isActive = transaction.type === step.key;
        const isPending = isActive && transaction.status === 'pending';

        return (
          <React.Fragment key={step.key}>
            <motion.div
              className='flex items-center gap-1'
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                animate={
                  isPending
                    ? {
                        scale: [1, 1.1, 1],
                        opacity: [0.7, 1, 0.7],
                      }
                    : {}
                }
                transition={
                  isPending
                    ? {
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }
                    : {}
                }
              >
                <IconComponent
                  className={`w-3.5 h-3.5 ${
                    step.completed
                      ? 'text-emerald-500'
                      : isPending
                      ? 'text-amber-500'
                      : 'text-slate-400'
                  }`}
                />
              </motion.div>
              <span
                className={`text-xs font-medium ${
                  step.completed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isPending
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </motion.div>
            {index < steps.length - 1 && (
              <motion.div
                className={`w-3 h-0.5 rounded-full transition-colors duration-300 ${
                  steps[index + 1].completed
                    ? 'bg-emerald-500'
                    : steps[index + 1].key === transaction.type &&
                      transaction.status === 'pending'
                    ? 'bg-amber-500'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: (index + 0.5) * 0.1 }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Blockchain: React.FC = () => {
  // Enhanced transaction data with buyer email from orders
  const enhancedTransactions = useMemo(() => {
    return mockBlockchainTransactions.map((transaction) => {
      const order = mockOrders.find((o) => o.id === transaction.orderId);
      return {
        ...transaction,
        buyerEmail: order?.buyerEmail || 'Unknown',
      };
    });
  }, []);

  // Handle copy transaction hash
  const handleCopyHash = async (txHash: string) => {
    try {
      const success = await copyToClipboard(txHash);
      if (success) {
        toast.success('Transaction hash copied to clipboard');
      } else {
        toast.error('Failed to copy transaction hash');
      }
    } catch (error) {
      toast.error('Failed to copy transaction hash');
    }
  };

  // Handle open on Polygonscan
  const handleOpenPolygonscan = (txHash: string) => {
    try {
      const url = getPolygonscanTxUrl(txHash);
      openExternalUrl(url, `polygonscan-${txHash}`);
    } catch (error) {
      toast.error('Failed to open Polygonscan link');
      console.error('Polygonscan error:', error);
    }
  };

  // Define table columns
  const columns: Column<(typeof enhancedTransactions)[0]>[] = [
    {
      key: 'orderId',
      header: 'Order ID',
      width: 'w-32',
      render: (value) => (
        <span className='font-mono text-sm text-blue-600'>{value}</span>
      ),
    },
    {
      key: 'buyerEmail',
      header: 'Buyer Email',
      width: 'w-48',
      render: (value) => (
        <span className='text-sm text-foreground'>{value}</span>
      ),
    },
    {
      key: 'txHash',
      header: 'Transaction Hash',
      width: 'w-40',
      render: (value, row) => (
        <div className='flex items-center gap-2'>
          <span className='font-mono text-sm text-slate-600'>
            {ellipsizeHash(value)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyHash(value);
            }}
            className='p-1 hover:bg-muted rounded transition-colors'
            title='Copy full hash'
          >
            <Copy className='w-3 h-3 text-slate-500' />
          </button>
        </div>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      width: 'w-44',
      render: (value) => (
        <span className='text-sm text-slate-600'>
          {formatBlockchainTimestamp(value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-28',
      render: (value) => (
        <StatusBadge
          status={
            value === 'confirmed'
              ? 'completed'
              : value === 'pending'
              ? 'pending'
              : 'failed'
          }
          size='sm'
        />
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-24',
      render: (value) => (
        <span className='text-sm capitalize text-slate-600'>{value}</span>
      ),
    },
    {
      key: 'flow',
      header: 'Flow',
      width: 'w-48',
      render: (_, row) => <TransactionFlow transaction={row} />,
    },
    {
      key: 'gasUsed',
      header: 'Gas Used',
      width: 'w-24',
      render: (value) => (
        <span className='text-sm text-slate-600'>
          {value ? formatGasAmount(value) : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 'w-32',
      sortable: false,
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPolygonscan(row.txHash);
          }}
          className='flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors'
          title='View on Polygonscan'
        >
          <ExternalLink className='w-3 h-3' />
          Polygonscan
        </button>
      ),
    },
  ];

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-foreground mb-2'>
              Blockchain Transactions
            </h1>
            <p className='text-muted-foreground'>
              Track all blockchain transactions and their verification status on
              Polygon network
            </p>
          </div>

          {/* Network Status Badge */}
          <div className='flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl'>
            <div className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
            <span className='text-sm font-medium text-emerald-600'>
              {getCurrentNetwork().name} Connected
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className='grid grid-cols-1 md:grid-cols-4 gap-6'
      >
        <div className='bg-card rounded-2xl border border-border/50 p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground'>
                Total Transactions
              </p>
              <p className='text-2xl font-bold text-foreground'>
                {enhancedTransactions.length}
              </p>
            </div>
            <div className='w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center'>
              <CheckCircle className='w-6 h-6 text-blue-500' />
            </div>
          </div>
        </div>

        <div className='bg-card rounded-2xl border border-border/50 p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground'>Confirmed</p>
              <p className='text-2xl font-bold text-emerald-600'>
                {
                  enhancedTransactions.filter((tx) => tx.status === 'confirmed')
                    .length
                }
              </p>
            </div>
            <div className='w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center'>
              <CheckCircle className='w-6 h-6 text-emerald-500' />
            </div>
          </div>
        </div>

        <div className='bg-card rounded-2xl border border-border/50 p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground'>Pending</p>
              <p className='text-2xl font-bold text-amber-600'>
                {
                  enhancedTransactions.filter((tx) => tx.status === 'pending')
                    .length
                }
              </p>
            </div>
            <div className='w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center'>
              <Clock className='w-6 h-6 text-amber-500' />
            </div>
          </div>
        </div>

        <div className='bg-card rounded-2xl border border-border/50 p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground'>Failed</p>
              <p className='text-2xl font-bold text-rose-600'>
                {
                  enhancedTransactions.filter((tx) => tx.status === 'failed')
                    .length
                }
              </p>
            </div>
            <div className='w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center'>
              <XCircle className='w-6 h-6 text-rose-500' />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <DataTable
          data={enhancedTransactions}
          columns={columns}
          searchable={true}
          sortable={true}
          pagination={true}
          pageSize={10}
          className='shadow-xl'
        />
      </motion.div>
    </div>
  );
};

export default Blockchain;
