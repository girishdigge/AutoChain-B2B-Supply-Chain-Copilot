/**
 * Test for completion card and step deduplication fixes
 */

import { stepDeduplicationEngine } from '../utils/StepDeduplicationEngine';
import { emailCompletionDetector } from '../utils/EmailBasedCompletionDetector';
import { workflowDataExtractor } from '../utils/WorkflowDataExtractor';
import type { WorkflowRun, WorkflowStep } from '../types';

describe('Completion Card and Step Deduplication Fixes', () => {
  beforeEach(() => {
    stepDeduplicationEngine.reset();
  });

  describe('Step Deduplication Fix', () => {
    it('should deduplicate OrderExtractionTool steps correctly', () => {
      const duplicateSteps: WorkflowStep[] = [
        {
          id: 'extraction_1',
          name: 'Order Extraction',
          toolName: 'OrderExtractionTool',
          status: 'active',
          startTime: '2025-08-25T20:52:39.315Z',
          logs: [],
          progress: 0,
        },
        {
          id: 'extraction_2',
          name: 'Order Extraction',
          toolName: 'OrderExtractionTool',
          status: 'completed',
          startTime: '2025-08-25T20:52:39.315Z',
          endTime: '2025-08-25T20:52:41.869Z',
          logs: [],
          progress: 100,
        },
      ];

      const deduplicated =
        stepDeduplicationEngine.deduplicateSteps(duplicateSteps);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].status).toBe('completed');
      expect(deduplicated[0].toolName).toBe('OrderExtractionTool');
      expect(deduplicated[0].progress).toBe(100);
    });

    it('should handle multiple tool duplicates correctly', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'extraction_1',
          name: 'Order Extraction',
          toolName: 'OrderExtractionTool',
          status: 'active',
          startTime: '2025-08-25T20:52:39.315Z',
          logs: [],
          progress: 50,
        },
        {
          id: 'extraction_2',
          name: 'Order Extraction',
          toolName: 'OrderExtractionTool',
          status: 'completed',
          startTime: '2025-08-25T20:52:39.315Z',
          endTime: '2025-08-25T20:52:41.869Z',
          logs: [],
          progress: 100,
        },
        {
          id: 'validation_1',
          name: 'Order Validation',
          toolName: 'ValidatorTool',
          status: 'completed',
          startTime: '2025-08-25T20:52:47.200Z',
          endTime: '2025-08-25T20:52:47.252Z',
          logs: [],
          progress: 100,
        },
      ];

      const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

      expect(deduplicated).toHaveLength(2);
      expect(
        deduplicated.find((s) => s.toolName === 'OrderExtractionTool')?.status
      ).toBe('completed');
      expect(
        deduplicated.find((s) => s.toolName === 'ValidatorTool')?.status
      ).toBe('completed');
    });
  });

  describe('Email Completion Detection Fix', () => {
    it('should detect completion when email step is completed', () => {
      const workflowRun: WorkflowRun = {
        id: 'test-run',
        orderId: 'test-order',
        status: 'completed',
        progress: 100,
        startTime: '2025-08-25T20:51:51.533Z',
        endTime: '2025-08-25T20:54:26.492Z',
        totalSteps: 3,
        completedSteps: 3,
        steps: [
          {
            id: 'blockchain',
            name: 'Blockchain Recording',
            toolName: 'Blockchain Anchor Tool',
            status: 'completed',
            startTime: '2025-08-25T20:54:13.423Z',
            endTime: '2025-08-25T20:54:26.492Z',
            logs: [],
            progress: 100,
          },
          {
            id: 'email',
            name: 'Email Confirmation',
            toolName: 'Portia Google Send Email Tool',
            status: 'completed',
            startTime: '2025-08-25T20:54:27.000Z',
            endTime: '2025-08-25T20:54:28.000Z',
            logs: [],
            progress: 100,
            output: 'Sent email with id: msg_12345',
          },
        ],
      };

      const isCompleted =
        emailCompletionDetector.checkForEmailCompletion(workflowRun);
      expect(isCompleted).toBe(true);
    });

    it('should use fallback detection when email step is missing but workflow is completed', () => {
      const workflowRun: WorkflowRun = {
        id: 'test-run',
        orderId: 'test-order',
        status: 'completed',
        progress: 100,
        startTime: '2025-08-25T20:51:51.533Z',
        endTime: '2025-08-25T20:54:26.492Z',
        totalSteps: 2,
        completedSteps: 2,
        steps: [
          {
            id: 'blockchain',
            name: 'Blockchain Recording',
            toolName: 'Blockchain Anchor Tool',
            status: 'completed',
            startTime: '2025-08-25T20:54:13.423Z',
            endTime: '2025-08-25T20:54:26.492Z',
            logs: [],
            progress: 100,
          },
        ],
      };

      const isCompleted =
        emailCompletionDetector.checkForEmailCompletion(workflowRun);
      expect(isCompleted).toBe(true); // Should use fallback logic
    });
  });

  describe('Workflow Data Extraction', () => {
    it('should extract completion data from workflow steps', () => {
      const workflowRun: WorkflowRun = {
        id: 'test-run',
        orderId: 'test-order-123',
        status: 'completed',
        progress: 100,
        startTime: '2025-08-25T20:51:51.533Z',
        endTime: '2025-08-25T20:54:26.492Z',
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
            output: {
              payment_url: 'https://checkout.stripe.com/pay/cs_test_12345',
            },
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
            id: 'merge',
            name: 'Data Merging',
            toolName: 'Merge Fields Tool',
            status: 'completed',
            logs: [],
            progress: 100,
            output: {
              model: 'Lamborghini Aventador',
              quantity: 1,
              delivery_location: 'London',
              total_amount: 'USD 553,161.60',
              buyer_email: 'buyer@example.com',
            },
          },
        ],
      };

      const completionData =
        workflowDataExtractor.extractCompletionData(workflowRun);

      expect(completionData.orderId).toBe('test-order-123');
      expect(completionData.paymentLink).toBe(
        'https://checkout.stripe.com/pay/cs_test_12345'
      );
      expect(completionData.blockchainTxHash).toBe(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );
      expect(completionData.model).toBe('Lamborghini Aventador');
      expect(completionData.quantity).toBe(1);
      expect(completionData.deliveryLocation).toBe('London');
      expect(completionData.totalAmount).toBe('USD 553,161.60');
      expect(completionData.buyerEmail).toBe('buyer@example.com');
    });
  });
});
