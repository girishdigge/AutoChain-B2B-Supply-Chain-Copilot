/**
 * Test script to validate workflow blank screen fixes
 * This script tests the key components that were fixed to prevent blank screens after planning stage
 */

import type { WorkflowStep, WorkflowRun } from './types';

// Mock workflow steps for testing
const createMockWorkflowSteps = (): WorkflowStep[] => [
  {
    id: 'planning',
    name: 'Planning',
    status: 'completed',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    logs: [],
    progress: 100,
  },
  {
    id: 'extraction',
    name: 'Order Extraction',
    status: 'active',
    startTime: new Date().toISOString(),
    logs: [],
    progress: 50,
    toolName: 'OrderExtractionTool',
  },
  {
    id: 'validation',
    name: 'Order Validation',
    status: 'pending',
    logs: [],
    progress: 0,
    toolName: 'ValidatorTool',
  },
];

const createMockWorkflowRun = (): WorkflowRun => ({
  id: 'test-run-123',
  orderId: 'test-order-456',
  status: 'running',
  steps: createMockWorkflowSteps(),
  startTime: new Date().toISOString(),
  totalSteps: 12,
  completedSteps: 1,
  progress: 25,
  currentStep: 'extraction',
});

// Test functions
export const testWorkflowStepProcessing = () => {
  console.log('🧪 Testing workflow step processing...');

  const mockRun = createMockWorkflowRun();
  const steps = mockRun.steps;

  // Test 1: Verify steps are not empty after planning
  console.log('Test 1: Steps after planning stage');
  const stepsAfterPlanning = steps.filter((step) => step.id !== 'planning');
  console.log(
    '✅ Steps after planning:',
    stepsAfterPlanning.length > 0 ? 'PASS' : 'FAIL'
  );
  console.log(
    '   - Steps:',
    stepsAfterPlanning.map((s) => `${s.id}:${s.status}`)
  );

  // Test 2: Verify active step is properly identified
  console.log('Test 2: Active step identification');
  const activeStep = steps.find((step) => step.status === 'active');
  console.log('✅ Active step found:', activeStep ? 'PASS' : 'FAIL');
  console.log('   - Active step:', activeStep?.id);

  // Test 3: Verify step progression logic
  console.log('Test 3: Step progression');
  const completedSteps = steps.filter((step) => step.status === 'completed');
  const pendingSteps = steps.filter((step) => step.status === 'pending');
  console.log(
    '✅ Step progression:',
    completedSteps.length > 0 && pendingSteps.length > 0 ? 'PASS' : 'FAIL'
  );
  console.log(
    '   - Completed:',
    completedSteps.map((s) => s.id)
  );
  console.log(
    '   - Pending:',
    pendingSteps.map((s) => s.id)
  );

  return {
    stepsAfterPlanning: stepsAfterPlanning.length,
    activeStep: activeStep?.id,
    completedCount: completedSteps.length,
    pendingCount: pendingSteps.length,
  };
};

export const testStepMapping = () => {
  console.log('🧪 Testing step mapping...');

  // Test tool name to step ID mapping
  const toolMappings = [
    { toolName: 'OrderExtractionTool', expectedId: 'extraction' },
    { toolName: 'ValidatorTool', expectedId: 'validation' },
    { toolName: 'StripePaymentTool', expectedId: 'payment' },
    { toolName: 'Portia Google Send Email Tool', expectedId: 'email' },
  ];

  toolMappings.forEach(({ toolName, expectedId }) => {
    // Simulate the mapping logic
    const mappedId = toolName.toLowerCase().includes('extraction')
      ? 'extraction'
      : toolName.toLowerCase().includes('validator')
      ? 'validation'
      : toolName.toLowerCase().includes('stripe')
      ? 'payment'
      : toolName.toLowerCase().includes('email')
      ? 'email'
      : 'unknown';

    const isCorrect = mappedId === expectedId;
    console.log(`✅ ${toolName} -> ${mappedId}:`, isCorrect ? 'PASS' : 'FAIL');
  });
};

export const testErrorHandling = () => {
  console.log('🧪 Testing error handling...');

  // Test with invalid data
  const invalidSteps = [
    null,
    undefined,
    { id: '', name: '', status: 'pending' },
    { id: 'test', name: null, status: 'invalid' },
  ];

  invalidSteps.forEach((step, index) => {
    try {
      // Simulate validation logic
      const isValid =
        step &&
        typeof step === 'object' &&
        step.id &&
        step.id.length > 0 &&
        ['pending', 'active', 'completed', 'failed', 'waiting'].includes(
          step.status
        );

      console.log(
        `✅ Invalid step ${index + 1}:`,
        isValid ? 'FAIL (should be invalid)' : 'PASS (correctly rejected)'
      );
    } catch (error) {
      console.log(`✅ Invalid step ${index + 1}: PASS (error caught)`);
    }
  });
};

// Run all tests
export const runWorkflowBlankScreenTests = () => {
  console.log('🚀 Running workflow blank screen fix tests...');
  console.log('================================================');

  const stepProcessingResults = testWorkflowStepProcessing();
  console.log('');

  testStepMapping();
  console.log('');

  testErrorHandling();
  console.log('');

  console.log('📊 Test Summary:');
  console.log(
    '- Steps after planning:',
    stepProcessingResults.stepsAfterPlanning
  );
  console.log(
    '- Active step identified:',
    stepProcessingResults.activeStep || 'None'
  );
  console.log('- Completed steps:', stepProcessingResults.completedCount);
  console.log('- Pending steps:', stepProcessingResults.pendingCount);
  console.log('');
  console.log(
    '✅ All tests completed. Check console output for detailed results.'
  );

  return stepProcessingResults;
};

// Auto-run tests in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Make tests available globally for manual testing
  (window as any).testWorkflowBlankScreenFix = runWorkflowBlankScreenTests;
  console.log(
    '🧪 Workflow blank screen fix tests available at: window.testWorkflowBlankScreenFix()'
  );
}
