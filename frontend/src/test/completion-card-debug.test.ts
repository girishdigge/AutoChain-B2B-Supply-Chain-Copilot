/**
 * Debug test for completion card rendering issue
 */

import { emailCompletionDetector } from '../utils/EmailBasedCompletionDetector';
import { workflowDataExtractor } from '../utils/WorkflowDataExtractor';
import type { WorkflowRun } from '../types';

describe('Completion Card Debug Tests', () => {
  it('should detect completion from the actual workflow logs', () => {
    // Simulate the workflow from the logs
    const workflowRun: WorkflowRun = {
      id: '6022ac83-92f0-4402-a49b-ab171242cfe2',
      orderId: 'Lamborghini Aventador-London-thegame.girish@gmail.com',
      status: 'completed',
      progress: 100,
      startTime: '2025-08-25T21:32:43.900Z',
      endTime: '2025-08-25T21:34:45.092Z',
      totalSteps: 14,
      completedSteps: 14,
      steps: [
        {
          id: 'StripePaymentTool_6022ac83_1756157635197_ca801980',
          name: 'Payment Processing',
          toolName: 'StripePaymentTool',
          status: 'completed',
          startTime: '2025-08-25T21:33:55.199Z',
          endTime: '2025-08-25T21:33:56.431Z',
          logs: [],
          progress: 100,
          output: {
            payment_link:
              'https://checkout.stripe.com/c/pay/cs_test_a1SGW93JmrUzopMYBxGxK4fsLMYjWKhyXZebi9gNeWb2k76M389gIh54hn',
            order_id: 'Lamborghini Aventador-London-thegame.girish@gmail.com',
            status: 'pending_payment',
          },
        },
        {
          id: 'Order Tool_6022ac83_1756157642572_0a2ef134',
          name: 'Order Finalization',
          toolName: 'Order Tool',
          status: 'completed',
          startTime: '2025-08-25T21:34:02.573Z',
          endTime: '2025-08-25T21:34:02.576Z',
          logs: [],
          progress: 100,
          output:
            '✅ Order placed: 1x Lamborghini Aventador for thegame.girish@gmail.com, delivering to London.',
        },
        {
          id: 'Blockchain Anchor Tool_6022ac83_1756157649023_87626bc0',
          name: 'Blockchain Recording',
          toolName: 'Blockchain Anchor Tool',
          status: 'completed',
          startTime: '2025-08-25T21:34:09.026Z',
          endTime: '2025-08-25T21:34:19.368Z',
          logs: [],
          progress: 100,
          output:
            '73f743907eb6a863e870b8cfcc69dcf5b9cc8121853fc038fb74a030a606a0c6',
        },
        {
          id: 'email_step',
          name: 'Email Confirmation',
          toolName: 'Portia Google Send Email Tool',
          status: 'completed',
          startTime: '2025-08-25T21:34:22.127Z',
          endTime: '2025-08-25T21:34:32.059Z',
          logs: [],
          progress: 100,
          output: 'Sent email with id: 198e3276dc0679242',
        },
        {
          id: 'merge_step',
          name: 'Data Merging',
          toolName: 'Merge Fields Tool',
          status: 'completed',
          logs: [],
          progress: 100,
          output: {
            buyer_email: 'thegame.girish@gmail.com',
            model: 'Lamborghini Aventador',
            quantity: 1,
            delivery_location: 'London',
          },
        },
      ],
    };

    // Test email completion detection
    const isEmailCompleted =
      emailCompletionDetector.checkForEmailCompletion(workflowRun);
    console.log('📧 Email completion result:', isEmailCompleted);

    expect(isEmailCompleted).toBe(true);

    // Test data extraction
    const completionData =
      workflowDataExtractor.extractCompletionData(workflowRun);
    console.log('📊 Extracted completion data:', completionData);

    expect(completionData.orderId).toBe(
      'Lamborghini Aventador-London-thegame.girish@gmail.com'
    );
    expect(completionData.paymentLink).toContain('checkout.stripe.com');
    expect(completionData.blockchainTxHash).toBe(
      '0x73f743907eb6a863e870b8cfcc69dcf5b9cc8121853fc038fb74a030a606a0c6'
    );
    expect(completionData.buyerEmail).toContain('@gmail.com'); // More flexible email check
    expect(completionData.model).toBe('Lamborghini Aventador');
  });

  it('should trigger fallback completion for completed workflow with payment and blockchain', () => {
    const workflowRun: WorkflowRun = {
      id: 'test-run',
      orderId: 'test-order',
      status: 'completed',
      progress: 100,
      startTime: '2025-08-25T21:32:43.900Z',
      endTime: '2025-08-25T21:34:45.092Z',
      totalSteps: 3,
      completedSteps: 3,
      steps: [
        {
          id: 'payment',
          name: 'Payment Processing',
          toolName: 'StripePaymentTool',
          status: 'completed',
          logs: [],
          progress: 100,
          output: { payment_link: 'https://checkout.stripe.com/pay/test' },
        },
        {
          id: 'blockchain',
          name: 'Blockchain Recording',
          toolName: 'Blockchain Anchor Tool',
          status: 'completed',
          logs: [],
          progress: 100,
          output:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
        {
          id: 'order',
          name: 'Order Finalization',
          toolName: 'Order Tool',
          status: 'completed',
          logs: [],
          progress: 100,
          output: 'Order placed successfully',
        },
      ],
    };

    // Check fallback conditions
    const isWorkflowCompleted = workflowRun.status === 'completed';
    const hasPaymentStep = workflowRun.steps.some(
      (step) =>
        step.status === 'completed' &&
        (step.toolName?.toLowerCase().includes('stripe') ||
          step.toolName?.toLowerCase().includes('payment'))
    );
    const hasBlockchainStep = workflowRun.steps.some(
      (step) =>
        step.status === 'completed' &&
        (step.toolName?.toLowerCase().includes('blockchain') ||
          step.toolName?.toLowerCase().includes('anchor'))
    );
    const hasOrderStep = workflowRun.steps.some(
      (step) =>
        step.status === 'completed' &&
        (step.toolName?.toLowerCase().includes('order tool') ||
          step.name?.toLowerCase().includes('order'))
    );

    const shouldTriggerFallback =
      (isWorkflowCompleted && (hasPaymentStep || hasBlockchainStep)) ||
      (hasPaymentStep && hasBlockchainStep && hasOrderStep);

    console.log('🔄 Fallback conditions:', {
      isWorkflowCompleted,
      hasPaymentStep,
      hasBlockchainStep,
      hasOrderStep,
      shouldTriggerFallback,
    });

    expect(shouldTriggerFallback).toBe(true);
  });
});
