import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import WorkflowStepper from './WorkflowStepper';
import type { WorkflowStep } from '../types';

const StepHighlightingTest: React.FC = () => {
  const [testSteps, setTestSteps] = useState<WorkflowStep[]>([
    {
      id: 'extraction',
      name: 'Extraction',
      status: 'pending',
      logs: [],
      progress: 0,
    },
    {
      id: 'validation',
      name: 'Validation',
      status: 'pending',
      logs: [],
      progress: 0,
    },
    {
      id: 'inventory',
      name: 'Inventory',
      status: 'pending',
      logs: [],
      progress: 0,
    },
    {
      id: 'pricing',
      name: 'Pricing',
      status: 'pending',
      logs: [],
      progress: 0,
    },
    {
      id: 'payment',
      name: 'Payment',
      status: 'pending',
      logs: [],
      progress: 0,
    },
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async () => {
    setIsRunning(true);
    setCurrentStepIndex(-1);

    // Reset all steps to pending
    setTestSteps((steps) =>
      steps.map((step) => ({ ...step, status: 'pending' as const }))
    );

    // Simulate step progression
    for (let i = 0; i < testSteps.length; i++) {
      setCurrentStepIndex(i);

      // Set current step to active
      setTestSteps((steps) =>
        steps.map((step, index) => ({
          ...step,
          status:
            index === i
              ? ('active' as const)
              : index < i
              ? ('completed' as const)
              : ('pending' as const),
        }))
      );

      // Wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Set current step to completed
      setTestSteps((steps) =>
        steps.map((step, index) => ({
          ...step,
          status: index <= i ? ('completed' as const) : ('pending' as const),
        }))
      );

      // Wait 0.5 seconds before next step
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setCurrentStepIndex(-1);
    setIsRunning(false);
  };

  const resetTest = () => {
    setTestSteps((steps) =>
      steps.map((step) => ({ ...step, status: 'pending' as const }))
    );
    setCurrentStepIndex(-1);
    setIsRunning(false);
  };

  return (
    <div className='p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700'>
      <h3 className='text-lg font-semibold mb-4'>Step Highlighting Test</h3>

      <div className='flex gap-2 mb-6'>
        <Button onClick={runTest} disabled={isRunning} variant='default'>
          {isRunning ? 'Running Test...' : 'Run Step Test'}
        </Button>
        <Button onClick={resetTest} disabled={isRunning} variant='outline'>
          Reset
        </Button>
      </div>

      <div className='mb-4'>
        <p className='text-sm text-slate-600 dark:text-slate-300'>
          Current Status:{' '}
          {isRunning
            ? `Step ${currentStepIndex + 1} of ${testSteps.length}`
            : 'Idle'}
        </p>
      </div>

      <WorkflowStepper
        steps={testSteps}
        currentStep={
          currentStepIndex >= 0 ? testSteps[currentStepIndex]?.id : undefined
        }
        orientation='vertical'
      />

      <div className='mt-4 p-3 bg-white dark:bg-slate-900 rounded border'>
        <h4 className='text-sm font-medium mb-2'>Step States:</h4>
        <div className='text-xs space-y-1'>
          {testSteps.map((step, index) => (
            <div key={step.id} className='flex gap-2'>
              <span className='w-16 font-mono'>{step.id}</span>
              <span
                className={`w-16 font-bold ${
                  step.status === 'active'
                    ? 'text-blue-600'
                    : step.status === 'completed'
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                {step.status}
              </span>
              <span>{step.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StepHighlightingTest;
