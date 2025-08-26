/**
 * Simple WebSocket connection test
 */
export function testWebSocketConnection() {
  const wsUrl = 'ws://127.0.0.1:8000/ws';
  const clientId = 'test-client-123';

  console.log('🔌 Testing WebSocket connection to:', wsUrl);
  console.log('🔌 Using client ID:', clientId);

  try {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully!');

      // Send client registration
      const registerMessage = {
        type: 'client_register',
        client_id: clientId,
        timestamp: new Date().toISOString(),
        correlation_id: 'test-connection-' + Date.now(),
      };

      console.log('📤 Sending registration:', registerMessage);
      ws.send(JSON.stringify(registerMessage));
    };

    ws.onmessage = (event) => {
      console.log('📥 Received message:', event.data);
      try {
        const message = JSON.parse(event.data);
        console.log('📥 Parsed message:', message);
      } catch (e) {
        console.log('📥 Raw message (not JSON):', event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    };

    // Close after 10 seconds
    setTimeout(() => {
      console.log('🔌 Closing test connection...');
      ws.close();
    }, 10000);
  } catch (error) {
    console.error('❌ Failed to create WebSocket:', error);
  }
}

// Auto-run test when imported
if (typeof window !== 'undefined') {
  console.log(
    '🔌 WebSocket test available. Run testWebSocketConnection() in console.'
  );
  (window as any).testWebSocketConnection = testWebSocketConnection;
}
