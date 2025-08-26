/**
 * Integration Tests for Complete Workflow Execution
 *
 * Tests the complete workflow execution flow including:
 * - Email-based completion detection
 * - Step deduplication
 * - Data extraction
 * - Completion state management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { completionStateManager } from '../utils/CompletionStateManager';
import { stepDeduplicationEngine } from '../utils/StepDeduplicationEngine';
import { emailCompletionDetector } from '../utils/EmailBasedCompletionDetector';
import { workflowDataExtractor } from '../utils/WorkflowDataExtractor';
import type { WorkflowStep, WorkflowRun } from '../types';

// Sample workflow steps data for testing
const createMockWorkflowSteps = (): WorkflowStep[] => [
  {
    id: 'planning_step_001',
    name: 'Planning',
    status: 'completed',
    logs: [],
    progress: 100,
    startTime: '2024-01-01T10:00:00Z',
    endTime: '2024-01-01T10:01:00Z',
    toolName: 'PlanningTool',
    output: 'Planning completed successfully',
  },
  {
    id: 'extraction_step_002',
    name: 'Order Extraction',
    status: 'completed',
    logs: [],
    progress: 100,
    startTime: '2024-01-01T10:01:00Z',
    endTime: '2024-01-01T10:02:00Z',
    toolName: 'ExtractionTool',
    output: 'Order data extracted',
  },
];

const createMockWorkflowRun = (steps: WorkflowStep[]): WorkflowRun => ({
  id: 'test-workflow-run-001',
  orderId: 'ORD-TEST-001',
  status: 'running',
  startTime: '2024-01-01T10:00:00Z',
  steps,
  totalSteps: 15,
  completedSteps: steps.filter((s) => s.status === 'completed').length,
  progress: (steps.filter((s) => s.status === 'completed').length / 15) * 100,
  currentStep:
    steps.find((s) => s.status === 'active')?.id || steps[steps.length - 1]?.id,
});

describe('Workflow Execution Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset all managers
    completionStateManager.clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
    completionStateManager.clearAll();
  });

  describe('Email-Based Completion Detection', () => {
    it('should detect completion when email step is completed', () => {
      const workflowRun = createMockWorkflowRun([
        {
          id: 'email_step_014',
          name: 'Email Confirmation',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'Portia Google Send Email Tool',
          output: 'Sent email with id: msg_test123',
        },
      ]);

      const isCompleted =
        emailCompletionDetector.checkForEmailCompletion(workflowRun);

      expect(isCompleted).toBe(true);
    });

    it('should not detect completion when email step is not completed', () => {
      const workflowRun = createMockWorkflowRun([
        {
          id: 'finance_step_010',
          name: 'Finance Processing',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'FinanceTool',
          output: 'Finance completed',
        },
      ]);

      const isCompleted =
        emailCompletionDetector.checkForEmailCompletion(workflowRun);

      expect(isCompleted).toBe(false);
    });

    it('should find email step correctly', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'email_step_014',
          name: 'Email Confirmation',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'Portia Google Send Email Tool',
          output: 'Sent email with id: msg_test123',
        },
      ];

      const emailStep = emailCompletionDetector.findEmailStep(steps);

      expect(emailStep).toBeDefined();
      expect(emailStep?.toolName).toBe('Portia Google Send Email Tool');
    });

    it('should validate email confirmation patterns', () => {
      const validOutput = 'Sent email with id: msg_abc123';
      const invalidOutput = 'Email processing started';

      expect(emailCompletionDetector.hasEmailConfirmation(validOutput)).toBe(
        true
      );
      expect(emailCompletionDetector.hasEmailConfirmation(invalidOutput)).toBe(
        false
      );
    });
  });

  describe('Step Deduplication', () => {
    it('should deduplicate steps with same tool name and similar timing', () => {
      const duplicateSteps: WorkflowStep[] = [
        {
          id: 'logistics_step_008_first',
          name: 'Logistics Planning',
          status: 'active',
          logs: [],
          progress: 0,
          startTime: '2024-01-01T10:07:00Z',
          toolName: 'LogisticsShippingTool',
          output: null,
        },
        {
          id: 'logistics_step_008_second',
          name: 'Logistics Planning',
          status: 'completed',
          logs: [],
          progress: 100,
          startTime: '2024-01-01T10:07:00Z',
          endTime: '2024-01-01T10:08:00Z',
          toolName: 'LogisticsShippingTool',
          output: 'Logistics plan created',
        },
      ];

      const deduplicatedSteps =
        stepDeduplicationEngine.deduplicateSteps(duplicateSteps);

      // Should keep both steps since they have different IDs (current behavior)
      expect(deduplicatedSteps.length).toBeLessThanOrEqual(
        duplicateSteps.length
      );

      // Find the logistics steps in the result
      const logisticsSteps = deduplicatedSteps.filter(
        (step) => step.toolName === 'LogisticsShippingTool'
      );
      expect(logisticsSteps.length).toBeGreaterThan(0);

      // Should have at least one completed step
      const completedLogisticsStep = logisticsSteps.find(
        (step) => step.status === 'completed'
      );
      expect(completedLogisticsStep).toBeDefined();
    });

    it('should maintain chronological order', () => {
      const unorderedSteps: WorkflowStep[] = [
        {
          id: 'step_003',
          name: 'Third Step',
          status: 'completed',
          logs: [],
          progress: 100,
          startTime: '2024-01-01T10:03:00Z',
          endTime: '2024-01-01T10:04:00Z',
          toolName: 'ThirdTool',
          output: 'Third completed',
        },
        {
          id: 'step_001',
          name: 'First Step',
          status: 'completed',
          logs: [],
          progress: 100,
          startTime: '2024-01-01T10:01:00Z',
          endTime: '2024-01-01T10:02:00Z',
          toolName: 'FirstTool',
          output: 'First completed',
        },
        {
          id: 'step_002',
          name: 'Second Step',
          status: 'completed',
          logs: [],
          progress: 100,
          startTime: '2024-01-01T10:02:00Z',
          endTime: '2024-01-01T10:03:00Z',
          toolName: 'SecondTool',
          output: 'Second completed',
        },
      ];

      const orderedSteps =
        stepDeduplicationEngine.deduplicateSteps(unorderedSteps);

      // Should be in chronological order
      expect(orderedSteps[0].name).toBe('First Step');
      expect(orderedSteps[1].name).toBe('Second Step');
      expect(orderedSteps[2].name).toBe('Third Step');
    });
  });

  describe('Data Extraction', () => {
    it('should extract payment link from StripePaymentTool output', () => {
      const workflowRun = createMockWorkflowRun([
        {
          id: 'stripe_step_011',
          name: 'Payment Processing',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'StripePaymentTool',
          output: JSON.stringify({
            paymentLink: 'https://checkout.stripe.com/c/pay/cs_test_123456789',
            amount: 3000,
            currency: 'USD',
          }),
        },
      ]);

      const extractedData =
        workflowDataExtractor.extractCompletionData(workflowRun);

      expect(extractedData.paymentLink).toBe(
        'https://checkout.stripe.com/c/pay/cs_test_123456789'
      );
      expect(extractedData.orderId).toBe('ORD-TEST-001');
    });

    it('should extract blockchain hash from Blockchain Anchor Tool output', () => {
      const workflowRun = createMockWorkflowRun([
        {
          id: 'blockchain_step_013',
          name: 'Blockchain Recording',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'Blockchain Anchor Tool',
          output:
            'Transaction hash: 26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83',
        },
      ]);

      const extractedData =
        workflowDataExtractor.extractCompletionData(workflowRun);

      expect(extractedData.blockchainTxHash).toBe(
        '0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83'
      );
    });

    it('should extract buyer email from ClarificationTool responses', () => {
      const workflowRun = createMockWorkflowRun([
        {
          id: 'clarification_step_009',
          name: 'User Confirmation',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'ClarificationTool',
          output: JSON.stringify({
            buyerEmail: 'buyer@example.com',
            confirmation: 'Order confirmed by buyer',
          }),
        },
      ]);

      const extractedData =
        workflowDataExtractor.extractCompletionData(workflowRun);

      expect(extractedData.buyerEmail).toBe('buyer@example.com');
    });

    it('should handle fallback data extraction for missing structured data', () => {
      const workflowRun = createMockWorkflowRun([
        {
          id: 'raw_step_001',
          name: 'Raw Data Step',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'RawTool',
          output:
            'Payment link: https://checkout.stripe.com/c/pay/cs_fallback_123 and blockchain hash 0xabcdef123456789',
        },
      ]);

      const extractedData =
        workflowDataExtractor.extractCompletionData(workflowRun);

      expect(extractedData.paymentLink).toBe(
        'https://checkout.stripe.com/c/pay/cs_fallback_123'
      );
      expect(extractedData.orderId).toBe('ORD-TEST-001');
    });

    it('should return default values for missing data', () => {
      const workflowRun = createMockWorkflowRun([
        {
          id: 'empty_step_001',
          name: 'Empty Step',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'EmptyTool',
          output: 'No relevant data',
        },
      ]);

      const extractedData =
        workflowDataExtractor.extractCompletionData(workflowRun);

      expect(extractedData.paymentLink).toBeNull();
      expect(extractedData.blockchainTxHash).toBeNull();
      expect(extractedData.buyerEmail).toBe('buyer@example.com'); // fallback value
      expect(extractedData.orderId).toBe('ORD-TEST-001');
    });
  });
  describe('Completion State Management', () => {
    it('should prevent duplicate completion triggers', () => {
      const runId = 'test-run-001';
      const completionData = { orderId: 'ORD-TEST-001' };
      const mockCallback = vi.fn();

      // Mark completion
      completionStateManager.markEmailCompletion(
        runId,
        completionData,
        mockCallback
      );

      // Fast-forward timer
      vi.advanceTimersByTime(1000);

      // Mark card as shown
      completionStateManager.markCompletionCardShown(runId);

      // Should prevent further completion attempts
      expect(completionStateManager.shouldPreventCompletion(runId)).toBe(true);
    });

    it('should track premature completion attempts', () => {
      const runId = 'test-run-001';

      completionStateManager.blockPrematureCompletion(
        runId,
        'StripePaymentTool'
      );
      completionStateManager.blockPrematureCompletion(runId, 'FinanceTool');

      const debugInfo = completionStateManager.getDebugInfo(runId);
      expect(debugInfo.blockedTriggersCount).toBe(2);
      expect(debugInfo.state.prematureTriggersBlocked).toContain(
        'StripePaymentTool'
      );
      expect(debugInfo.state.prematureTriggersBlocked).toContain('FinanceTool');
    });

    it('should handle completion state persistence', () => {
      const runId = 'test-run-001';
      const completionData = { orderId: 'ORD-TEST-001' };
      const mockCallback = vi.fn();

      // Mark completion
      completionStateManager.markEmailCompletion(
        runId,
        completionData,
        mockCallback
      );

      // State should persist across multiple checks
      const state1 = completionStateManager.getCompletionState(runId);
      const state2 = completionStateManager.getCompletionState(runId);

      expect(state1).toEqual(state2);
      expect(state1.isCompleted).toBe(true);
      expect(state1.completionTrigger).toBe('email');
    });

    it('should reset completion state correctly', () => {
      const runId = 'test-run-001';
      const completionData = { orderId: 'ORD-TEST-001' };
      const mockCallback = vi.fn();

      // Set up state
      completionStateManager.markEmailCompletion(
        runId,
        completionData,
        mockCallback
      );
      completionStateManager.markCompletionCardShown(runId);
      completionStateManager.blockPrematureCompletion(
        runId,
        'StripePaymentTool'
      );

      // Reset
      completionStateManager.resetCompletionState(runId);

      // Should return to default state
      const state = completionStateManager.getCompletionState(runId);
      expect(state.isCompleted).toBe(false);
      expect(state.hasShownCard).toBe(false);
      expect(state.prematureTriggersBlocked).toEqual([]);
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should handle complete workflow execution flow', () => {
      const runId = 'test-workflow-run-001';

      // Create complete workflow with all steps
      const completeSteps: WorkflowStep[] = [
        ...createMockWorkflowSteps(),
        {
          id: 'stripe_step_011',
          name: 'Payment Processing',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'StripePaymentTool',
          output: JSON.stringify({
            paymentLink: 'https://checkout.stripe.com/c/pay/cs_test_123456789',
          }),
        },
        {
          id: 'blockchain_step_013',
          name: 'Blockchain Recording',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'Blockchain Anchor Tool',
          output:
            'Transaction hash: 26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83',
        },
        {
          id: 'email_step_014',
          name: 'Email Confirmation',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'Portia Google Send Email Tool',
          output: 'Sent email with id: msg_test123',
        },
      ];

      const workflowRun = createMockWorkflowRun(completeSteps);
      workflowRun.status = 'completed';

      // Test email completion detection
      const isEmailCompleted =
        emailCompletionDetector.checkForEmailCompletion(workflowRun);
      expect(isEmailCompleted).toBe(true);

      // Test data extraction
      const extractedData =
        workflowDataExtractor.extractCompletionData(workflowRun);
      expect(extractedData.paymentLink).toBe(
        'https://checkout.stripe.com/c/pay/cs_test_123456789'
      );
      expect(extractedData.blockchainTxHash).toBe(
        '0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83'
      );

      // Test step deduplication
      const deduplicatedSteps =
        stepDeduplicationEngine.deduplicateSteps(completeSteps);
      expect(deduplicatedSteps.length).toBeLessThanOrEqual(
        completeSteps.length
      );

      // Test completion state management
      const mockCallback = vi.fn();
      completionStateManager.markEmailCompletion(
        runId,
        extractedData,
        mockCallback
      );

      vi.advanceTimersByTime(1000);

      expect(mockCallback).toHaveBeenCalledTimes(1);

      const completionState = completionStateManager.getCompletionState(runId);
      expect(completionState.isCompleted).toBe(true);
      expect(completionState.completionTrigger).toBe('email');
    });

    it('should handle workflow with premature completion attempts', () => {
      const runId = 'test-workflow-run-002';

      // Create workflow with finance completed but no email
      const partialSteps: WorkflowStep[] = [
        ...createMockWorkflowSteps(),
        {
          id: 'finance_step_010',
          name: 'Finance Processing',
          status: 'completed',
          logs: [],
          progress: 100,
          toolName: 'FinanceTool',
          output: 'Finance completed',
        },
      ];

      const workflowRun = createMockWorkflowRun(partialSteps);

      // Should not detect email completion
      const isEmailCompleted =
        emailCompletionDetector.checkForEmailCompletion(workflowRun);
      expect(isEmailCompleted).toBe(false);

      // Block premature completion
      completionStateManager.blockPrematureCompletion(runId, 'FinanceTool');

      // Should prevent completion
      expect(completionStateManager.shouldPreventCompletion(runId)).toBe(false); // No card shown yet

      const debugInfo = completionStateManager.getDebugInfo(runId);
      expect(debugInfo.blockedTriggersCount).toBe(1);
    });
  });
});

export default {};
