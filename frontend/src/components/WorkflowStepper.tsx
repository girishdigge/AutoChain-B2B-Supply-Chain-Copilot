import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import StepCard from './StepCard';
import type { WorkflowStep } from '../types';

export interface WorkflowStepperProps {
  steps: WorkflowStep[];
  currentStep?: string;
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (stepId: string) => void;
  className?: string;
}

// Define the standard workflow pipeline steps for ordering
const WORKFLOW_PIPELINE = [
  'planning',
  'extraction',
  'validation',
  'merge',
  'inventory',
  'pricing',
  'supplier',
  'logistics',
  'finance',
  'confirmation',
  'payment',
  'order',
  'blockchain',
  'email',
];

// Enhanced step ID mappings for backend compatibility
const STEP_ID_MAPPINGS: Record<string, string> = {
  // Exact tool names from backend logs
  OrderExtractionTool: 'extraction',
  ValidatorTool: 'validation',
  'Merge Fields Tool': 'merge',
  'Inventory Check Tool': 'inventory',
  'Pricing Calculator': 'pricing',
  'Supplier Quote Tool': 'supplier',
  LogisticsShippingTool: 'logistics',
  FinanceAndPaymentTool: 'finance',
  ClarificationTool: 'confirmation',
  StripePaymentTool: 'payment',
  'Order Tool': 'order',
  'Blockchain Anchor Tool': 'blockchain',
  'Portia Google Send Email Tool': 'email',

  // Alternative formats and variations
  order_extraction_tool: 'extraction',
  orderextractiontool: 'extraction',
  'order extraction': 'extraction',
  validator_tool: 'validation',
  validatortool: 'validation',
  merge_fields_tool: 'merge',
  mergefields: 'merge',
  inventory_tool: 'inventory',
  inventorycheck: 'inventory',
  pricing_tool: 'pricing',
  pricingcalculator: 'pricing',
  supplier_tool: 'supplier',
  supplierquote: 'supplier',
  logistics_tool: 'logistics',
  logisticsshipping: 'logistics',
  finance_tool: 'finance',
  financeandpayment: 'finance',
  clarification_tool: 'confirmation',
  clarificationtool: 'confirmation',
  stripe_payment_tool: 'payment',
  stripepayment: 'payment',
  order_tool: 'order',
  ordertool: 'order',
  blockchain_anchor: 'blockchain',
  blockchainanchor: 'blockchain',
  email: 'email',
  emailtool: 'email',

  // Planning variations
  planning: 'planning',
  plan: 'planning',
  'plan generated': 'planning',
};

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  steps,
  currentStep,
  orientation = 'vertical',
  onStepClick,
  className = '',
}) => {
  console.log('🎯 WorkflowStepper rendering with props:', {
    stepsCount: steps.length,
    currentStep,
    orientation,
    hasOnStepClick: !!onStepClick,
  });

  console.log(
    '🎯 WorkflowStepper received steps:',
    steps.map((s) => ({ id: s.id, name: s.name, status: s.status }))
  );

  // Validate props
  if (!Array.isArray(steps)) {
    console.error('❌ WorkflowStepper: steps prop is not an array:', steps);
    return (
      <div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
        <p className='text-red-600'>Error: Invalid steps data</p>
      </div>
    );
  }

  if (steps.length === 0) {
    console.warn('⚠️ WorkflowStepper: No steps provided');
    return (
      <div className='p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
        <p className='text-yellow-600'>No workflow steps available</p>
      </div>
    );
  }

  // Enhanced step ordering with better mapping and fallback handling
  const orderedSteps = React.useMemo(() => {
    console.log('🎯 WorkflowStepper: Processing steps for ordering');
    console.log(
      '   - Input steps:',
      steps.map((s) => ({ id: s.id, name: s.name, status: s.status }))
    );

    // If we have real steps, use them and sort by pipeline order
    if (steps.length > 0) {
      // Create enhanced step mapping
      const stepMap = new Map<string, WorkflowStep>();
      const stepsByToolName = new Map<string, WorkflowStep>();
      const stepsByName = new Map<string, WorkflowStep>();

      steps.forEach((step) => {
        // Map by original ID
        stepMap.set(step.id.toLowerCase(), step);

        // Map by tool name if available
        if (step.toolName) {
          stepsByToolName.set(step.toolName.toLowerCase(), step);
        }

        // Map by name
        if (step.name) {
          stepsByName.set(step.name.toLowerCase(), step);
        }

        // Map by all possible ID variations
        const mappedId = STEP_ID_MAPPINGS[step.id.toLowerCase()];
        if (mappedId && mappedId !== step.id.toLowerCase()) {
          stepMap.set(mappedId, step);
        }

        // Map by tool name variations
        if (step.toolName) {
          const toolMappedId = STEP_ID_MAPPINGS[step.toolName.toLowerCase()];
          if (toolMappedId) {
            stepMap.set(toolMappedId, step);
          }
        }
      });

      console.log('🗺️ Step mapping created:');
      console.log('   - By ID:', Array.from(stepMap.keys()));
      console.log('   - By tool name:', Array.from(stepsByToolName.keys()));

      // Build pipeline steps in order
      const pipelineSteps: WorkflowStep[] = [];

      WORKFLOW_PIPELINE.forEach((pipelineStepId) => {
        // Try multiple lookup strategies
        let foundStep: WorkflowStep | undefined;

        // 1. Direct ID match
        foundStep = stepMap.get(pipelineStepId);

        // 2. Tool name match
        if (!foundStep) {
          foundStep = Array.from(stepsByToolName.values()).find((step) => {
            const toolMappedId = step.toolName
              ? STEP_ID_MAPPINGS[step.toolName.toLowerCase()]
              : null;
            return toolMappedId === pipelineStepId;
          });
        }

        // 3. Name-based match
        if (!foundStep) {
          foundStep = Array.from(stepsByName.values()).find((step) => {
            return (
              step.name?.toLowerCase().includes(pipelineStepId) ||
              pipelineStepId.includes(step.name?.toLowerCase() || '')
            );
          });
        }

        // 4. Fuzzy match
        if (!foundStep) {
          foundStep = steps.find((step) => {
            const stepIdLower = step.id.toLowerCase();
            const stepNameLower = step.name?.toLowerCase() || '';
            const toolNameLower = step.toolName?.toLowerCase() || '';

            return (
              stepIdLower.includes(pipelineStepId) ||
              stepNameLower.includes(pipelineStepId) ||
              toolNameLower.includes(pipelineStepId) ||
              pipelineStepId.includes(stepIdLower)
            );
          });
        }

        if (foundStep) {
          console.log(
            `✅ Found step for ${pipelineStepId}:`,
            foundStep.name,
            `(${foundStep.status})`
          );
          pipelineSteps.push(foundStep);
        } else {
          console.log(
            `❌ No step found for pipeline position: ${pipelineStepId}`
          );
        }
      });

      // Add any remaining steps that weren't matched to pipeline positions
      const usedStepIds = new Set(pipelineSteps.map((s) => s.id));
      const remainingSteps = steps.filter((step) => !usedStepIds.has(step.id));

      if (remainingSteps.length > 0) {
        console.log(
          '📋 Adding remaining steps:',
          remainingSteps.map((s) => s.name)
        );
        pipelineSteps.push(...remainingSteps);
      }

      console.log(
        '🔄 Final ordered steps:',
        pipelineSteps.map((s) => ({ id: s.id, name: s.name, status: s.status }))
      );

      return pipelineSteps;
    }

    // Fallback to pipeline placeholders if no real steps
    console.log('📋 No real steps found, using default pipeline');
    return WORKFLOW_PIPELINE.map((stepId) => ({
      id: stepId,
      name: stepId.charAt(0).toUpperCase() + stepId.slice(1),
      status: 'pending' as const,
      logs: [],
      progress: 0,
    }));
  }, [steps]);

  const getStepIndex = (stepId: string) => {
    return orderedSteps.findIndex((step) => step.id === stepId);
  };

  const currentStepIndex = currentStep ? getStepIndex(currentStep) : -1;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const stepVariants = {
    hidden: {
      opacity: 0,
      y: orientation === 'vertical' ? 20 : 0,
      x: orientation === 'horizontal' ? 20 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
  };

  if (orientation === 'horizontal') {
    return (
      <motion.div
        className={`flex items-center gap-4 overflow-x-auto pb-4 ${className}`}
        variants={containerVariants}
        initial='hidden'
        animate='visible'
      >
        {orderedSteps.map((step, index) => (
          <React.Fragment key={step.id}>
            <motion.div variants={stepVariants} className='flex-shrink-0'>
              <StepCard
                step={step}
                isActive={step.status === 'active'}
                isCompleted={step.status === 'completed'}
                onClick={onStepClick ? () => onStepClick(step.id) : undefined}
                compact
              />
            </motion.div>

            {index < orderedSteps.length - 1 && (
              <motion.div variants={stepVariants} className='flex-shrink-0'>
                <ChevronRight
                  className={`w-5 h-5 transition-colors duration-300 ${
                    step.status === 'completed'
                      ? 'text-emerald-500'
                      : 'text-slate-400'
                  }`}
                />
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </motion.div>
    );
  }

  // Vertical layout (default)
  return (
    <motion.div
      className={`space-y-4 ${className}`}
      variants={containerVariants}
      initial='hidden'
      animate='visible'
    >
      {orderedSteps.map((step, index) => (
        <motion.div key={step.id} variants={stepVariants} className='relative'>
          <StepCard
            step={step}
            isActive={step.status === 'active'}
            isCompleted={step.status === 'completed'}
            onClick={onStepClick ? () => onStepClick(step.id) : undefined}
            showConnector={index < orderedSteps.length - 1}
            connectorStatus={
              step.status === 'completed'
                ? 'completed'
                : step.status === 'active'
                ? 'active'
                : 'pending'
            }
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default WorkflowStepper;
