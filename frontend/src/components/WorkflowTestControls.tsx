import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useWebSocket } from '../context/WebSocketContext';
import { useAppState } from '../context/AppStateContext';
import { toast } from '../lib/toast';

const WorkflowTestControls: React.FC = () => {
  const { isConnected, startDemoOrder } = useWebSocket();
  const { state } = useAppState();

  const handleStartDemo = (scenarioName: string) => {
    if (!isConnected) {
      toast.error('Not connected to WebSocket');
      return;
    }

    if (startDemoOrder) {
      startDemoOrder(scenarioName);
      // Generate a demo order ID for the toast
      const demoOrderId = `DEMO-${Date.now()}`;
      toast.events.demoOrderSubmitted(demoOrderId);
    } else {
      toast.error('Demo functionality not available');
    }
  };

  const activeRunsCount = Object.keys(state.workflow.activeRuns).length;

  return (
    <div
      className='p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700'
      data-testid='workflow-test-controls'
    >
      <div className='flex items-center justify-between mb-4'>
        <h3 className='font-medium'>Workflow Test Controls</h3>
        <div className='flex items-center gap-2'>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {activeRunsCount > 0 && (
            <Badge variant='outline'>
              {activeRunsCount} active run{activeRunsCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <div className='space-y-3'>
        <div>
          <p className='text-sm text-slate-600 dark:text-slate-300 mb-2'>
            Start demo workflows to test real-time updates:
          </p>
          <div className='flex gap-2 flex-wrap'>
            <Button
              onClick={() => handleStartDemo('successful_flow')}
              disabled={!isConnected}
              size='sm'
              variant='default'
              data-testid='demo-successful-flow'
            >
              Successful Flow
            </Button>
            <Button
              onClick={() => handleStartDemo('clarification_flow')}
              disabled={!isConnected}
              size='sm'
              variant='outline'
            >
              Clarification Flow
            </Button>
            <Button
              onClick={() => handleStartDemo('error_flow')}
              disabled={!isConnected}
              size='sm'
              variant='destructive'
            >
              Error Flow
            </Button>
          </div>
        </div>

        {activeRunsCount > 0 && (
          <div className='pt-3 border-t border-slate-200 dark:border-slate-700'>
            <p className='text-sm text-slate-600 dark:text-slate-300 mb-2'>
              Active Workflow Runs:
            </p>
            <div className='space-y-1'>
              {Object.values(state.workflow.activeRuns).map((run) => (
                <div
                  key={run.id}
                  className='flex items-center justify-between text-sm'
                >
                  <span className='font-mono text-xs'>{run.id}</span>
                  <div className='flex items-center gap-2'>
                    <Badge
                      variant={
                        run.status === 'running'
                          ? 'default'
                          : run.status === 'completed'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className='text-xs'
                    >
                      {run.status}
                    </Badge>
                    <span className='text-slate-500'>
                      {run.progress.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowTestControls;
