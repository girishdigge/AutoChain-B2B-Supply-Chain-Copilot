import React from 'react';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { useWebSocket } from '../context/WebSocketContext';
import { useAppState } from '../context/AppStateContext';

const MockWebSocketDemo: React.FC = () => {
  const { state } = useAppState();
  const {
    isConnected,
    connect,
    disconnect,
    startScenario,
    startDemoOrder,
    simulateConnectionIssue,
    generateRandomEvents,
    getAvailableScenarios,
  } = useWebSocket();

  if (!state.mockMode) {
    return null; // Only show in mock mode
  }

  const scenarios = getAvailableScenarios?.() || [];

  return (
    <Card className='w-full max-w-2xl'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          Mock WebSocket Demo
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Test WebSocket functionality with mock scenarios and events
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Connection Controls */}
        <div className='flex gap-2'>
          <Button onClick={connect} disabled={isConnected} variant='outline'>
            Connect
          </Button>
          <Button
            onClick={disconnect}
            disabled={!isConnected}
            variant='outline'
          >
            Disconnect
          </Button>
          <Button
            onClick={simulateConnectionIssue}
            disabled={!isConnected}
            variant='destructive'
          >
            Simulate Issue
          </Button>
        </div>

        {/* Demo Order Controls */}
        <div className='space-y-2'>
          <h4 className='font-medium'>Demo Orders</h4>
          <div className='flex gap-2 flex-wrap'>
            <Button
              onClick={() => startDemoOrder?.('successful_flow')}
              disabled={!isConnected}
              size='sm'
            >
              Success Flow
            </Button>
            <Button
              onClick={() => startDemoOrder?.('clarification_flow')}
              disabled={!isConnected}
              size='sm'
            >
              Clarification Flow
            </Button>
            <Button
              onClick={() => startDemoOrder?.('error_flow')}
              disabled={!isConnected}
              size='sm'
            >
              Error Flow
            </Button>
          </div>
        </div>

        {/* Scenario Controls */}
        <div className='space-y-2'>
          <h4 className='font-medium'>Available Scenarios</h4>
          <div className='flex gap-2 flex-wrap'>
            {scenarios.map((scenario) => (
              <Button
                key={scenario}
                onClick={() => startScenario?.(scenario)}
                disabled={!isConnected}
                size='sm'
                variant='outline'
              >
                {scenario.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Random Events */}
        <div className='space-y-2'>
          <h4 className='font-medium'>Testing</h4>
          <Button
            onClick={generateRandomEvents}
            disabled={!isConnected}
            variant='outline'
            size='sm'
          >
            Generate Random Event
          </Button>
        </div>

        {/* Connection Stats */}
        <div className='text-sm text-muted-foreground'>
          <p>
            Messages Received:{' '}
            {state.websocket.connectionStats.messagesReceived}
          </p>
          <p>Messages Sent: {state.websocket.connectionStats.messagesSent}</p>
          <p>
            Reconnect Attempts:{' '}
            {state.websocket.connectionStats.reconnectAttempts}
          </p>
          {state.websocket.connectionStats.connectedAt && (
            <p>
              Connected At:{' '}
              {new Date(
                state.websocket.connectionStats.connectedAt
              ).toLocaleTimeString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MockWebSocketDemo;
