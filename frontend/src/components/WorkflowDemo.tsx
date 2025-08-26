import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import WorkflowStepper from './WorkflowStepper';
import type { WorkflowStep } from '../types';
import { Button } from './ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

const DEMO_STEPS: WorkflowStep[] = [
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
    id: 'supplier',
    name: 'Supplier',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'logistics',
    name: 'Logistics',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'finance',
    name: 'Finance',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'confirmation',
    name: 'Confirmation',
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
  {
    id: 'blockchain',
    name: 'Blockchain',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'email',
    name: 'Email',
    status: 'pending',
    logs: [],
    progress: 0,
  },
];

const WorkflowDemo: React.FC = () => {
  const [steps, setSteps] = useState<WorkflowStep[]>(DEMO_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);

  const addLogEntry = (
    stepId: string,
    message: string,
    level: 'info' | 'warn' | 'error' = 'info'
  ) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              logs: [
                ...step.logs,
                {
                  timestamp: new Date().toISOString(),
                  level,
                  message,
                  metadata: {},
                },
              ],
            }
          : step
      )
    );
  };

  const updateStepStatus = (
    stepId: string,
    status: WorkflowStep['status'],
    progress?: number
  ) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status,
              progress: progress ?? step.progress,
              startTime:
                status === 'active' && !step.startTime
                  ? new Date().toISOString()
                  : step.startTime,
              endTime:
                status === 'completed' || status === 'failed'
                  ? new Date().toISOString()
                  : undefined,
            }
          : step
      )
    );
  };

  const simulateWorkflow = async () => {
    if (currentStepIndex >= steps.length - 1) return;

    const nextIndex = currentStepIndex + 1;
    const step = steps[nextIndex];

    setCurrentStepIndex(nextIndex);

    // Mark step as active
    updateStepStatus(step.id, 'active', 0);
    addLogEntry(step.id, `Starting ${step.name.toLowerCase()} process`);

    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 20) {
      if (!isRunning) break;

      updateStepStatus(step.id, 'active', progress);

      if (progress === 40) {
        addLogEntry(step.id, `${step.name} process is 40% complete`);
      } else if (progress === 80) {
        addLogEntry(step.id, `${step.name} process is 80% complete`);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (isRunning) {
      // Complete the step
      updateStepStatus(step.id, 'completed', 100);
      addLogEntry(step.id, `${step.name} completed successfully`);

      // Continue to next step after a short delay
      setTimeout(() => {
        if (isRunning) {
          simulateWorkflow();
        }
      }, 1000);
    }
  };

  const startDemo = () => {
    setIsRunning(true);
    simulateWorkflow();
  };

  const pauseDemo = () => {
    setIsRunning(false);
  };

  const resetDemo = () => {
    setIsRunning(false);
    setCurrentStepIndex(-1);
    setSteps(
      DEMO_STEPS.map((step) => ({
        ...step,
        status: 'pending',
        progress: 0,
        logs: [],
        startTime: undefined,
        endTime: undefined,
      }))
    );
  };

  const handleStepClick = (stepId: string) => {
    console.log(`Clicked on step: ${stepId}`);
  };

  return (
    <div className='space-y-6'>
      {/* Demo Controls */}
      <motion.div
        className='p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl'
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className='font-semibold mb-3'>Workflow Demo Controls</h3>
        <div className='flex gap-2'>
          <Button
            onClick={startDemo}
            disabled={isRunning}
            className='flex items-center gap-2'
          >
            <Play className='w-4 h-4' />
            Start Demo
          </Button>

          <Button
            onClick={pauseDemo}
            disabled={!isRunning}
            variant='outline'
            className='flex items-center gap-2'
          >
            <Pause className='w-4 h-4' />
            Pause
          </Button>

          <Button
            onClick={resetDemo}
            variant='outline'
            className='flex items-center gap-2'
          >
            <RotateCcw className='w-4 h-4' />
            Reset
          </Button>
        </div>
      </motion.div>

      {/* Workflow Stepper */}
      <WorkflowStepper
        steps={steps}
        currentStep={
          currentStepIndex >= 0 ? steps[currentStepIndex]?.id : undefined
        }
        onStepClick={handleStepClick}
        orientation='vertical'
      />
    </div>
  );
};

export default WorkflowDemo;
