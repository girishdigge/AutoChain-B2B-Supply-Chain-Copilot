import React, { useState, useEffect } from 'react';
import LogStream from './LogStream';
import { LogEntry } from '../types';

// Demo component to showcase LogStream functionality
const LogStreamDemo: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Generate sample log data
  useEffect(() => {
    const sampleLogs: LogEntry[] = [
      {
        timestamp: new Date(Date.now() - 10000).toISOString(),
        level: 'info',
        message: 'Starting order processing workflow',
        metadata: { orderId: 'ORD-001', step: 'initialization' },
      },
      {
        timestamp: new Date(Date.now() - 9000).toISOString(),
        level: 'debug',
        message: 'Validating order data structure',
        metadata: { validation: 'schema_check' },
      },
      {
        timestamp: new Date(Date.now() - 8000).toISOString(),
        level: 'info',
        message: 'Order validation completed successfully',
      },
      {
        timestamp: new Date(Date.now() - 7000).toISOString(),
        level: 'warn',
        message: 'Inventory level is low for requested item',
        metadata: { item: 'Widget-A', currentStock: 5, requested: 10 },
      },
      {
        timestamp: new Date(Date.now() - 6000).toISOString(),
        level: 'info',
        message: 'Contacting supplier for availability check',
      },
      {
        timestamp: new Date(Date.now() - 5000).toISOString(),
        level: 'info',
        message: 'Supplier confirmed availability with 3-day lead time',
        metadata: { supplier: 'ACME Corp', leadTime: '3 days' },
      },
      {
        timestamp: new Date(Date.now() - 4000).toISOString(),
        level: 'debug',
        message: 'Calculating shipping costs and logistics options',
      },
      {
        timestamp: new Date(Date.now() - 3000).toISOString(),
        level: 'info',
        message: 'Payment processing initiated',
        metadata: { amount: 1250.0, currency: 'USD' },
      },
      {
        timestamp: new Date(Date.now() - 2000).toISOString(),
        level: 'error',
        message: 'Payment gateway timeout - retrying with backup processor',
        metadata: { error: 'TIMEOUT', retryAttempt: 1 },
      },
      {
        timestamp: new Date(Date.now() - 1000).toISOString(),
        level: 'info',
        message: 'Payment processed successfully via backup gateway',
        metadata: { transactionId: 'TXN-789', processor: 'backup' },
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Order processing completed - blockchain anchoring initiated',
        metadata: { blockchainTx: '0x1234...abcd', status: 'pending' },
      },
    ];

    setLogs(sampleLogs);

    // Simulate real-time log updates
    const interval = setInterval(() => {
      const newLog: LogEntry = {
        timestamp: new Date().toISOString(),
        level: ['info', 'debug', 'warn', 'error'][
          Math.floor(Math.random() * 4)
        ] as any,
        message: [
          'Processing step completed',
          'Checking system health',
          'Network latency detected',
          'Cache miss - fetching from database',
          'User action logged',
          'Background task scheduled',
          'API rate limit approaching',
          'Data synchronization in progress',
        ][Math.floor(Math.random() * 8)],
        metadata: {
          timestamp: Date.now(),
          randomValue: Math.floor(Math.random() * 1000),
        },
      };

      setLogs((prev) => [...prev, newLog]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleLogClick = (log: LogEntry) => {
    console.log('Log clicked:', log);
    // In a real application, this might open a detailed view or copy to clipboard
  };

  return (
    <div className='p-6 space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-foreground mb-2'>
          LogStream Component Demo
        </h2>
        <p className='text-muted-foreground'>
          This demo shows the LogStream component with sample log data. New logs
          are added every 3 seconds to simulate real-time updates.
        </p>
      </div>

      <LogStream
        logs={logs}
        title='Workflow Processing Logs'
        maxHeight={500}
        autoScroll={true}
        filterable={true}
        searchable={true}
        virtualized={true}
        showControls={true}
        onLogClick={handleLogClick}
        className='max-w-4xl'
      />

      <div className='text-sm text-muted-foreground'>
        <p>Features demonstrated:</p>
        <ul className='list-disc list-inside mt-2 space-y-1'>
          <li>Real-time log streaming with auto-scroll</li>
          <li>Log level filtering (debug, info, warn, error)</li>
          <li>Search functionality across log messages</li>
          <li>Virtualized scrolling for performance</li>
          <li>Timestamp formatting and metadata display</li>
          <li>Export functionality</li>
          <li>Responsive design with glassmorphism effects</li>
        </ul>
      </div>
    </div>
  );
};

export default LogStreamDemo;
