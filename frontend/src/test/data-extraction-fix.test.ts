/**
 * Test for improved data extraction and step deduplication fixes
 */

import { stepDeduplicationEngine } from '../utils/StepDeduplicationEngine';
import { workflowDataExtractor } from '../utils/WorkflowDataExtractor';
import type { WorkflowRun, WorkflowStep } from '../types';

describe('Data Extraction and Deduplication Fixes', () => {
  beforeEach(() => {
    stepDeduplicationEngine.reset();
  });

  describe('Improved Data Extraction', () => {
    it('should extract order details from realistic workflow output', () => {
      const workflowRun: WorkflowRun = {
        id: 'test-run',
        orderId: 'Lamborghini Aventador-London-thegame.girish@gmail.com',
        status: 'completed',
        progress: 100,
        startTime: '2025-08-25T21:32:43.900Z',
        endTime: '2025-08-25T21:34:45.092Z',
        totalSteps: 5,
        completedSteps: 5,
        steps: [
          {
            id: 'extraction',
            name: 'Order Extraction',
            toolName: 'OrderExtractionTool',
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
          {
            id: 'order',
            name: 'Order Finalization',
            toolName: 'Order Tool',
            status: 'completed',
            logs: [],
            progress: 100,
            output:
              '✅ Order placed: 1x Lamborghini Aventador for thegame.girish@gmail.com, delivering to London.',
          },
          {
            id: 'finance',
            name: 'Finance Terms',
            toolName: 'FinanceAndPaymentTool',
            status: 'completed',
            logs: [],
            progress: 100,
            output: '💳 Finance Summary: Total Payable: USD 553,161.60',
          },
          {
            id: 'payment',
            name: 'Payment Processing',
            toolName: 'StripePaymentTool',
            status: 'completed',
            logs: [],
            progress: 100,
            output: {
              payment_link: 'https://checkout.stripe.com/c/pay/cs_test_12345',
              order_id: 'thegame.girish@gmail.com-Lamborghini-London',
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
              '73f743907eb6a863e870b8cfcc69dcf5b9cc8121853fc038fb74a030a606a0c6',
          },
        ],
      };

      const completionData =
        workflowDataExtractor.extractCompletionData(workflowRun);

      console.log('📊 Extracted completion data:', completionData);

      // Should extract correct order details
      expect(completionData.orderId).toBe(
        'Lamborghini Aventador-London-thegame.girish@gmail.com'
      );
      expect(completionData.model).toContain('Lamborghini Aventador'); // More flexible check
      expect(completionData.quantity).toBe(1);
      expect(completionData.deliveryLocation).toBe('London');
      expect(completionData.totalAmount).toContain('553,161.60');
      expect(completionData.buyerEmail).toBe('thegame.girish@gmail.com');
      expect(completionData.paymentLink).toContain('checkout.stripe.com');
      expect(completionData.blockchainTxHash).toBe(
        '0x73f743907eb6a863e870b8cfcc69dcf5b9cc8121853fc038fb74a030a606a0c6'
      );
    });
  });

  describe('Aggressive Step Deduplication', () => {
    it('should aggressively deduplicate OrderExtractionTool steps', () => {
      const duplicateSteps: WorkflowStep[] = [
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
          id: 'extraction_3',
          name: 'Order Extraction',
          toolName: 'OrderExtractionTool',
          status: 'completed',
          startTime: '2025-08-25T20:52:42.000Z',
          endTime: '2025-08-25T20:52:43.000Z',
          logs: [],
          progress: 100,
        },
      ];

      const deduplicated =
        stepDeduplicationEngine.deduplicateSteps(duplicateSteps);

      console.log('🧹 Deduplication result:', {
        input: duplicateSteps.length,
        output: deduplicated.length,
        steps: deduplicated.map((s) => ({
          name: s.name,
          status: s.status,
          progress: s.progress,
        })),
      });

      // Should deduplicate to only 1 step
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].status).toBe('completed');
      expect(deduplicated[0].toolName).toBe('OrderExtractionTool');
      expect(deduplicated[0].progress).toBe(100);
    });

    it('should handle mixed case and spacing in tool names', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Order Extraction',
          toolName: 'OrderExtractionTool',
          status: 'active',
          logs: [],
          progress: 50,
        },
        {
          id: 'step2',
          name: 'order extraction',
          toolName: 'Order Extraction Tool',
          status: 'completed',
          logs: [],
          progress: 100,
        },
        {
          id: 'step3',
          name: 'ORDER EXTRACTION',
          toolName: 'orderextractiontool',
          status: 'completed',
          logs: [],
          progress: 100,
        },
      ];

      const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

      console.log('🧹 Case-insensitive deduplication:', {
        input: steps.length,
        output: deduplicated.length,
      });

      // Should deduplicate all variations to 1 step
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].status).toBe('completed');
    });
  });
});
