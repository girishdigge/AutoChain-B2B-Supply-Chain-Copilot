import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  Link,
  TrendingUp,
  ShoppingCart,
  Activity,
  CheckCircle,
  Play,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import OrderDetailDrawer from '../components/OrderDetailDrawer';
import WorkflowStatusIndicator from '../components/WorkflowStatusIndicator';
import WorkflowDebugPanel from '../components/WorkflowDebugPanel';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAppState } from '../context/AppStateContext';
import { useWebSocket } from '../context/WebSocketContext';
import { mockOrders } from '../lib/mockData';
import { toast } from '../lib/toast';
import type { Order, OrderSubmissionRequest } from '../types';

// Sample order templates for demo
const SAMPLE_ORDER_TEMPLATES = {
  Lamborghini_Aventador: {
    name: `Lamborghini Aventado Order`,
    text: `I would like to place an order for a Lamborghini Aventador vehicles.
My contact email is [your email], and the required delivery location is London.`,
  },
  RollsRoyce_Ghost: {
    name: `Rolls-Royce Ghost Order Placement`,
    text: `I wish to formally place an order for one new Rolls-Royce Ghost.
Please contact me at [your email] to finalize the specifications and arrange for delivery to Dubai.`,
  },
  Ferrari_SF90_Stradale: {
    name: `Ferrari SF90 Stradale Firm Order`,
    text: `This serves as our formal request to place a firm order for one Ferrari SF90 Stradale.
Kindly forward the official purchase agreement to [your email] for a New York delivery.`,
  },

  AstonMartin_DB12: {
    name: `Aston Martin DB12 Purchase Order`,
    text: `Please process this as an official purchase order for a new Aston Martin DB12.
My contact is [your email]; the vehicle is to be registered and delivered in Tokyo.`,
  },

  Mercedes_Maybach_S680: {
    name: `Mercedes-Maybach S 680 Confirmed Order`,
    text: `I am placing a confirmed order for a new Mercedes-Maybach S 680.
Please send all necessary paperwork to [your email] and schedule the delivery for Miami.`,
  },
};

const Dashboard: React.FC = () => {
  const { state } = useAppState();
  const { sendMessage, isConnected } = useWebSocket();
  const navigate = useNavigate();

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [demoModalOpen, setDemoModalOpen] = React.useState(false);
  const [demoOrderText, setDemoOrderText] = React.useState('');
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>('');
  const [isSubmittingDemo, setIsSubmittingDemo] = React.useState(false);

  // Use mock data if in mock mode, otherwise use state data
  const orders = state.mockMode ? mockOrders : state.orders.orders;

  // Handle template selection
  const handleTemplateSelect = React.useCallback((templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (
      templateKey &&
      SAMPLE_ORDER_TEMPLATES[templateKey as keyof typeof SAMPLE_ORDER_TEMPLATES]
    ) {
      setDemoOrderText(
        SAMPLE_ORDER_TEMPLATES[
          templateKey as keyof typeof SAMPLE_ORDER_TEMPLATES
        ].text
      );
    }
  }, []);

  // Handle demo order submission
  const handleDemoOrderSubmit = React.useCallback(async () => {
    if (!demoOrderText.trim()) {
      toast.error(
        'Order Required',
        'Please enter order details or select a template'
      );
      return;
    }

    if (!isConnected) {
      toast.error(
        'Connection Error',
        'Not connected to server. Please check your connection.'
      );
      return;
    }

    setIsSubmittingDemo(true);

    try {
      // Generate a unique order ID for this demo
      const demoOrderId = `ORD-DEMO-${Date.now()}`;

      let success = false;

      if (state.mockMode) {
        // In mock mode, send the order submission message which will be handled by the mock emitter
        success = sendMessage({
          type: 'submit_order',
          data: { order_text: demoOrderText.trim() },
          order_id: demoOrderId,
        });
      } else {
        // In live mode, send the order processing request to the real backend
        const orderSubmission: OrderSubmissionRequest = {
          order_text: demoOrderText.trim(),
        };

        success = sendMessage({
          type: 'start_order_processing',
          data: orderSubmission,
          order_id: demoOrderId,
        });
      }

      if (success) {
        // Show success toast
        toast.events.demoOrderSubmitted(demoOrderId);

        // Close modal and reset form
        setDemoModalOpen(false);
        setDemoOrderText('');
        setSelectedTemplate('');

        // Navigate to workflow page to watch the processing
        setTimeout(() => {
          navigate(`/workflow?order=${demoOrderId}`);
        }, 1500);
      } else {
        throw new Error('Failed to send order submission message');
      }
    } catch (error) {
      console.error('Demo order submission error:', error);
      toast.error(
        'Submission Failed',
        error instanceof Error ? error.message : 'Failed to submit demo order'
      );
    } finally {
      setIsSubmittingDemo(false);
    }
  }, [demoOrderText, isConnected, sendMessage, navigate, state.mockMode]);

  // Handle modal close
  const handleModalClose = React.useCallback(() => {
    if (!isSubmittingDemo) {
      setDemoModalOpen(false);
      setDemoOrderText('');
      setSelectedTemplate('');
    }
  }, [isSubmittingDemo]);

  // Calculate KPI metrics
  const kpiData = useMemo(() => {
    const totalOrders = orders.length;
    const inProgressOrders = orders.filter(
      (order) => order.status === 'processing'
    ).length;
    const completedOrders = orders.filter(
      (order) => order.status === 'completed'
    ).length;
    const failedOrders = orders.filter(
      (order) => order.status === 'failed'
    ).length;

    // Calculate blockchain anchors (completed orders with blockchain transactions)
    const blockchainAnchors = orders.filter(
      (order) => order.status === 'completed' && order.blockchainTx
    ).length;

    // Calculate success rate
    const processedOrders = completedOrders + failedOrders;
    const successRate =
      processedOrders > 0 ? (completedOrders / processedOrders) * 100 : 0;

    // Mock deltas for demonstration (in real app, these would be calculated from historical data)
    const deltas = {
      ordersProcessed: 12,
      inProgress: -3,
      blockchainAnchors: 8,
      successRate: 2.5,
    };

    // Mock sparkline data for demonstration
    const sparklineData = {
      ordersProcessed: [45, 52, 48, 61, 55, 67, totalOrders],
      inProgress: [8, 12, 15, 11, 9, 14, inProgressOrders],
      blockchainAnchors: [23, 28, 25, 32, 29, 35, blockchainAnchors],
      successRate: [92, 89, 94, 91, 96, 93, Math.round(successRate)],
    };

    return {
      ordersProcessed: totalOrders,
      inProgress: inProgressOrders,
      blockchainAnchors,
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
      deltas,
      sparklineData,
    };
  }, [orders]);

  // Generate chart data
  const chartData = useMemo(() => {
    // Orders over time data (last 7 days)
    const ordersOverTime = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      // Mock data with some variation
      const baseOrders = 8 + Math.floor(Math.random() * 6);
      const ordersCount = i === 0 ? orders.length : baseOrders;

      ordersOverTime.push({
        date: dateStr,
        orders: ordersCount,
        completed: Math.floor(ordersCount * 0.7),
        processing: Math.floor(ordersCount * 0.2),
        failed: Math.floor(ordersCount * 0.1),
      });
    }

    // Lead time by supplier data
    const leadTimeData = [
      { supplier: 'Advanced Mfg', leadTime: 14, orders: 12 },
      { supplier: 'Precision Tech', leadTime: 21, orders: 8 },
      { supplier: 'Industrial Co', leadTime: 10, orders: 15 },
      { supplier: 'Quality Parts', leadTime: 18, orders: 6 },
      { supplier: 'Fast Supply', leadTime: 7, orders: 9 },
    ];

    return {
      ordersOverTime,
      leadTimeData,
    };
  }, [orders]);

  // Chart components
  const OrdersOverTimeChart = () => (
    <ResponsiveContainer width='100%' height={200}>
      <LineChart data={chartData.ordersOverTime}>
        <CartesianGrid
          strokeDasharray='3 3'
          stroke='hsl(var(--border))'
          opacity={0.3}
        />
        <XAxis
          dataKey='date'
          stroke='hsl(var(--muted-foreground))'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='hsl(var(--muted-foreground))'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Line
          type='monotone'
          dataKey='orders'
          stroke='hsl(var(--primary))'
          strokeWidth={3}
          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const LeadTimeChart = () => (
    <ResponsiveContainer width='100%' height={200}>
      <BarChart
        data={chartData.leadTimeData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray='3 3'
          stroke='hsl(var(--border))'
          opacity={0.3}
        />
        <XAxis
          dataKey='supplier'
          stroke='hsl(var(--muted-foreground))'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          angle={-45}
          textAnchor='end'
          height={60}
        />
        <YAxis
          stroke='hsl(var(--muted-foreground))'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Bar
          dataKey='leadTime'
          fill='hsl(var(--primary))'
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  // Recent Orders Table Component
  const RecentOrdersTable = () => {
    const recentOrders = orders.slice(0, 5); // Show last 5 orders

    const handleOrderClick = (order: Order) => {
      setSelectedOrderId(order.id);
      setDrawerOpen(true);
    };

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

    if (recentOrders.length === 0) {
      return (
        <div className='bg-card/30 rounded-lg p-8 border border-border/30 text-center'>
          <Package className='w-12 h-12 text-muted-foreground/40 mx-auto mb-4' />
          <p className='text-muted-foreground'>No orders found</p>
          <p className='text-sm text-muted-foreground/60 mt-1'>
            Orders will appear here once processing begins
          </p>
        </div>
      );
    }

    return (
      <div className='bg-card/30 rounded-lg border border-border/30 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-border/30'>
                <th className='px-4 py-3 text-left text-sm font-medium text-muted-foreground'>
                  Order ID
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-muted-foreground'>
                  Buyer Email
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-muted-foreground'>
                  Model
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-muted-foreground'>
                  Qty
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-muted-foreground'>
                  Status
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-muted-foreground'>
                  Updated At
                </th>
                <th className='px-4 py-3 text-right text-sm font-medium text-muted-foreground'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  className='border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer'
                  onClick={() => handleOrderClick(order)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  whileHover={{
                    backgroundColor: 'rgba(var(--muted), 0.3)',
                    transition: { duration: 0.2 },
                  }}
                >
                  <td className='px-4 py-3 text-sm font-medium text-foreground'>
                    {order.id}
                  </td>
                  <td className='px-4 py-3 text-sm text-muted-foreground'>
                    {order.buyerEmail}
                  </td>
                  <td className='px-4 py-3 text-sm text-foreground'>
                    <div className='max-w-32 truncate' title={order.model}>
                      {order.model}
                    </div>
                  </td>
                  <td className='px-4 py-3 text-sm text-foreground'>
                    {order.quantity}
                  </td>
                  <td className='px-4 py-3'>
                    <StatusBadge status={order.status} size='sm' />
                  </td>
                  <td className='px-4 py-3 text-sm text-muted-foreground'>
                    {formatDate(order.updatedAt)}
                  </td>
                  <td className='px-4 py-3 text-right'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order);
                      }}
                      className='text-xs'
                    >
                      View
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className='p-6 space-y-8'>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='flex items-center justify-between'
      >
        <div>
          <h1 className='text-3xl font-bold text-foreground mb-2'>
            Supply Chain Dashboard
          </h1>
          <p className='text-muted-foreground'>
            Real-time overview of your AI-powered supply chain operations
          </p>
        </div>

        <div className='flex items-center gap-3'>
          {/* Quick Demo Order Button */}
          <Button
            onClick={() => setDemoModalOpen(true)}
            disabled={!isConnected}
            className='bg-primary hover:bg-primary/90'
          >
            <Play className='w-4 h-4 mr-2' />
            Demo Order
          </Button>

          {/* Connection Status Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className={`
              px-4 py-2 rounded-2xl text-sm font-medium
              ${
                state.websocket.status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }
            `}
          >
            <div className='flex items-center gap-2'>
              <div
                className={`
                w-2 h-2 rounded-full
                ${
                  state.websocket.status === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }
              `}
              />
              {state.websocket.status === 'connected'
                ? 'Live Data'
                : 'Connecting...'}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Workflow Status Indicator */}
      {state.workflow.selectedRun && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.3 }}
          className='bg-card/50 rounded-lg border border-border/30 p-4'
        >
          <h2 className='text-lg font-semibold mb-3 flex items-center gap-2'>
            <Activity className='w-5 h-5 text-blue-500' />
            Current Workflow
          </h2>
          <WorkflowStatusIndicator
            workflowRun={state.workflow.activeRuns[state.workflow.selectedRun]}
          />
          <WorkflowDebugPanel />
        </motion.div>
      )}

      {/* KPI Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
      >
        <MetricCard
          title='Orders Processed'
          value={kpiData.ordersProcessed}
          delta={{
            value: kpiData.deltas.ordersProcessed,
            type: 'increase',
          }}
          sparklineData={kpiData.sparklineData.ordersProcessed}
          icon={<Package className='w-5 h-5' />}
          gradient={true}
        />

        <MetricCard
          title='In Progress'
          value={kpiData.inProgress}
          delta={{
            value: Math.abs(kpiData.deltas.inProgress),
            type: kpiData.deltas.inProgress >= 0 ? 'increase' : 'decrease',
          }}
          sparklineData={kpiData.sparklineData.inProgress}
          icon={<Clock className='w-5 h-5' />}
          gradient={true}
        />

        <MetricCard
          title='Blockchain Anchors'
          value={kpiData.blockchainAnchors}
          delta={{
            value: kpiData.deltas.blockchainAnchors,
            type: 'increase',
          }}
          sparklineData={kpiData.sparklineData.blockchainAnchors}
          icon={<Link className='w-5 h-5' />}
          gradient={true}
        />

        <MetricCard
          title='Success Rate'
          value={`${kpiData.successRate}%`}
          delta={{
            value: kpiData.deltas.successRate,
            type: 'increase',
          }}
          sparklineData={kpiData.sparklineData.successRate}
          icon={<TrendingUp className='w-5 h-5' />}
          gradient={true}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className='grid grid-cols-1 md:grid-cols-3 gap-6'
      >
        {/* Demo Order Action Card */}
        <div className='md:col-span-3 bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-fuchsia-500/20 p-[1px] rounded-2xl'>
          <div className='bg-card/90 backdrop-blur-sm rounded-2xl p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div className='p-3 rounded-lg bg-primary/10 text-primary'>
                  <Play className='w-6 h-6' />
                </div>
                <div>
                  <h3 className='font-semibold text-foreground text-lg'>
                    Test the AI Supply Chain
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    Submit a demo order to see the complete AI-powered workflow
                    in action
                  </p>
                </div>
              </div>
              <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    size='lg'
                    className='bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300'
                    disabled={!isConnected}
                  >
                    <Play className='w-4 h-4 mr-2' />
                    Run Demo Order
                  </Button>
                </DialogTrigger>
                <DialogContent className='max-w-4xl max-h-[80vh] overflow-y-auto'>
                  <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                      <FileText className='w-5 h-5' />
                      Submit Demo Order
                    </DialogTitle>
                    <DialogDescription>
                      Choose a sample order template or write your own order
                      details. The AI will process your order through the
                      complete supply chain workflow.
                    </DialogDescription>
                  </DialogHeader>

                  <div className='space-y-6 py-4'>
                    {/* Template Selection */}
                    <div className='space-y-2'>
                      <Label htmlFor='template-select'>
                        Choose a Template (Optional)
                      </Label>
                      <Select
                        value={selectedTemplate}
                        onValueChange={handleTemplateSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select a sample order template...' />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SAMPLE_ORDER_TEMPLATES).map(
                            ([key, template]) => (
                              <SelectItem key={key} value={key}>
                                {template.name}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Order Text Input */}
                    <div className='space-y-2'>
                      <Label htmlFor='order-text'>Order Details</Label>
                      <Textarea
                        id='order-text'
                        placeholder='Describe your order requirements here...'
                        value={demoOrderText}
                        onChange={(e) => setDemoOrderText(e.target.value)}
                        className='min-h-[300px] resize-none'
                        disabled={isSubmittingDemo}
                      />
                      <p className='text-xs text-muted-foreground'>
                        Include product specifications, quantities, company
                        details, and any special requirements.
                      </p>
                    </div>

                    {/* Connection Status */}
                    <div className='flex items-center gap-2 text-sm'>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isConnected
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-red-500'
                        }`}
                      />
                      <span
                        className={
                          isConnected ? 'text-emerald-600' : 'text-red-600'
                        }
                      >
                        {isConnected
                          ? 'Connected to AI Engine'
                          : 'Disconnected from AI Engine'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className='flex justify-end gap-3 pt-4 border-t'>
                      <Button
                        variant='outline'
                        onClick={handleModalClose}
                        disabled={isSubmittingDemo}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDemoOrderSubmit}
                        disabled={
                          !demoOrderText.trim() ||
                          !isConnected ||
                          isSubmittingDemo
                        }
                        className='min-w-[120px]'
                      >
                        {isSubmittingDemo ? (
                          <>
                            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Play className='w-4 h-4 mr-2' />
                            Submit Order
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        {/* Quick Stats Cards */}
        <div className='bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='p-3 rounded-lg bg-blue-500/10 text-blue-500'>
              <ShoppingCart className='w-6 h-6' />
            </div>
            <div>
              <h3 className='font-semibold text-foreground'>Active Orders</h3>
              <p className='text-sm text-muted-foreground'>
                Currently processing
              </p>
            </div>
          </div>
          <div className='text-2xl font-bold text-foreground'>
            {orders.filter((o) => o.status === 'processing').length}
          </div>
        </div>

        <div className='bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='p-3 rounded-lg bg-emerald-500/10 text-emerald-500'>
              <CheckCircle className='w-6 h-6' />
            </div>
            <div>
              <h3 className='font-semibold text-foreground'>Completed Today</h3>
              <p className='text-sm text-muted-foreground'>
                Successfully processed
              </p>
            </div>
          </div>
          <div className='text-2xl font-bold text-foreground'>
            {orders.filter((o) => o.status === 'completed').length}
          </div>
        </div>

        <div className='bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='p-3 rounded-lg bg-purple-500/10 text-purple-500'>
              <Activity className='w-6 h-6' />
            </div>
            <div>
              <h3 className='font-semibold text-foreground'>System Health</h3>
              <p className='text-sm text-muted-foreground'>Overall status</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <div className='text-2xl font-bold text-emerald-500'>Healthy</div>
            <div className='w-3 h-3 bg-emerald-500 rounded-full animate-pulse' />
          </div>
        </div>
      </motion.div>

      {/* Gradient Header Section for Charts and Tables */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-fuchsia-500/20 p-[1px]'
      >
        <div className='bg-card/90 backdrop-blur-sm rounded-2xl p-6'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='text-xl font-semibold text-foreground mb-2'>
                Analytics Overview
              </h2>
              <p className='text-muted-foreground'>
                Charts and recent activity will be implemented in the next
                subtasks
              </p>
            </div>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Activity className='w-4 h-4' />
              Real-time data
            </div>
          </div>

          {/* Charts Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Orders Over Time Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className='bg-card/30 rounded-lg p-4 border border-border/30'
            >
              <div className='flex items-center justify-between mb-4'>
                <h3 className='font-semibold text-foreground'>
                  Orders Over Time
                </h3>
                <div className='text-xs text-muted-foreground'>Last 7 days</div>
              </div>
              <OrdersOverTimeChart />
            </motion.div>

            {/* Lead Time vs Supplier Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className='bg-card/30 rounded-lg p-4 border border-border/30'
            >
              <div className='flex items-center justify-between mb-4'>
                <h3 className='font-semibold text-foreground'>
                  Lead Time by Supplier
                </h3>
                <div className='text-xs text-muted-foreground'>
                  Average days
                </div>
              </div>
              <LeadTimeChart />
            </motion.div>
          </div>

          {/* Recent Orders Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className='mt-6'
          >
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-semibold text-foreground'>Recent Orders</h3>
              <div className='text-xs text-muted-foreground'>
                Last {Math.min(5, orders.length)} orders
              </div>
            </div>
            <RecentOrdersTable />
          </motion.div>
        </div>
      </motion.div>

      {/* Order Detail Drawer */}
      {selectedOrderId && (
        <OrderDetailDrawer
          orderId={selectedOrderId}
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedOrderId(null);
          }}
          order={orders.find((order) => order.id === selectedOrderId)}
        />
      )}
    </div>
  );
};

export default Dashboard;
