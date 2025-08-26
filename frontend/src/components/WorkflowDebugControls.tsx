import React from 'react';
import { Button } from './ui/button';
import { useAppState } from '../context/AppStateContext';
import type { WorkflowStep } from '../types';

const WorkflowDebugControls: React.FC = () => {
  const { state, updateWorkflowRun } = useAppState();

  const currentWorkflowRun = Object.values(state.workflow.activeRuns)[0];

  const fixStuckSteps = () => {
    if (!currentWorkflowRun) return;

    console.log('🔧 Fixing stuck steps...');

    // Mark all active steps as completed (since backend shows all completed)
    const fixedSteps: WorkflowStep[] = currentWorkflowRun.steps.map((step) => {
      if (step.status === 'active' || step.status === 'pending') {
        console.log(`🔧 Fixing step ${step.id}: ${step.status} -> completed`);
        return {
          ...step,
          status: 'completed' as const,
          endTime: new Date().toISOString(),
          progress: 100,
        };
      }
      return step;
    });

    const completedCount = fixedSteps.filter(
      (s) => s.status === 'completed'
    ).length;

    updateWorkflowRun(currentWorkflowRun.id, {
      steps: fixedSteps,
      status: 'completed',
      progress: 100,
      completedSteps: completedCount,
      endTime: new Date().toISOString(),
    });

    console.log('✅ Fixed stuck steps, workflow marked as completed');
  };

  const resetWorkflow = () => {
    if (!currentWorkflowRun) return;

    console.log('🔄 Resetting workflow...');

    const resetSteps: WorkflowStep[] = currentWorkflowRun.steps.map((step) => ({
      ...step,
      status: 'pending' as const,
      startTime: undefined,
      endTime: undefined,
      progress: 0,
    }));

    updateWorkflowRun(currentWorkflowRun.id, {
      steps: resetSteps,
      status: 'pending',
      progress: 0,
      completedSteps: 0,
      endTime: undefined,
    });

    console.log('✅ Workflow reset to pending state');
  };

  const logCurrentState = () => {
    if (!currentWorkflowRun) return;

    console.log('📊 Current Workflow State:');
    console.log('Run ID:', currentWorkflowRun.id);
    console.log('Status:', currentWorkflowRun.status);
    console.log('Progress:', currentWorkflowRun.progress);
    console.log('Completed Steps:', currentWorkflowRun.completedSteps);
    console.log('Total Steps:', currentWorkflowRun.totalSteps);
    console.log('Steps:');
    currentWorkflowRun.steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.id} (${step.name}): ${step.status}`);
    });
  };

  if (!currentWorkflowRun) {
    return (
      <div className='p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg'>
        <p className='text-amber-800 dark:text-amber-200'>
          No active workflow to debug
        </p>
      </div>
    );
  }

  const stuckSteps = currentWorkflowRun.steps.filter(
    (s) => s.status === 'active' || s.status === 'pending'
  );
  const hasStuckSteps = stuckSteps.length > 0;

  return (
    <div className='p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700'>
      <h3 className='text-lg font-semibold mb-4'>Workflow Debug Controls</h3>

      {hasStuckSteps && (
        <div className='mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg'>
          <h4 className='text-sm font-medium text-amber-800 dark:text-amber-200 mb-2'>
            ⚠️ Detected {stuckSteps.length} stuck steps
          </h4>
          <div className='text-xs text-amber-700 dark:text-amber-300 space-y-1'>
            {stuckSteps.map((step) => (
              <div key={step.id}>
                • {step.id} ({step.name}): {step.status}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='flex gap-2 flex-wrap'>
        <Button
          onClick={fixStuckSteps}
          variant='default'
          size='sm'
          disabled={!hasStuckSteps}
        >
          Fix Stuck Steps
        </Button>

        <Button onClick={resetWorkflow} variant='outline' size='sm'>
          Reset Workflow
        </Button>

        <Button onClick={logCurrentState} variant='outline' size='sm'>
          Log State
        </Button>
      </div>

      <div className='mt-4 text-xs text-slate-600 dark:text-slate-300'>
        <p>
          <strong>Fix Stuck Steps:</strong> Marks all active/pending steps as
          completed
        </p>
        <p>
          <strong>Reset Workflow:</strong> Resets all steps to pending state
        </p>
        <p>
          <strong>Log State:</strong> Prints current workflow state to console
        </p>
      </div>
    </div>
  );
};

export default WorkflowDebugControls;
