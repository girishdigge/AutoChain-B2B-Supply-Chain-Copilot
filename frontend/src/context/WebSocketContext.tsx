import React, { createContext, useContext } from 'react';
import { usePortiaSocket } from '../hooks/usePortiaSocket';
import { useMockWebSocket } from '../hooks/useMockWebSocket';
import { useWebSocketEventHandlers } from '../hooks/useWebSocketEventHandlers';
import { useAppState } from './AppStateContext';

interface WebSocketContextType {
  socket:
    | ReturnType<typeof usePortiaSocket>
    | ReturnType<typeof useMockWebSocket>;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  // Mock-specific methods (only available in mock mode)
  startScenario?: (scenarioName: string) => void;
  startDemoOrder?: (scenarioName?: string) => void;
  simulateConnectionIssue?: () => void;
  generateRandomEvents?: () => void;
  getAvailableScenarios?: () => string[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { state } = useAppState();

  // Use mock or real WebSocket based on mock mode
  const realSocket = usePortiaSocket({
    url: import.meta.env.VITE_WS_BASE || 'ws://localhost:8000/ws',
    clientId: state.websocket.clientId,
    autoConnect: !state.mockMode, // Don't auto-connect in mock mode
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 0, // Disable heartbeat temporarily
  });

  const mockSocket = useMockWebSocket({
    clientId: state.websocket.clientId,
    autoConnect: state.mockMode, // Auto-connect in mock mode
  });

  // Choose the appropriate socket based on mock mode
  const socket = state.mockMode ? mockSocket : realSocket;

  // Set up event handlers for the active socket
  useWebSocketEventHandlers({ socket });

  const contextValue: WebSocketContextType = {
    socket,
    status: socket.state?.status || 'disconnected',
    isConnected: socket.isConnected,
    connect: socket.connect,
    disconnect: socket.disconnect,
    sendMessage: socket.sendMessage,
    // Mock-specific methods are handled by the mock socket implementation
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
