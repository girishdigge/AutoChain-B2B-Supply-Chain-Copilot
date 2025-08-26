import { describe, it, expect, beforeEach } from 'vitest';
import { stepDeduplicationEngine } from '../StepDeduplicationEngine';
import type { WorkflowStep } from '../../types';

describe('StepDeduplicationEngine - Requirements Verification', () => {
  beforeEach(() => {
    stepDeduplicationEngine.reset();
  });

  describe('Requirement 2.1: Step deduplication by unique step_id before display', () => {
    it('should deduplicate steps using backend-generated step_id', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step_uuid_12345',
          name: 'Order Extraction',
          status: 'active',
          startTime: '2024-01-01T10:00:00Z',
          logs: [],
        },
        {
          id: 'step_uuid_12345', // Same backend step_id
          name: 'Order Extraction',
          status: 'completed',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T10:05:00Z',
          logs: [],
        },
      ];

      const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].status).toBe('completed');
      expect(deduplicated[0].id).toBe('step_uuid_12345');
    });
  });

  describe('Requirement 2.4: LogisticsShippingTool executes twice, only one instance displayed', () => {
    it('should show only one instance of LogisticsShippingTool when executed twice', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'logistics_1',
          name: 'Logistics Planning',
          status: 'active',
          startTime: '2024-01-01T10:00:00Z',
          logs: [],
          toolName: 'LogisticsShippingTool',
        },
        {
          id: 'logistics_2',
          name: 'Logistics Planning',
          status: 'completed',
          startTime: '2024-01-01T10:00:00Z', // Same execution time
          endTime: '2024-01-01T10:05:00Z',
          logs: [],
          toolName: 'LogisticsShippingTool',
          output: { shipping_cost: 25.99 },
        },
      ];

      const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].toolName).toBe('LogisticsShippingTool');
      expect(deduplicated[0].status).toBe('completed');
      expect(deduplicated[0].output).toEqual({ shipping_cost: 25.99 });
    });
  });

  describe('Requirement 3.1: Frontend displays exactly 15 unique steps', () => {
    it('should maintain exactly 15 unique steps even with duplicates', () => {
      // Create 15 unique steps with some duplicates
      const steps: WorkflowStep[] = [];

      // Add 15 unique steps
      for (let i = 1; i <= 15; i++) {
        steps.push({
          id: `step_${i}`,
          name: `Step ${i}`,
          status: 'completed',
          startTime: `2024-01-01T10:${i.toString().padStart(2, '0')}:00Z`,
          logs: [],
        });
      }

      // Add some duplicates
      steps.push({
        id: 'step_5', // Duplicate of step 5
        name: 'Step 5',
        status: 'completed',
        startTime: '2024-01-01T10:05:00Z',
        logs: [],
      });

      steps.push({
        id: 'step_10', // Duplicate of step 10
        name: 'Step 10',
        status: 'completed',
        startTime: '2024-01-01T10:10:00Z',
        logs: [],
      });

      const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

      expect(deduplicated).toHaveLength(15);
      expect(deduplicated.map((s) => s.id)).toEqual([
        'step_1',
        'step_2',
        'step_3',
        'step_4',
        'step_5',
        'step_6',
        'step_7',
        'step_8',
        'step_9',
        'step_10',
        'step_11',
        'step_12',
        'step_13',
        'step_14',
        'step_15',
      ]);
    });
  });

  describe('Requirement 3.2: Step transitions from started to completed update same entry', () => {
    it('should merge step status transitions into same entry', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'payment_step',
          name: 'Payment Processing',
          status: 'active',
          startTime: '2024-01-01T10:00:00Z',
          logs: [],
          toolName: 'StripePaymentTool',
        },
        {
          id: 'payment_step',
          name: 'Payment Processing',
          status: 'completed',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T10:03:00Z',
          logs: [],
          toolName: 'StripePaymentTool',
          output: { payment_link: 'https://checkout.stripe.com/pay/123' },
        },
      ];

      const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].status).toBe('completed');
      expect(deduplicated[0].startTime).toBe('2024-01-01T10:00:00Z');
      expect(deduplicated[0].endTime).toBe('2024-01-01T10:03:00Z');
      expect(deduplicated[0].output).toEqual({
        payment_link: 'https://checkout.stripe.com/pay/123',
      });
    });
  });

  describe('Requirement 3.3: WebSocket messages reordered by timestamp', () => {
    it('should reorder steps chronologically by timestamp', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step_3',
          name: 'Third Step',
          status: 'completed',
          startTime: '2024-01-01T10:02:00Z',
          logs: [],
        },
        {
          id: 'step_1',
          name: 'First Step',
          status: 'completed',
          startTime: '2024-01-01T10:00:00Z',
          logs: [],
        },
        {
          id: 'step_2',
          name: 'Second Step',
          status: 'completed',
          startTime: '2024-01-01T10:01:00Z',
          logs: [],
        },
      ];

      const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

      expect(deduplicated).toHaveLength(3);
      expect(deduplicated[0].name).toBe('First Step');
      expect(deduplicated[1].name).toBe('Second Step');
      expect(deduplicated[2].name).toBe('Third Step');

      // Verify chronological order
      const timestamps = deduplicated.map((s) =>
        new Date(s.startTime!).getTime()
      );
      expect(timestamps[0]).toBeLessThan(timestamps[1]);
      expect(timestamps[1]).toBeLessThan(timestamps[2]);
    });

    it('should handle out-of-order WebSocket messages correctly', () => {
      // Simulate WebSocket messages arriving out of order
      const steps: WorkflowStep[] = [
        {
          id: 'email_step',
          name: 'Email Confirmation',
          status: 'completed',
          startTime: '2024-01-01T10:14:00Z', // Step 14 (email)
          logs: [],
          toolName: 'Portia Google Send Email Tool',
        },
        {
          id: 'extraction_step',
          name: 'Order Extraction',
          status: 'completed',
          startTime: '2024-01-01T10:01:00Z', // Step 1 (extraction)
          logs: [],
          toolName: 'OrderExtractionTool',
        },
        {
          id: 'payment_step',
          name: 'Payment Processing',
          status: 'completed',
          startTime: '2024-01-01T10:08:00Z', // Step 8 (payment)
          logs: [],
          toolName: 'StripePaymentTool',
        },
      ];

      const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

      expect(deduplicated).toHaveLength(3);
      expect(deduplicated[0].toolName).toBe('OrderExtractionTool');
      expect(deduplicated[1].toolName).toBe('StripePaymentTool');
      expect(deduplicated[2].toolName).toBe('Portia Google Send Email Tool');
    });
  });

  describe('Integration: All requirements working together', () => {
    it('should handle complex scenario with duplicates, status transitions, and ordering', () => {
      const steps: WorkflowStep[] = [
        // Out of order steps with duplicates and status transitions
        {
          id: 'logistics_final',
          name: 'Logistics Planning',
          status: 'completed',
          startTime: '2024-01-01T10:05:00Z',
          endTime: '2024-01-01T10:07:00Z',
          logs: [],
          toolName: 'LogisticsShippingTool',
          output: { shipping_method: 'express' },
        },
        {
          id: 'extraction_start',
          name: 'Order Extraction',
          status: 'active',
          startTime: '2024-01-01T10:01:00Z',
          logs: [],
          toolName: 'OrderExtractionTool',
        },
        {
          id: 'logistics_start',
          name: 'Logistics Planning',
          status: 'active',
          startTime: '2024-01-01T10:05:00Z',
          logs: [],
          toolName: 'LogisticsShippingTool',
        },
        {
          id: 'payment_complete',
          name: 'Payment Processing',
          status: 'completed',
          startTime: '2024-01-01T10:08:00Z',
          endTime: '2024-01-01T10:10:00Z',
          logs: [],
          toolName: 'StripePaymentTool',
          output: { payment_link: 'https://checkout.stripe.com/pay/123' },
        },
        {
          id: 'extraction_complete',
          name: 'Order Extraction',
          status: 'completed',
          startTime: '2024-01-01T10:01:00Z',
          endTime: '2024-01-01T10:03:00Z',
          logs: [],
          toolName: 'OrderExtractionTool',
          output: { order_data: 'extracted' },
        },
      ];

      const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

      // Should have 3 unique steps
      expect(deduplicated).toHaveLength(3);

      // Should be in chronological order
      expect(deduplicated[0].toolName).toBe('OrderExtractionTool');
      expect(deduplicated[1].toolName).toBe('LogisticsShippingTool');
      expect(deduplicated[2].toolName).toBe('StripePaymentTool');

      // Should have merged status transitions
      expect(deduplicated[0].status).toBe('completed');
      expect(deduplicated[1].status).toBe('completed');
      expect(deduplicated[2].status).toBe('completed');

      // Should have preserved outputs
      expect(deduplicated[0].output).toEqual({ order_data: 'extracted' });
      expect(deduplicated[1].output).toEqual({ shipping_method: 'express' });
      expect(deduplicated[2].output).toEqual({
        payment_link: 'https://checkout.stripe.com/pay/123',
      });
    });
  });
});
