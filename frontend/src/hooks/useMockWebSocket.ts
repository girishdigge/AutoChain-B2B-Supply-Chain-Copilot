import { useCallback, useEffect, useRef, useState } from 'react';
import { MockWebSocketEmitter } from '../lib/mockWebSocketEmitter';
import type { WebSocketState, TypedWebSocketMessage } from '../types';

interface UseMockWebSocketOptions {
  clientId: string;
  autoConnect?: boolean;
}

interface UseMockWebSocketReturn {
  state: WebSocketState;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  subscribe: (eventType: string, handler: (data: any) => void) => () => void;
  isConnected: boolean;
  // Mock-specific methods
  startScenario: (scenarioName: string) => void;
  startDemoOrder: (scenarioName?: string) => void;
  simulateConnectionIssue: () => void;
  generateRandomEvents: () => void;
  getAvailableScenarios: () => string[];
}

export const useMockWebSocket = (
  options: UseMockWebSocketOptions
): UseMockWebSocketReturn => {
  const { clientId, autoConnect = true } = options;

  const [state, setState] = useState<WebSocketState>({
    status: 'disconnected',
    clientId,
    connectionStats: {
      reconnectAttempts: 0,
      messagesReceived: 0,
      messagesSent: 0,
    },
  });

  const emitterRef = useRef<MockWebSocketEmitter | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(
    new Map()
  );

  // Update connection stats
  const updateStats = useCallback(
    (updates: Partial<WebSocketState['connectionStats']>) => {
      setState((prev) => ({
        ...prev,
        connectionStats: {
          ...prev.connectionStats,
          ...updates,
        },
      }));
    },
    []
  );

  // Emit event to subscribers
  const emitEvent = useCallback((eventType: string, data: any) => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in mock event handler for ${eventType}:`, error);
        }
      });
    }
  }, []);

  // Handle messages from mock emitter
  const handleMessage = useCallback(
    (message: TypedWebSocketMessage) => {
      setState((prev) => ({
        ...prev,
        lastEvent: message,
      }));

      updateStats({
        messagesReceived: state.connectionStats.messagesReceived + 1,
      });

      // Emit to specific event type handlers
      emitEvent(message.type, message.data);

      // Emit to generic message handlers
      emitEvent('message', message);
    },
    [emitEvent, updateStats, state.connectionStats.messagesReceived]
  );

  // Handle connection status changes
  const handleConnectionChange = useCallback(
    (status: 'connected' | 'disconnected' | 'error') => {
      setState((prev) => ({
        ...prev,
        status,
        connectionStats: {
          ...prev.connectionStats,
          connectedAt:
            status === 'connected'
              ? new Date().toISOString()
              : prev.connectionStats.connectedAt,
        },
      }));

      // Emit connection events
      emitEvent(status, { clientId });
    },
    [emitEvent, clientId]
  );

  // Initialize mock emitter
  useEffect(() => {
    emitterRef.current = new MockWebSocketEmitter({
      onMessage: handleMessage,
      onConnectionChange: handleConnectionChange,
      clientId,
    });

    return () => {
      if (emitterRef.current) {
        emitterRef.current.disconnect();
      }
    };
  }, [clientId, handleMessage, handleConnectionChange]);

  // Connect function
  const connect = useCallback(() => {
    if (emitterRef.current && !emitterRef.current.connected) {
      setState((prev) => ({ ...prev, status: 'connecting' }));
      emitterRef.current.connect();
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (emitterRef.current && emitterRef.current.connected) {
      emitterRef.current.disconnect();
    }
  }, []);

  // Send message function
  const sendMessage = useCallback(
    (message: any): boolean => {
      if (emitterRef.current && emitterRef.current.connected) {
        const success = emitterRef.current.send(message);
        if (success) {
          updateStats({
            messagesSent: state.connectionStats.messagesSent + 1,
          });
        }
        return success;
      }
      return false;
    },
    [updateStats, state.connectionStats.messagesSent]
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

  // Mock-specific functions
  const startScenario = useCallback((scenarioName: string) => {
    if (emitterRef.current) {
      emitterRef.current.startScenario(scenarioName);
    }
  }, []);

  const startDemoOrder = useCallback((scenarioName?: string) => {
    if (emitterRef.current) {
      emitterRef.current.startDemoOrderScenario(scenarioName);
    }
  }, []);

  const simulateConnectionIssue = useCallback(() => {
    if (emitterRef.current) {
      emitterRef.current.simulateConnectionIssue();
    }
  }, []);

  const generateRandomEvents = useCallback(() => {
    if (emitterRef.current) {
      emitterRef.current.generateRandomEvents();
    }
  }, []);

  const getAvailableScenarios = useCallback((): string[] => {
    if (emitterRef.current) {
      return emitterRef.current.getAvailableScenarios();
    }
    return [];
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
  }, [autoConnect, connect]);

  return {
    state,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    isConnected: state.status === 'connected',
    // Mock-specific methods
    startScenario,
    startDemoOrder,
    simulateConnectionIssue,
    generateRandomEvents,
    getAvailableScenarios,
  };
};
