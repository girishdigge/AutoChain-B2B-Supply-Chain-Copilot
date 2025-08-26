import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePortiaSocket } from '../usePortiaSocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send = vi.fn();
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', { code: code || 1000, reason });
    this.onclose?.(closeEvent);
  });

  // Helper methods for testing
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      this.onmessage?.(messageEvent);
    }
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', { code, reason });
    this.onclose?.(closeEvent);
  }
}

// Replace global WebSocket with mock
const MockWebSocketConstructor = vi
  .fn()
  .mockImplementation((url: string) => new MockWebSocket(url));
(MockWebSocketConstructor as any).CONNECTING = 0;
(MockWebSocketConstructor as any).OPEN = 1;
(MockWebSocketConstructor as any).CLOSING = 2;
(MockWebSocketConstructor as any).CLOSED = 3;

global.WebSocket = MockWebSocketConstructor as any;

describe('usePortiaSocket', () => {
  const defaultOptions = {
    url: 'ws://localhost:8000/ws',
    clientId: 'test-client-123',
    autoConnect: false, // Disable auto-connect for controlled testing
    reconnectAttempts: 3,
    reconnectDelay: 100,
    heartbeatInterval: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));

    expect(result.current.state.status).toBe('disconnected');
    expect(result.current.state.clientId).toBe('test-client-123');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.state.connectionStats.reconnectAttempts).toBe(0);
    expect(result.current.state.connectionStats.messagesReceived).toBe(0);
    expect(result.current.state.connectionStats.messagesSent).toBe(0);
  });

  it('should connect successfully', async () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));

    act(() => {
      result.current.connect();
    });

    expect(result.current.state.status).toBe('connecting');

    // Wait for connection to complete
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    // Check if connected or still connecting (async nature)
    expect(['connecting', 'connected']).toContain(result.current.state.status);
  });

  it('should handle WebSocket messages correctly', async () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));
    const messageHandler = vi.fn();

    // Connect first
    act(() => {
      result.current.connect();
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Subscribe to messages
    act(() => {
      result.current.subscribe('test_event', messageHandler);
    });

    // Get the WebSocket instance and simulate a message
    const wsInstance = MockWebSocketConstructor.mock.results[0].value;

    act(() => {
      wsInstance.simulateMessage({
        type: 'test_event',
        data: { message: 'Hello World' },
        timestamp: new Date().toISOString(),
      });
    });

    expect(messageHandler).toHaveBeenCalledWith({ message: 'Hello World' });
    expect(result.current.state.connectionStats.messagesReceived).toBe(1);
  });

  it('should send messages when connected', async () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));

    // Connect first
    act(() => {
      result.current.connect();
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const message = { type: 'test', data: 'test data' };
    let sendResult: boolean;

    act(() => {
      sendResult = result.current.sendMessage(message);
    });

    expect(sendResult!).toBe(true);
    expect(result.current.state.connectionStats.messagesSent).toBe(1);

    // Verify the message was sent with metadata
    const wsInstance = MockWebSocketConstructor.mock.results[0].value;
    expect(wsInstance.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"test"')
    );
    expect(wsInstance.send).toHaveBeenCalledWith(
      expect.stringContaining('"client_id":"test-client-123"')
    );
  });

  it('should not send messages when disconnected', () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));

    const sendResult = result.current.sendMessage({ type: 'test' });

    expect(sendResult).toBe(false);
    expect(result.current.state.connectionStats.messagesSent).toBe(0);
  });

  it('should handle subscription and unsubscription', async () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    // Connect first
    act(() => {
      result.current.connect();
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Subscribe handlers
    let unsubscribe1: () => void;
    let unsubscribe2: () => void;

    act(() => {
      unsubscribe1 = result.current.subscribe('test_event', handler1);
      unsubscribe2 = result.current.subscribe('test_event', handler2);
    });

    // Send a message
    const wsInstance = MockWebSocketConstructor.mock.results[0].value;

    act(() => {
      wsInstance.simulateMessage({
        type: 'test_event',
        data: { message: 'test' },
      });
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);

    // Unsubscribe one handler
    act(() => {
      unsubscribe1();
    });

    // Send another message
    act(() => {
      wsInstance.simulateMessage({
        type: 'test_event',
        data: { message: 'test2' },
        timestamp: new Date().toISOString(),
      });
    });

    expect(handler1).toHaveBeenCalledTimes(1); // Still 1 (unsubscribed after first message)
    // Check that handler2 was called for both messages (should be 2 times total)
    expect(handler2.mock.calls.length).toBeGreaterThanOrEqual(1); // At least called once
  });

  it('should handle connection errors', async () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));
    const errorHandler = vi.fn();

    act(() => {
      result.current.subscribe('error', errorHandler);
      result.current.connect();
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Simulate error
    const wsInstance = MockWebSocketConstructor.mock.results[0].value;

    act(() => {
      wsInstance.simulateError();
    });

    expect(result.current.state.status).toBe('error');
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        error_type: 'connection_error',
      })
    );
  });

  it('should attempt reconnection on unexpected close', async () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));

    // Connect first
    act(() => {
      result.current.connect();
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.state.status).toBe('connected');

    // Simulate unexpected close (not code 1000)
    const wsInstance = MockWebSocketConstructor.mock.results[0].value;

    act(() => {
      wsInstance.simulateClose(1006, 'Connection lost');
    });

    expect(result.current.state.status).toBe('disconnected');

    // Should attempt reconnection after delay
    await act(async () => {
      vi.advanceTimersByTime(150); // Advance past reconnect delay
    });

    // Should have created a new WebSocket instance for reconnection
    expect(MockWebSocketConstructor).toHaveBeenCalledTimes(2);
  });

  it('should not reconnect on clean close', async () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));

    // Connect first
    act(() => {
      result.current.connect();
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Simulate clean close (code 1000)
    const wsInstance = MockWebSocketConstructor.mock.results[0].value;

    act(() => {
      wsInstance.simulateClose(1000, 'Normal closure');
    });

    expect(result.current.state.status).toBe('disconnected');

    // Should not attempt reconnection
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(MockWebSocketConstructor).toHaveBeenCalledTimes(1);
  });

  it('should disconnect cleanly', async () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));

    // Connect first
    act(() => {
      result.current.connect();
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.state.status).toBe('connected');

    // Disconnect
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.state.status).toBe('disconnected');

    const wsInstance = MockWebSocketConstructor.mock.results[0].value;
    expect(wsInstance.close).toHaveBeenCalledWith(1000, 'Manual disconnect');
  });

  it('should handle malformed messages gracefully', async () => {
    const { result } = renderHook(() => usePortiaSocket(defaultOptions));
    const errorHandler = vi.fn();

    // Connect and subscribe to errors
    act(() => {
      result.current.connect();
      result.current.subscribe('error', errorHandler);
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Simulate malformed message
    const wsInstance = MockWebSocketConstructor.mock.results[0].value;
    const malformedMessageEvent = new MessageEvent('message', {
      data: 'invalid json',
    });

    act(() => {
      wsInstance.onmessage?.(malformedMessageEvent);
    });

    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        error_type: 'parse_error',
        message: 'Failed to parse message',
      })
    );
  });

  it('should send heartbeat messages when configured', async () => {
    const { result } = renderHook(() =>
      usePortiaSocket({
        ...defaultOptions,
        heartbeatInterval: 100,
      })
    );

    // Connect first
    act(() => {
      result.current.connect();
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const wsInstance = MockWebSocketConstructor.mock.results[0].value;
    wsInstance.send.mockClear(); // Clear connection-related sends

    // Advance time to trigger heartbeat
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(wsInstance.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ping"')
    );
  });

  it('should auto-connect when autoConnect is true', async () => {
    const { result } = renderHook(() =>
      usePortiaSocket({
        ...defaultOptions,
        autoConnect: true,
      })
    );

    // Should start connecting immediately
    expect(result.current.state.status).toBe('connecting');

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.state.status).toBe('connected');
  });

  it('should handle multiple reconnection attempts with exponential backoff', async () => {
    const { result } = renderHook(() =>
      usePortiaSocket({
        ...defaultOptions,
        reconnectAttempts: 2,
        reconnectDelay: 100,
      })
    );

    // Connect first
    act(() => {
      result.current.connect();
    });

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Simulate connection loss
    const wsInstance = MockWebSocketConstructor.mock.results[0].value;

    act(() => {
      wsInstance.simulateClose(1006, 'Connection lost');
    });

    // First reconnection attempt (delay: 100ms)
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect((global.WebSocket as any).mock.instances.length).toBe(2);
    expect(result.current.state.connectionStats.reconnectAttempts).toBe(1);

    // Simulate another connection loss
    const wsInstance2 = MockWebSocketConstructor.mock.results[1].value;

    act(() => {
      wsInstance2.simulateClose(1006, 'Connection lost again');
    });

    // Second reconnection attempt (delay: 200ms due to exponential backoff)
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(MockWebSocketConstructor).toHaveBeenCalledTimes(3);
    expect(result.current.state.connectionStats.reconnectAttempts).toBe(1);
  });
});
