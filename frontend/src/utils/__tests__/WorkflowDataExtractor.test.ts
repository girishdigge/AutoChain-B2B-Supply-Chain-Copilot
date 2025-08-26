import { describe, it, expect, beforeEach } from 'vitest';
import {
  ComprehensiveDataExtractor,
  type OrderCompletionData,
} from '../WorkflowDataExtractor';
import type { WorkflowRun, WorkflowStep } from '../../types';

describe('WorkflowDataExtractor', () => {
  let extractor: ComprehensiveDataExtractor;

  beforeEach(() => {
    extractor = new ComprehensiveDataExtractor();
  });

  // Helper function to create mock workflow steps
  const createMockStep = (
    id: string,
    name: string,
    toolName: string,
    output: any,
    status: 'completed' | 'pending' | 'active' | 'failed' = 'completed'
  ): WorkflowStep => ({
    id,
    name,
    toolName,
    status,
    output,
    logs: [],
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
  });

  // Helper function to create mock workflow run
  const createMockWorkflowRun = (
    steps: WorkflowStep[],
    orderId = 'test-order-123'
  ): WorkflowRun => ({
    id: 'test-run-123',
    orderId,
    status: 'completed',
    steps,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    totalSteps: steps.length,
    completedSteps: steps.length,
    progress: 100,
  });

  describe('extractPaymentLink', () => {
    it('should extract payment link from StripePaymentTool output', () => {
      const steps = [
        createMockStep('stripe-1', 'Process Payment', 'StripePaymentTool', {
          payment_url:
            'https://checkout.stripe.com/pay/cs_test_1234567890abcdef',
          status: 'success',
        }),
      ];

      const result = extractor.extractPaymentLink(steps);
      expect(result).toBe(
        'https://checkout.stripe.com/pay/cs_test_1234567890abcdef'
      );
    });

    it('should extract payment link from raw step content', () => {
      const steps = [
        createMockStep(
          'payment-1',
          'Create Payment',
          'payment',
          'Payment link created: https://checkout.stripe.com/c/pay/cs_live_abcdef123456'
        ),
      ];

      const result = extractor.extractPaymentLink(steps);
      expect(result).toBe(
        'https://checkout.stripe.com/c/pay/cs_live_abcdef123456'
      );
    });

    it('should extract payment link from JSON string output', () => {
      const steps = [
        createMockStep(
          'stripe-2',
          'Stripe Checkout',
          'stripe_payment',
          '{"checkout_url": "https://checkout.stripe.com/pay/cs_test_xyz789", "session_id": "cs_test_xyz789"}'
        ),
      ];

      const result = extractor.extractPaymentLink(steps);
      expect(result).toBe('https://checkout.stripe.com/pay/cs_test_xyz789');
    });

    it('should return null when no payment link is found', () => {
      const steps = [
        createMockStep('other-1', 'Other Step', 'other_tool', {
          message: 'No payment link here',
        }),
      ];

      const result = extractor.extractPaymentLink(steps);
      expect(result).toBeNull();
    });

    it('should prioritize Stripe tool outputs over other steps', () => {
      const steps = [
        createMockStep(
          'other-1',
          'Other Step',
          'other_tool',
          'Payment link: https://checkout.stripe.com/pay/cs_fallback_123'
        ),
        createMockStep('stripe-1', 'Stripe Payment', 'StripePaymentTool', {
          payment_url: 'https://checkout.stripe.com/pay/cs_primary_456',
        }),
      ];

      const result = extractor.extractPaymentLink(steps);
      expect(result).toBe('https://checkout.stripe.com/pay/cs_primary_456');
    });
  });

  describe('extractBlockchainHash', () => {
    it('should extract blockchain hash from Blockchain Anchor Tool output', () => {
      const steps = [
        createMockStep(
          'blockchain-1',
          'Anchor to Blockchain',
          'Blockchain Anchor Tool',
          {
            tx_hash:
              '0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83',
            status: 'confirmed',
          }
        ),
      ];

      const result = extractor.extractBlockchainHash(steps);
      expect(result).toBe(
        '0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83'
      );
    });

    it('should extract blockchain hash from raw step content', () => {
      const steps = [
        createMockStep(
          'blockchain-2',
          'Blockchain Transaction',
          'blockchain',
          'Transaction hash: 26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83'
        ),
      ];

      const result = extractor.extractBlockchainHash(steps);
      expect(result).toBe(
        '0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83'
      );
    });

    it('should handle hash with 0x prefix', () => {
      const steps = [
        createMockStep('blockchain-3', 'Chain Anchor', 'anchor', {
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        }),
      ];

      const result = extractor.extractBlockchainHash(steps);
      expect(result).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );
    });

    it('should return null when no valid blockchain hash is found', () => {
      const steps = [
        createMockStep('other-1', 'Other Step', 'other_tool', {
          message: 'No blockchain hash here',
        }),
      ];

      const result = extractor.extractBlockchainHash(steps);
      expect(result).toBeNull();
    });

    it('should validate hash length (64 hex characters)', () => {
      const steps = [
        createMockStep(
          'blockchain-4',
          'Invalid Hash',
          'blockchain',
          { tx_hash: '0x123' } // Too short
        ),
      ];

      const result = extractor.extractBlockchainHash(steps);
      expect(result).toBeNull();
    });
  });

  describe('extractBuyerEmail', () => {
    it('should extract buyer email from ClarificationTool responses', () => {
      const steps = [
        createMockStep(
          'clarification-1',
          'Get Buyer Info',
          'ClarificationTool',
          {
            buyer_email: 'john.doe@example.com',
            response: 'Email confirmed',
          }
        ),
      ];

      const result = extractor.extractBuyerEmail(steps);
      expect(result).toBe('john.doe@example.com');
    });

    it('should extract email from raw text content', () => {
      const steps = [
        createMockStep(
          'clarification-2',
          'Buyer Clarification',
          'clarification',
          'Buyer email: jane.smith@company.com confirmed for order'
        ),
      ];

      const result = extractor.extractBuyerEmail(steps);
      expect(result).toBe('jane.smith@company.com');
    });

    it('should extract email from JSON string', () => {
      const steps = [
        createMockStep(
          'question-1',
          'Ask Question',
          'ask',
          '{"email": "buyer@test.org", "question": "Delivery address?"}'
        ),
      ];

      const result = extractor.extractBuyerEmail(steps);
      expect(result).toBe('buyer@test.org');
    });

    it('should return fallback email when no email is found', () => {
      const steps = [
        createMockStep('other-1', 'Other Step', 'other_tool', {
          message: 'No email here',
        }),
      ];

      const result = extractor.extractBuyerEmail(steps);
      expect(result).toBe('buyer@example.com');
    });

    it('should validate email format', () => {
      const steps = [
        createMockStep(
          'clarification-3',
          'Invalid Email',
          'clarification',
          'Email: invalid-email-format'
        ),
      ];

      const result = extractor.extractBuyerEmail(steps);
      expect(result).toBe('buyer@example.com'); // Should fallback due to invalid format
    });
  });

  describe('extractOrderDetails', () => {
    it('should extract order details from merge fields tool output', () => {
      const steps = [
        createMockStep('merge-1', 'Merge Order Fields', 'merge fields tool', {
          model: 'Tesla Model S',
          quantity: 2,
          delivery_location: 'New York, NY',
          total_amount: '$150,000.00',
        }),
      ];

      const result = extractor.extractOrderDetails(steps);
      expect(result).toEqual({
        model: 'Tesla Model S',
        quantity: 2,
        deliveryLocation: 'New York, NY',
        totalAmount: '$150,000.00',
      });
    });

    it('should extract order details from raw text content', () => {
      const steps = [
        createMockStep(
          'order-1',
          'Process Order',
          'order_tool',
          'Model: BMW X5, Quantity: 1, Location: Los Angeles, CA, Total: $75,000'
        ),
      ];

      const result = extractor.extractOrderDetails(steps);
      expect(result).toEqual({
        model: 'BMW X5',
        quantity: 1,
        deliveryLocation: 'Los Angeles, CA',
        totalAmount: '$75,000',
      });
    });

    it('should handle partial data extraction', () => {
      const steps = [
        createMockStep('partial-1', 'Partial Data', 'order', {
          model: 'Ford F-150',
          quantity: 3,
        }),
      ];

      const result = extractor.extractOrderDetails(steps);
      expect(result).toEqual({
        model: 'Ford F-150',
        quantity: 3,
        deliveryLocation: 'Unknown Location',
        totalAmount: '$0.00',
      });
    });

    it('should return defaults when no order details are found', () => {
      const steps = [
        createMockStep('other-1', 'Other Step', 'other_tool', {
          message: 'No order details here',
        }),
      ];

      const result = extractor.extractOrderDetails(steps);
      expect(result).toEqual({
        model: 'Unknown Model',
        quantity: 1,
        deliveryLocation: 'Unknown Location',
        totalAmount: '$0.00',
      });
    });

    it('should combine data from multiple steps', () => {
      const steps = [
        createMockStep('step-1', 'Model Info', 'order', { model: 'Audi A4' }),
        createMockStep('step-2', 'Quantity Info', 'merge', { quantity: 5 }),
        createMockStep('step-3', 'Location Info', 'order_tool', {
          delivery_location: 'Chicago, IL',
        }),
        createMockStep('step-4', 'Price Info', 'merge_fields', {
          total_amount: '$200,000.00',
        }),
      ];

      const result = extractor.extractOrderDetails(steps);
      expect(result).toEqual({
        model: 'Audi A4',
        quantity: 5,
        deliveryLocation: 'Chicago, IL',
        totalAmount: '$200,000.00',
      });
    });
  });

  describe('extractCompletionData', () => {
    it('should extract comprehensive completion data from workflow run', () => {
      const steps = [
        createMockStep(
          'clarification-1',
          'Get Buyer Info',
          'ClarificationTool',
          { buyer_email: 'customer@example.com' }
        ),
        createMockStep('stripe-1', 'Create Payment', 'StripePaymentTool', {
          payment_url: 'https://checkout.stripe.com/pay/cs_test_123',
        }),
        createMockStep(
          'blockchain-1',
          'Anchor Transaction',
          'Blockchain Anchor Tool',
          {
            tx_hash:
              '0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83',
          }
        ),
        createMockStep('merge-1', 'Order Details', 'merge fields tool', {
          model: 'Mercedes C-Class',
          quantity: 1,
          delivery_location: 'Miami, FL',
          total_amount: '$45,000.00',
        }),
      ];

      const workflowRun = createMockWorkflowRun(steps, 'order-456');
      const result = extractor.extractCompletionData(workflowRun);

      expect(result).toEqual({
        orderId: 'order-456',
        model: 'Mercedes C-Class',
        quantity: 1,
        deliveryLocation: 'Miami, FL',
        totalAmount: '$45,000.00',
        paymentLink: 'https://checkout.stripe.com/pay/cs_test_123',
        blockchainTxHash:
          '0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83',
        buyerEmail: 'customer@example.com',
      });
    });

    it('should handle missing data gracefully', () => {
      const steps = [
        createMockStep('basic-1', 'Basic Step', 'basic_tool', {
          message: 'Basic processing complete',
        }),
      ];

      const workflowRun = createMockWorkflowRun(steps);
      const result = extractor.extractCompletionData(workflowRun);

      expect(result).toEqual({
        orderId: 'test-order-123',
        model: 'Unknown Model',
        quantity: 1,
        deliveryLocation: 'Unknown Location',
        totalAmount: '$0.00',
        paymentLink: null,
        blockchainTxHash: null,
        buyerEmail: 'buyer@example.com',
      });
    });

    it('should use workflow run ID as orderId fallback', () => {
      const steps = [
        createMockStep('step-1', 'Test Step', 'test_tool', { data: 'test' }),
      ];

      const workflowRun: WorkflowRun = {
        id: 'run-789',
        orderId: '', // Empty orderId
        status: 'completed',
        steps,
        startTime: new Date().toISOString(),
        totalSteps: 1,
        completedSteps: 1,
        progress: 100,
      };

      const result = extractor.extractCompletionData(workflowRun);
      expect(result.orderId).toBe('run-789');
    });
  });

  describe('fallback data extraction patterns', () => {
    it('should extract payment link from unstructured text', () => {
      const steps = [
        createMockStep(
          'text-1',
          'Text Output',
          'unknown_tool',
          'The payment can be completed at https://checkout.stripe.com/pay/cs_live_fallback123 within 24 hours.'
        ),
      ];

      const result = extractor.extractPaymentLink(steps);
      expect(result).toBe(
        'https://checkout.stripe.com/pay/cs_live_fallback123'
      );
    });

    it('should extract blockchain hash from mixed content', () => {
      const steps = [
        createMockStep(
          'mixed-1',
          'Mixed Content',
          'unknown_tool',
          'Transaction completed with hash: abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890 on the blockchain.'
        ),
      ];

      const result = extractor.extractBlockchainHash(steps);
      expect(result).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );
    });

    it('should extract email from various text formats', () => {
      const steps = [
        createMockStep(
          'email-1',
          'Email Mention',
          'unknown_tool',
          'Please contact the buyer at: support@company.co.uk for any questions.'
        ),
      ];

      const result = extractor.extractBuyerEmail(steps);
      expect(result).toBe('support@company.co.uk');
    });

    it('should extract order details from unstructured text', () => {
      const steps = [
        createMockStep(
          'text-order-1',
          'Order Summary',
          'summary_tool',
          'Order summary: Product: iPhone 14 Pro, Quantity: 2 units, Delivery Location: Seattle, WA, Total Cost: $2,400.00'
        ),
      ];

      const result = extractor.extractOrderDetails(steps);
      expect(result).toEqual({
        model: 'iPhone 14 Pro',
        quantity: 2,
        deliveryLocation: 'Seattle, WA',
        totalAmount: '$2,400.00',
      });
    });
  });
});
