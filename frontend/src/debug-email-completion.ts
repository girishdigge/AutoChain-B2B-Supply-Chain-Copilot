/**
 * Debug script for email completion and OrderCompletionCard rendering issues
 */

import { emailCompletionDetector } from './utils/EmailBasedCompletionDetector';
import { workflowDataExtractor } from './utils/WorkflowDataExtractor';
import type { WorkflowRun, WorkflowStep } from './types';

// Mock workflow run with email step for testing
const createMockWorkflowRunWithEmail = (): WorkflowRun => ({
  id: 'test-run-email-debug',
  orderId: 'test-order-email-debug',
  status: 'completed',
  steps: [
    {
      id: 'planning',
      name: 'Planning',
      status: 'completed',
      logs: [],
      progress: 100,
    },
    {
      id: 'extraction',
      name: 'Order Extraction',
      status: 'completed',
      logs: [],
      progress: 100,
      toolName: 'OrderExtractionTool',
    },
    {
      id: 'payment',
      name: 'Payment Processing',
      status: 'completed',
      logs: [],
      progress: 100,
      toolName: 'StripePaymentTool',
      output: {
        payment_link: 'https://checkout.stripe.com/c/pay/cs_test_123456789',
        status: 'success',
      },
    },
    {
      id: 'blockchain',
      name: 'Blockchain Recording',
      status: 'completed',
      logs: [],
      progress: 100,
      toolName: 'Blockchain Anchor Tool',
      output:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    {
      id: 'email',
      name: 'Email Confirmation',
      status: 'completed',
      logs: [],
      progress: 100,
      toolName: 'Portia Google Send Email Tool',
      output: 'Sent email with id: 198e3276dc0679242',
    },
  ],
  startTime: new Date().toISOString(),
  totalSteps: 5,
  completedSteps: 5,
  progress: 100,
});

// Mock workflow run without email step
const createMockWorkflowRunWithoutEmail = (): WorkflowRun => ({
  id: 'test-run-no-email',
  orderId: 'test-order-no-email',
  status: 'completed',
  steps: [
    {
      id: 'planning',
      name: 'Planning',
      status: 'completed',
      logs: [],
      progress: 100,
    },
    {
      id: 'payment',
      name: 'Payment Processing',
      status: 'completed',
      logs: [],
      progress: 100,
      toolName: 'StripePaymentTool',
      output: {
        payment_link: 'https://checkout.stripe.com/c/pay/cs_test_123456789',
      },
    },
    {
      id: 'blockchain',
      name: 'Blockchain Recording',
      status: 'completed',
      logs: [],
      progress: 100,
      toolName: 'Blockchain Anchor Tool',
      output:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
  ],
  startTime: new Date().toISOString(),
  totalSteps: 3,
  completedSteps: 3,
  progress: 100,
});

// Debug functions
export const debugEmailCompletion = () => {
  console.log('🔍 DEBUG: Testing email completion detection...');

  // Test 1: Workflow with email step
  console.log('\n=== Test 1: Workflow WITH email step ===');
  const workflowWithEmail = createMockWorkflowRunWithEmail();
  const hasEmailCompletion =
    emailCompletionDetector.checkForEmailCompletion(workflowWithEmail);
  console.log('✅ Email completion detected:', hasEmailCompletion);

  const emailStepInfo =
    emailCompletionDetector.getEmailStepInfo(workflowWithEmail);
  console.log('📧 Email step info:', emailStepInfo);

  // Test 2: Workflow without email step
  console.log('\n=== Test 2: Workflow WITHOUT email step ===');
  const workflowWithoutEmail = createMockWorkflowRunWithoutEmail();
  const hasEmailCompletionFallback =
    emailCompletionDetector.checkForEmailCompletion(workflowWithoutEmail);
  console.log(
    '✅ Email completion detected (fallback):',
    hasEmailCompletionFallback
  );

  // Test 3: Data extraction
  console.log('\n=== Test 3: Data extraction ===');
  const completionData =
    workflowDataExtractor.extractCompletionData(workflowWithEmail);
  console.log('📊 Extracted completion data:', completionData);

  return {
    withEmail: hasEmailCompletion,
    withoutEmail: hasEmailCompletionFallback,
    completionData,
    emailStepInfo,
  };
};

export const debugOrderCompletionCard = (workflowRun: WorkflowRun) => {
  console.log('🔍 DEBUG: Testing OrderCompletionCard data...');

  // Check email completion
  const isEmailCompleted =
    emailCompletionDetector.checkForEmailCompletion(workflowRun);
  console.log('📧 Email completion:', isEmailCompleted);

  // Extract completion data
  const completionData =
    workflowDataExtractor.extractCompletionData(workflowRun);
  console.log('📊 Completion data:', completionData);

  // Validate data for OrderCompletionCard
  const validation = {
    hasOrderId: !!completionData.orderId,
    hasPaymentLink: !!completionData.paymentLink,
    hasValidPaymentLink: completionData.paymentLink?.includes(
      'checkout.stripe.com'
    ),
    hasBlockchainHash: !!completionData.blockchainTxHash,
    hasValidBlockchainHash: completionData.blockchainTxHash?.length === 66, // 0x + 64 chars
    hasBuyerEmail: !!completionData.buyerEmail,
    hasValidBuyerEmail: completionData.buyerEmail?.includes('@'),
    hasModel: completionData.model !== 'Unknown Model',
    hasTotalAmount: completionData.totalAmount !== '$0.00',
  };

  console.log('✅ OrderCompletionCard validation:', validation);

  return {
    isEmailCompleted,
    completionData,
    validation,
    shouldShowCard: isEmailCompleted && validation.hasOrderId,
  };
};

// Check current workflow state
export const debugCurrentWorkflowState = () => {
  console.log('🔍 DEBUG: Checking current workflow state...');

  // Try to access the app state if available
  if (typeof window !== 'undefined' && (window as any).appState) {
    const appState = (window as any).appState;
    const activeRuns = appState.workflow?.activeRuns || {};

    console.log('📊 Active workflow runs:', Object.keys(activeRuns).length);

    Object.values(activeRuns).forEach((run: any) => {
      console.log(`\n🔄 Workflow Run: ${run.id}`);
      console.log('   Status:', run.status);
      console.log('   Progress:', run.progress);
      console.log('   Steps:', run.steps?.length || 0);

      if (run.steps) {
        const emailSteps = run.steps.filter(
          (step: any) =>
            step.toolName?.toLowerCase().includes('email') ||
            step.name?.toLowerCase().includes('email') ||
            step.id?.toLowerCase().includes('email')
        );

        console.log('   Email steps:', emailSteps.length);
        emailSteps.forEach((step: any) => {
          console.log(`     - ${step.id}: ${step.name} (${step.status})`);
        });

        // Test completion detection
        const result = debugOrderCompletionCard(run);
        console.log(
          '   Completion check:',
          result.shouldShowCard
            ? '✅ Should show card'
            : '❌ Should not show card'
        );
      }
    });
  } else {
    console.log('❌ App state not available in window object');
  }
};

// Auto-run debug functions in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Make debug functions available globally
  (window as any).debugEmailCompletion = debugEmailCompletion;
  (window as any).debugOrderCompletionCard = debugOrderCompletionCard;
  (window as any).debugCurrentWorkflowState = debugCurrentWorkflowState;

  console.log('🧪 Email completion debug functions available:');
  console.log('- window.debugEmailCompletion()');
  console.log('- window.debugOrderCompletionCard(workflowRun)');
  console.log('- window.debugCurrentWorkflowState()');
}
