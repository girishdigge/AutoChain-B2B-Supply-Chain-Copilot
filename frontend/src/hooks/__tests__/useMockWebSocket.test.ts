import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useMockWebSocket } from '../useMockWebSocket';

// Mock the MockWebSocketEmitter
const mockEmitter = {
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  startScenario: vi.fn(),
  startDemoOrderScenario: vi.fn(),
  simulateConnectionIssue: vi.fn(),
  generateRandomEvents: vi.fn(),
  getAvailableScenarios: vi.fn(),
  onMessage: vi.fn(),
  onConnectionChange: vi.fn(),
  clientId: '',
};

vi.mock('../../lib/mockWebSocketEmitter', () => ({
  MockWebSocketEmitter: vi.fn().mockImplementation((options) => {
    // Store the callbacks for testing
    mockEmitter.onMessage = options.onMessage;
    mockEmitter.onConnectionChange = options.onConnectionChange;
    mockEmitter.clientId = options.clientId;
    return mockEmitter;
  }),
}));

describe('useMockWebSocket', () => {
  const defaultOptions = {
    clientId: 'test-client-123',
    autoConnect: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmitter.connected = false;
    mockEmitter.connect = vi.fn();
    mockEmitter.disconnect = vi.fn();
    mockEmitter.send = vi.fn();
    mockEmitter.startScenario = vi.fn();
    mockEmitter.startDemoOrderScenario = vi.fn();
    mockEmitter.simulateConnectionIssue = vi.fn();
    mockEmitter.generateRandomEvents = vi.fn();
    mockEmitter.getAvailableScenarios = vi.fn().mockReturnValue([]);
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));

    expect(result.current.state.status).toBe('disconnected');
    expect(result.current.state.clientId).toBe('test-client-123');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.state.connectionStats.reconnectAttempts).toBe(0);
    expect(result.current.state.connectionStats.messagesReceived).toBe(0);
    expect(result.current.state.connectionStats.messagesSent).toBe(0);
  });

  it('should connect successfully', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));

    act(() => {
      result.current.connect();
    });

    expect(mockEmitter.connect).toHaveBeenCalledTimes(1);
  });

  it('should disconnect successfully', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));

    // Set up as connected first
    mockEmitter.connected = true;

    act(() => {
      result.current.disconnect();
    });

    expect(mockEmitter.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should handle connection status changes', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));

    // Simulate connection status change
    act(() => {
      mockEmitter.onConnectionChange('connected');
    });

    expect(result.current.state.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.state.connectionStats.connectedAt).toBeDefined();

    // Simulate disconnection
    act(() => {
      mockEmitter.onConnectionChange('disconnected');
    });

    expect(result.current.state.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);

    // Simulate error
    act(() => {
      mockEmitter.onConnectionChange('error');
    });

    expect(result.current.state.status).toBe('error');
    expect(result.current.isConnected).toBe(false);
  });

  it('should handle messages correctly', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));
    const messageHandler = vi.fn();

    // Subscribe to messages
    act(() => {
      result.current.subscribe('test_event', messageHandler);
    });

    // Simulate receiving a message
    const testMessage = {
      type: 'test_event',
      data: { message: 'Hello World' },
      timestamp: new Date().toISOString(),
    };

    act(() => {
      mockEmitter.onMessage(testMessage);
    });

    expect(messageHandler).toHaveBeenCalledWith({ message: 'Hello World' });
    expect(result.current.state.connectionStats.messagesReceived).toBe(1);
    expect(result.current.state.lastEvent).toEqual(testMessage);
  });

  it('should send messages when connected', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));

    // Set up as connected
    mockEmitter.connected = true;
    mockEmitter.send.mockReturnValue(true);

    const message = { type: 'test', data: 'test data' };
    let sendResult: boolean;

    act(() => {
      sendResult = result.current.sendMessage(message);
    });

    expect(sendResult!).toBe(true);
    expect(mockEmitter.send).toHaveBeenCalledWith(message);
    expect(result.current.state.connectionStats.messagesSent).toBe(1);
  });

  it('should not send messages when disconnected', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));

    // Ensure disconnected state
    mockEmitter.connected = false;

    const sendResult = result.current.sendMessage({ type: 'test' });

    expect(sendResult).toBe(false);
    expect(mockEmitter.send).not.toHaveBeenCalled();
    expect(result.current.state.connectionStats.messagesSent).toBe(0);
  });

  it('should handle subscription and unsubscription', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    // Subscribe handlers
    let unsubscribe1: () => void;
    let unsubscribe2: () => void;

    act(() => {
      unsubscribe1 = result.current.subscribe('test_event', handler1);
      unsubscribe2 = result.current.subscribe('test_event', handler2);
    });

    // Send a message
    const testMessage = {
      type: 'test_event',
      data: { message: 'test' },
      timestamp: new Date().toISOString(),
    };

    act(() => {
      mockEmitter.onMessage(testMessage);
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);

    // Unsubscribe one handler
    act(() => {
      unsubscribe1();
    });

    // Send another message
    act(() => {
      mockEmitter.onMessage({
        ...testMessage,
        data: { message: 'test2' },
      });
    });

    expect(handler1).toHaveBeenCalledTimes(1); // Still 1
    expect(handler2).toHaveBeenCalledTimes(2); // Now 2
  });

  it('should handle multiple event types', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));
    const eventHandler = vi.fn();
    const messageHandler = vi.fn();

    act(() => {
      result.current.subscribe('specific_event', eventHandler);
      result.current.subscribe('message', messageHandler);
    });

    const testMessage = {
      type: 'specific_event',
      data: { content: 'test content' },
      timestamp: new Date().toISOString(),
    };

    act(() => {
      mockEmitter.onMessage(testMessage);
    });

    // Should call both specific event handler and generic message handler
    expect(eventHandler).toHaveBeenCalledWith({ content: 'test content' });
    expect(messageHandler).toHaveBeenCalledWith(testMessage);
  });

  it('should provide mock-specific functionality', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));

    // Test startScenario
    act(() => {
      result.current.startScenario('test-scenario');
    });
    expect(mockEmitter.startScenario).toHaveBeenCalledWith('test-scenario');

    // Test startDemoOrder
    act(() => {
      result.current.startDemoOrder('demo-scenario');
    });
    expect(mockEmitter.startDemoOrderScenario).toHaveBeenCalledWith(
      'demo-scenario'
    );

    // Test simulateConnectionIssue
    act(() => {
      result.current.simulateConnectionIssue();
    });
    expect(mockEmitter.simulateConnectionIssue).toHaveBeenCalledTimes(1);

    // Test generateRandomEvents
    act(() => {
      result.current.generateRandomEvents();
    });
    expect(mockEmitter.generateRandomEvents).toHaveBeenCalledTimes(1);

    // Test getAvailableScenarios
    mockEmitter.getAvailableScenarios.mockReturnValue([
      'scenario1',
      'scenario2',
    ]);

    const scenarios = result.current.getAvailableScenarios();
    expect(scenarios).toEqual(['scenario1', 'scenario2']);
    expect(mockEmitter.getAvailableScenarios).toHaveBeenCalledTimes(1);
  });

  it('should auto-connect when autoConnect is true', () => {
    const { result } = renderHook(() =>
      useMockWebSocket({
        ...defaultOptions,
        autoConnect: true,
      })
    );

    expect(mockEmitter.connect).toHaveBeenCalledTimes(1);
  });

  it('should handle error in event handlers gracefully', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));
    const faultyHandler = vi.fn().mockImplementation(() => {
      throw new Error('Handler error');
    });
    const goodHandler = vi.fn();

    // Mock console.error to avoid noise in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      result.current.subscribe('test_event', faultyHandler);
      result.current.subscribe('test_event', goodHandler);
    });

    const testMessage = {
      type: 'test_event',
      data: { message: 'test' },
      timestamp: new Date().toISOString(),
    };

    act(() => {
      mockEmitter.onMessage(testMessage);
    });

    // Both handlers should be called, error should be logged
    expect(faultyHandler).toHaveBeenCalledTimes(1);
    expect(goodHandler).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in mock event handler for test_event:'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should clean up emitter on unmount', () => {
    const { unmount } = renderHook(() => useMockWebSocket(defaultOptions));

    unmount();

    expect(mockEmitter.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should handle failed message sending', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));

    // Set up as connected but send fails
    mockEmitter.connected = true;
    mockEmitter.send.mockReturnValue(false);

    const sendResult = result.current.sendMessage({ type: 'test' });

    expect(sendResult).toBe(false);
    expect(result.current.state.connectionStats.messagesSent).toBe(0);
  });

  it('should return empty scenarios when emitter is not available', () => {
    const { result } = renderHook(() => useMockWebSocket(defaultOptions));

    // Simulate emitter not being available
    mockEmitter.getAvailableScenarios.mockReturnValue([]);

    const scenarios = result.current.getAvailableScenarios();
    expect(scenarios).toEqual([]);
  });
});
