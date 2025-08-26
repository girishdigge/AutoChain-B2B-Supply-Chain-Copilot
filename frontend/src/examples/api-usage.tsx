// Example usage of the API client
import { api } from '../lib/apiProvider';
import { useHealth, useOrders, useOrderSubmission } from '../hooks/useApi';

// Example 1: Direct API usage
export async function fetchDashboardData() {
  try {
    // Fetch health status
    const health = await api.getHealth();
    console.log('System health:', health.status);

    // Fetch recent orders
    const orders = await api.getOrders({ page: 1, limit: 10 });
    console.log(`Found ${orders.total} orders`);

    // Fetch blockchain status
    const blockchain = await api.getBlockchainStatus();
    console.log('Blockchain network:', blockchain.network);

    return {
      health,
      orders: orders.orders,
      blockchain,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    throw error;
  }
}

// Example 2: React component using hooks
export function HealthStatusComponent() {
  const { data: health, loading, error, refetch } = useHealth();

  if (loading) return <div>Loading health status...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!health) return <div>No health data</div>;

  return (
    <div>
      <h3>System Health: {health.status}</h3>
      <p>WebSocket: {health.websocket.status}</p>
      <p>Blockchain: {health.blockchain.status}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}

// Example 3: Orders list component
export function OrdersListComponent() {
  const {
    data: ordersData,
    loading,
    error,
  } = useOrders({
    page: 1,
    limit: 20,
    status: 'processing',
  });

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!ordersData) return <div>No orders data</div>;

  return (
    <div>
      <h3>Orders ({ordersData.total})</h3>
      <ul>
        {ordersData.orders.map((order) => (
          <li key={order.id}>
            {order.id} - {order.buyerEmail} - {order.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Example 4: Order submission component
export function OrderSubmissionComponent() {
  const { loading, error, result, submitOrder, reset } = useOrderSubmission();

  const handleSubmit = async (orderText: string) => {
    try {
      const result = await submitOrder(orderText);
      console.log('Order submitted:', result);
      // Navigate to workflow page or show success message
    } catch (error) {
      console.error('Submission failed:', error);
      // Error is already handled by the hook
    }
  };

  return (
    <div>
      <h3>Submit Order</h3>
      {loading && <div>Submitting order...</div>}
      {error && (
        <div>
          Error: {error.message}
          <button onClick={reset}>Try Again</button>
        </div>
      )}
      {result && (
        <div>
          Success! Order ID: {result.order_id}, Run ID: {result.run_id}
        </div>
      )}
      <button
        onClick={() => handleSubmit('Sample order text')}
        disabled={loading}
      >
        Submit Sample Order
      </button>
    </div>
  );
}

// Example 5: Error handling patterns
export async function robustAPICall() {
  try {
    const orders = await api.getOrders();
    return orders;
  } catch (error) {
    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes('Network error')) {
        // Handle network errors
        console.log('Network issue, trying again later...');
        throw new Error('Please check your internet connection');
      } else if (error.message.includes('timeout')) {
        // Handle timeout errors
        console.log('Request timed out, server might be slow...');
        throw new Error('Server is taking too long to respond');
      } else {
        // Handle other API errors
        console.log('API error:', error.message);
        throw error;
      }
    }
    throw new Error('Unknown error occurred');
  }
}

// Example 6: Using with React Query (if available)
export function createOrdersQuery() {
  return {
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  };
}
