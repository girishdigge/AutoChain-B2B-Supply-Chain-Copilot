import React from 'react';
import { useAppState } from '../context/AppStateContext';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const WorkflowDebugPanel: React.FC = () => {
  const { state } = useAppState();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className='mt-4 border-dashed border-amber-200 bg-amber-50/50'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm text-amber-700'>
          Debug: Workflow State
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2 text-xs'>
        <div>
          <strong>Active Runs:</strong>{' '}
          {Object.keys(state.workflow.activeRuns).length}
          {Object.keys(state.workflow.activeRuns).length > 0 && (
            <div className='ml-2 space-y-1'>
              {Object.entries(state.workflow.activeRuns).map(([runId, run]) => (
                <div key={runId} className='flex items-center gap-2'>
                  <Badge variant='outline' className='text-xs'>
                    {runId.slice(-8)}
                  </Badge>
                  <span>Status: {run.status}</span>
                  <span>Steps: {run.steps.length}</span>
                  <span>Progress: {Math.round(run.progress)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <strong>Selected Run:</strong> {state.workflow.selectedRun || 'None'}
        </div>
        <div>
          <strong>WebSocket Status:</strong> {state.websocket.status}
        </div>
        <div>
          <strong>Mock Mode:</strong> {state.mockMode ? 'Yes' : 'No'}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowDebugPanel;
