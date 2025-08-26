import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BaseMessage,
  WebSocketEvent,
  TypedWebSocketMessage,
  WebSocketState,
} from '../types';
import { webSocketStateRecovery } from '../utils/WebSocketStateRecovery';

interface UsePortiaSocketOptions {
  url: string;
  clientId: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

interface UsePortiaSocketReturn {
  state: WebSocketState;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  subscribe: (eventType: string, handler: (data: any) => void) => () => void;
  isConnected: boolean;
}

export const usePortiaSocket = (
  options: UsePortiaSocketOptions
): UsePortiaSocketReturn => {
  const {
    url,
    clientId,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    heartbeatInterval = 30000,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    status: 'disconnected',
    clientId,
    connectionStats: {
      reconnectAttempts: 0,
      messagesReceived: 0,
      messagesSent: 0,
    },
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(
    new Map()
  );
  const reconnectCountRef = useRef(0);

  // Clear timeouts helper
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Emit event to subscribers
  const emitEvent = useCallback((eventType: string, data: any) => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }, []);

  // Handle WebSocket message
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: TypedWebSocketMessage = JSON.parse(event.data);

        setState((prev) => ({
          ...prev,
          lastEvent: message,
          connectionStats: {
            ...prev.connectionStats,
            messagesReceived: prev.connectionStats.messagesReceived + 1,
          },
        }));

        // Emit to specific event type handlers
        emitEvent(message.type, message.data);

        // Emit to generic message handlers
        emitEvent('message', message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        emitEvent('error', {
          error_type: 'parse_error',
          message: 'Failed to parse message',
          details: error,
        });
      }
    },
    [emitEvent]
  );

  // Setup heartbeat
  const setupHeartbeat = useCallback(() => {
    if (heartbeatInterval > 0) {
      heartbeatTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString(),
              client_id: clientId,
            })
          );
          setupHeartbeat(); // Schedule next heartbeat
        }
      }, heartbeatInterval);
    }
  }, [heartbeatInterval, clientId]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    clearTimeouts();

    setState((prev) => ({ ...prev, status: 'connecting' }));

    try {
      const wsUrl = `${url}/${clientId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setState((prev) => ({
          ...prev,
          status: 'connected',
          connectionStats: {
            ...prev.connectionStats,
            connectedAt: new Date().toISOString(),
          },
        }));

        reconnectCountRef.current = 0;
        setupHeartbeat();

        // Emit connection event with recovery data
        const recoveryData = webSocketStateRecovery.recoverState(clientId);
        emitEvent('connected', {
          clientId,
          hasRecoveryData: !!recoveryData,
          recoveryData,
        });
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        clearTimeouts();

        setState((prev) => ({ ...prev, status: 'disconnected' }));
        emitEvent('disconnected', { code: event.code, reason: event.reason });

        // Attempt reconnection if not a clean close
        if (
          event.code !== 1000 &&
          reconnectCountRef.current < reconnectAttempts
        ) {
          const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current); // Exponential backoff

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++;
            setState((prev) => ({
              ...prev,
              connectionStats: {
                ...prev.connectionStats,
                reconnectAttempts: reconnectCountRef.current,
              },
            }));
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState((prev) => ({ ...prev, status: 'error' }));
        emitEvent('error', {
          error_type: 'connection_error',
          message: 'WebSocket connection error',
          details: error,
        });
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState((prev) => ({ ...prev, status: 'error' }));
      emitEvent('error', {
        error_type: 'connection_failed',
        message: 'Failed to create WebSocket connection',
        details: error,
      });
    }
  }, [
    url,
    clientId,
    reconnectAttempts,
    reconnectDelay,
    handleMessage,
    setupHeartbeat,
    emitEvent,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    clearTimeouts();
    reconnectCountRef.current = reconnectAttempts; // Prevent reconnection

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setState((prev) => ({ ...prev, status: 'disconnected' }));
  }, [reconnectAttempts]);

  // Send message
  const sendMessage = useCallback(
    (message: any): boolean => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          const messageWithMeta = {
            ...message,
            timestamp: new Date().toISOString(),
            client_id: clientId,
          };

          wsRef.current.send(JSON.stringify(messageWithMeta));
          setState((prev) => ({
            ...prev,
            connectionStats: {
              ...prev.connectionStats,
              messagesSent: prev.connectionStats.messagesSent + 1,
            },
          }));
          return true;
        } catch (error) {
          console.error('Failed to send message:', error);
          emitEvent('error', {
            error_type: 'send_error',
            message: 'Failed to send message',
            details: error,
          });
          return false;
        }
      }
      return false;
    },
    [clientId, emitEvent]
  );

  // Subscribe to events
  const subscribe = useCallback(
    (eventType: string, handler: (data: any) => void) => {
      if (!eventHandlersRef.current.has(eventType)) {
        eventHandlersRef.current.set(eventType, new Set());
      }

      eventHandlersRef.current.get(eventType)!.add(handler);

      // Return unsubscribe function
      return () => {
        const handlers = eventHandlersRef.current.get(eventType);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            eventHandlersRef.current.delete(eventType);
          }
        }
      };
    },
    []
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only depend on autoConnect to prevent reconnection loops

  return {
    state,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    isConnected: state.status === 'connected',
  };
};
