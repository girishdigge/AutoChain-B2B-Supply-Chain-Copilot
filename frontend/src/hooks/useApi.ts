import { useState, useCallback, useEffect } from 'react';
import { api, IAPIClient } from '../lib/apiProvider';
import { APIClientError } from '../lib/api';
import { logger } from '../lib/environment';

// Generic API hook state
export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: APIClientError | null;
  lastFetch?: Date;
}

// Hook options
export interface UseApiOptions {
  immediate?: boolean; // Whether to fetch immediately on mount
  retryOnError?: boolean; // Whether to show retry option
  cacheTime?: number; // Cache time in milliseconds
}

// Generic API hook
export function useApi<T>(
  apiCall: (client: IAPIClient) => Promise<T>,
  options: UseApiOptions = {}
): UseApiState<T> & {
  refetch: () => Promise<void>;
  reset: () => void;
} {
  const { immediate = false, cacheTime = 0 } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    // Check cache if cacheTime is set
    if (cacheTime > 0 && state.lastFetch) {
      const timeSinceLastFetch = Date.now() - state.lastFetch.getTime();
      if (timeSinceLastFetch < cacheTime) {
        logger.debug('Using cached data');
        return;
      }
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await apiCall(api);
      setState({
        data: result,
        loading: false,
        error: null,
        lastFetch: new Date(),
      });
    } catch (error) {
      const apiError =
        error instanceof APIClientError
          ? error
          : new APIClientError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR'
            );

      logger.error('API call failed:', apiError);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: apiError,
      }));
    }
  }, [apiCall, cacheTime, state.lastFetch]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    refetch: execute,
    reset,
  };
}

// Specific hooks for common API calls

export function useHealth(options?: UseApiOptions) {
  return useApi(
    (client) => client.getHealth(),
    { immediate: true, cacheTime: 30000, ...options } // Cache for 30 seconds
  );
}

export function useOrders(
  params?: Parameters<IAPIClient['getOrders']>[0],
  options?: UseApiOptions
) {
  return useApi(
    (client) => client.getOrders(params),
    { immediate: true, cacheTime: 10000, ...options } // Cache for 10 seconds
  );
}

export function useOrder(orderId: string, options?: UseApiOptions) {
  return useApi(
    (client) => client.getOrder(orderId),
    { immediate: !!orderId, cacheTime: 30000, ...options } // Cache for 30 seconds
  );
}

export function useBlockchainStatus(options?: UseApiOptions) {
  return useApi(
    (client) => client.getBlockchainStatus(),
    { immediate: true, cacheTime: 60000, ...options } // Cache for 1 minute
  );
}

// Hook for order submission (no caching, manual trigger only)
export function useOrderSubmission() {
  const [state, setState] = useState<{
    loading: boolean;
    error: APIClientError | null;
    result: { run_id: string; order_id: string } | null;
  }>({
    loading: false,
    error: null,
    result: null,
  });

  const submitOrder = useCallback(async (orderText: string) => {
    setState({ loading: true, error: null, result: null });

    try {
      const result = await api.submitOrder(orderText);
      setState({ loading: false, error: null, result });
      return result;
    } catch (error) {
      const apiError =
        error instanceof APIClientError
          ? error
          : new APIClientError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR'
            );

      logger.error('Order submission failed:', apiError);
      setState({ loading: false, error: apiError, result: null });
      throw apiError;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, result: null });
  }, []);

  return {
    ...state,
    submitOrder,
    reset,
  };
}

// Utility hook to check API client mode
export function useApiMode() {
  return {
    mode: api.getCurrentMode(),
    isMock: api.getCurrentMode() === 'mock',
    isLive: api.getCurrentMode() === 'live',
  };
}
