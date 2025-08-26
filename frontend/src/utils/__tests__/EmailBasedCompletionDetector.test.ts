import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailCompletionDetector } from '../EmailBasedCompletionDetector';
import type { WorkflowRun, WorkflowStep } from '../../types';

describe('EmailBasedCompletionDetector', () => {
  let detector: EmailCompletionDetector;

  beforeEach(() => {
    detector = new EmailCompletionDetector();
    // Clear console logs for cleaner test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('findEmailStep', () => {
    it('should find email step by exact toolName match', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Order Processing',
          status: 'completed',
          logs: [],
          toolName: 'OrderTool',
        },
        {
          id: 'step2',
          name: 'Send Email',
          status: 'completed',
          logs: [],
          toolName: 'Portia Google Send Email Tool',
        },
      ];

      const emailStep = detector.findEmailStep(steps);

      expect(emailStep).toBeDefined();
      expect(emailStep?.id).toBe('step2');
      expect(emailStep?.toolName).toBe('Portia Google Send Email Tool');
    });

    it('should find email step by case-insensitive toolName match', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Send Email',
          status: 'completed',
          logs: [],
          toolName: 'portia google send email tool',
        },
      ];

      const emailStep = detector.findEmailStep(steps);

      expect(emailStep).toBeDefined();
      expect(emailStep?.id).toBe('step1');
    });

    it('should find email step by name when toolName is not available', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Portia Google Send Email Tool',
          status: 'completed',
          logs: [],
        },
      ];

      const emailStep = detector.findEmailStep(steps);

      expect(emailStep).toBeDefined();
      expect(emailStep?.id).toBe('step1');
    });

    it('should find email step by id as fallback', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'email_step_1',
          name: 'Processing',
          status: 'completed',
          logs: [],
        },
      ];

      const emailStep = detector.findEmailStep(steps);

      expect(emailStep).toBeDefined();
      expect(emailStep?.id).toBe('email_step_1');
    });

    it('should return null when no email step is found', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Order Processing',
          status: 'completed',
          logs: [],
          toolName: 'OrderTool',
        },
        {
          id: 'step2',
          name: 'Payment Processing',
          status: 'completed',
          logs: [],
          toolName: 'StripeTool',
        },
      ];

      const emailStep = detector.findEmailStep(steps);

      expect(emailStep).toBeNull();
    });
  });

  describe('hasEmailConfirmation', () => {
    it('should detect "Sent email with id" pattern', () => {
      const output = 'Email processing completed. Sent email with id: abc123';

      const hasConfirmation = detector.hasEmailConfirmation(output);

      expect(hasConfirmation).toBe(true);
    });

    it('should detect "Email sent successfully" pattern', () => {
      const output = 'Email sent successfully to buyer@example.com';

      const hasConfirmation = detector.hasEmailConfirmation(output);

      expect(hasConfirmation).toBe(true);
    });

    it('should detect patterns in JSON output', () => {
      const output = {
        status: 'success',
        message: 'Message sent with ID: xyz789',
        email_id: 'xyz789',
      };

      const hasConfirmation = detector.hasEmailConfirmation(output);

      expect(hasConfirmation).toBe(true);
    });

    it('should be case insensitive', () => {
      const output = 'SENT EMAIL WITH ID: ABC123';

      const hasConfirmation = detector.hasEmailConfirmation(output);

      expect(hasConfirmation).toBe(true);
    });

    it('should return false for output without confirmation patterns', () => {
      const output = 'Processing email request...';

      const hasConfirmation = detector.hasEmailConfirmation(output);

      expect(hasConfirmation).toBe(false);
    });

    it('should return false for null or undefined output', () => {
      expect(detector.hasEmailConfirmation(null)).toBe(false);
      expect(detector.hasEmailConfirmation(undefined)).toBe(false);
    });
  });

  describe('isEmailStepCompleted', () => {
    it('should return true when email step is completed', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Send Email',
          status: 'completed',
          logs: [],
          toolName: 'Portia Google Send Email Tool',
        },
      ];

      const isCompleted = detector.isEmailStepCompleted(steps);

      expect(isCompleted).toBe(true);
    });

    it('should return false when email step is not completed', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Send Email',
          status: 'active',
          logs: [],
          toolName: 'Portia Google Send Email Tool',
        },
      ];

      const isCompleted = detector.isEmailStepCompleted(steps);

      expect(isCompleted).toBe(false);
    });

    it('should return false when no email step exists', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Order Processing',
          status: 'completed',
          logs: [],
          toolName: 'OrderTool',
        },
      ];

      const isCompleted = detector.isEmailStepCompleted(steps);

      expect(isCompleted).toBe(false);
    });
  });

  describe('extractEmailStepOutput', () => {
    it('should extract string output from email step', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Send Email',
          status: 'completed',
          logs: [],
          toolName: 'Portia Google Send Email Tool',
          output: 'Sent email with id: abc123',
        },
      ];

      const output = detector.extractEmailStepOutput(steps);

      expect(output).toBe('Sent email with id: abc123');
    });

    it('should extract and stringify object output from email step', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Send Email',
          status: 'completed',
          logs: [],
          toolName: 'Portia Google Send Email Tool',
          output: { status: 'success', email_id: 'abc123' },
        },
      ];

      const output = detector.extractEmailStepOutput(steps);

      expect(output).toBe('{"status":"success","email_id":"abc123"}');
    });

    it('should return null when no email step exists', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Order Processing',
          status: 'completed',
          logs: [],
          toolName: 'OrderTool',
        },
      ];

      const output = detector.extractEmailStepOutput(steps);

      expect(output).toBeNull();
    });

    it('should return null when email step has no output', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Send Email',
          status: 'completed',
          logs: [],
          toolName: 'Portia Google Send Email Tool',
        },
      ];

      const output = detector.extractEmailStepOutput(steps);

      expect(output).toBeNull();
    });
  });

  describe('checkForEmailCompletion', () => {
    it('should return true when email step is completed with confirmation', () => {
      const workflowRun: WorkflowRun = {
        id: 'run1',
        orderId: 'order1',
        status: 'running',
        steps: [
          {
            id: 'step1',
            name: 'Send Email',
            status: 'completed',
            logs: [],
            toolName: 'Portia Google Send Email Tool',
            output: 'Sent email with id: abc123',
          },
        ],
        startTime: '2024-01-01T00:00:00Z',
        totalSteps: 1,
        completedSteps: 1,
        progress: 100,
      };

      const isComplete = detector.checkForEmailCompletion(workflowRun);

      expect(isComplete).toBe(true);
    });

    it('should return false when email step is completed but no confirmation', () => {
      const workflowRun: WorkflowRun = {
        id: 'run1',
        orderId: 'order1',
        status: 'running',
        steps: [
          {
            id: 'step1',
            name: 'Send Email',
            status: 'completed',
            logs: [],
            toolName: 'Portia Google Send Email Tool',
            output: 'Processing email...',
          },
        ],
        startTime: '2024-01-01T00:00:00Z',
        totalSteps: 1,
        completedSteps: 1,
        progress: 100,
      };

      const isComplete = detector.checkForEmailCompletion(workflowRun);

      expect(isComplete).toBe(false);
    });

    it('should return false when email step is not completed', () => {
      const workflowRun: WorkflowRun = {
        id: 'run1',
        orderId: 'order1',
        status: 'running',
        steps: [
          {
            id: 'step1',
            name: 'Send Email',
            status: 'active',
            logs: [],
            toolName: 'Portia Google Send Email Tool',
            output: 'Sent email with id: abc123',
          },
        ],
        startTime: '2024-01-01T00:00:00Z',
        totalSteps: 1,
        completedSteps: 0,
        progress: 50,
      };

      const isComplete = detector.checkForEmailCompletion(workflowRun);

      expect(isComplete).toBe(false);
    });

    it('should return false when no email step exists', () => {
      const workflowRun: WorkflowRun = {
        id: 'run1',
        orderId: 'order1',
        status: 'running',
        steps: [
          {
            id: 'step1',
            name: 'Order Processing',
            status: 'completed',
            logs: [],
            toolName: 'OrderTool',
          },
        ],
        startTime: '2024-01-01T00:00:00Z',
        totalSteps: 1,
        completedSteps: 1,
        progress: 100,
      };

      const isComplete = detector.checkForEmailCompletion(workflowRun);

      expect(isComplete).toBe(false);
    });

    it('should return false for null or undefined workflow run', () => {
      expect(detector.checkForEmailCompletion(null as any)).toBe(false);
      expect(detector.checkForEmailCompletion(undefined as any)).toBe(false);
    });
  });

  describe('shouldBlockPrematureCompletion', () => {
    const workflowRun: WorkflowRun = {
      id: 'run1',
      orderId: 'order1',
      status: 'running',
      steps: [
        {
          id: 'step1',
          name: 'Send Email',
          status: 'completed',
          logs: [],
          toolName: 'Portia Google Send Email Tool',
          output: 'Sent email with id: abc123',
        },
      ],
      startTime: '2024-01-01T00:00:00Z',
      totalSteps: 1,
      completedSteps: 1,
      progress: 100,
    };

    it('should block completion from finance trigger', () => {
      const shouldBlock = detector.shouldBlockPrematureCompletion(
        workflowRun,
        'finance_tool'
      );

      expect(shouldBlock).toBe(true);
    });

    it('should block completion from stripe trigger', () => {
      const shouldBlock = detector.shouldBlockPrematureCompletion(
        workflowRun,
        'stripe_payment'
      );

      expect(shouldBlock).toBe(true);
    });

    it('should block completion from payment trigger', () => {
      const shouldBlock = detector.shouldBlockPrematureCompletion(
        workflowRun,
        'payment_processing'
      );

      expect(shouldBlock).toBe(true);
    });

    it('should not block completion from email trigger', () => {
      const shouldBlock = detector.shouldBlockPrematureCompletion(
        workflowRun,
        'email_tool'
      );

      expect(shouldBlock).toBe(false);
    });

    it('should block completion when email step is not ready', () => {
      const incompleteWorkflow: WorkflowRun = {
        ...workflowRun,
        steps: [
          {
            id: 'step1',
            name: 'Send Email',
            status: 'active',
            logs: [],
            toolName: 'Portia Google Send Email Tool',
          },
        ],
      };

      const shouldBlock =
        detector.shouldBlockPrematureCompletion(incompleteWorkflow);

      expect(shouldBlock).toBe(true);
    });

    it('should not block completion when email step is ready and no premature trigger', () => {
      const shouldBlock = detector.shouldBlockPrematureCompletion(workflowRun);

      expect(shouldBlock).toBe(false);
    });
  });

  describe('getEmailStepInfo', () => {
    it('should return complete info for valid email step', () => {
      const workflowRun: WorkflowRun = {
        id: 'run1',
        orderId: 'order1',
        status: 'running',
        steps: [
          {
            id: 'step1',
            name: 'Send Email',
            status: 'completed',
            logs: [],
            toolName: 'Portia Google Send Email Tool',
            output: 'Sent email with id: abc123',
          },
        ],
        startTime: '2024-01-01T00:00:00Z',
        totalSteps: 1,
        completedSteps: 1,
        progress: 100,
      };

      const info = detector.getEmailStepInfo(workflowRun);

      expect(info.found).toBe(true);
      expect(info.step?.id).toBe('step1');
      expect(info.isCompleted).toBe(true);
      expect(info.hasConfirmation).toBe(true);
      expect(info.output).toBe('Sent email with id: abc123');
    });

    it('should return not found info when no email step exists', () => {
      const workflowRun: WorkflowRun = {
        id: 'run1',
        orderId: 'order1',
        status: 'running',
        steps: [
          {
            id: 'step1',
            name: 'Order Processing',
            status: 'completed',
            logs: [],
            toolName: 'OrderTool',
          },
        ],
        startTime: '2024-01-01T00:00:00Z',
        totalSteps: 1,
        completedSteps: 1,
        progress: 100,
      };

      const info = detector.getEmailStepInfo(workflowRun);

      expect(info.found).toBe(false);
      expect(info.step).toBeUndefined();
      expect(info.isCompleted).toBe(false);
      expect(info.hasConfirmation).toBe(false);
      expect(info.output).toBeUndefined();
    });

    it('should handle null workflow run', () => {
      const info = detector.getEmailStepInfo(null as any);

      expect(info.found).toBe(false);
      expect(info.isCompleted).toBe(false);
      expect(info.hasConfirmation).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle 15-step workflow with email as step 14', () => {
      const steps: WorkflowStep[] = [];

      // Create 13 non-email steps
      for (let i = 1; i <= 13; i++) {
        steps.push({
          id: `step${i}`,
          name: `Step ${i}`,
          status: 'completed',
          logs: [],
          toolName: i === 5 ? 'StripePaymentTool' : `Tool${i}`,
        });
      }

      // Add email step as step 14
      steps.push({
        id: 'step14',
        name: 'Send Email Confirmation',
        status: 'completed',
        logs: [],
        toolName: 'Portia Google Send Email Tool',
        output: 'Email sent successfully with confirmation ID: conf123',
      });

      // Add final step
      steps.push({
        id: 'step15',
        name: 'Finalization',
        status: 'completed',
        logs: [],
        toolName: 'FinalizationTool',
      });

      const workflowRun: WorkflowRun = {
        id: 'run1',
        orderId: 'order1',
        status: 'completed',
        steps,
        startTime: '2024-01-01T00:00:00Z',
        totalSteps: 15,
        completedSteps: 15,
        progress: 100,
      };

      // Should detect completion after email step
      const isComplete = detector.checkForEmailCompletion(workflowRun);
      expect(isComplete).toBe(true);

      // Should not block completion from email
      const shouldBlock = detector.shouldBlockPrematureCompletion(
        workflowRun,
        'email'
      );
      expect(shouldBlock).toBe(false);

      // Should block completion from stripe (step 5)
      const shouldBlockStripe = detector.shouldBlockPrematureCompletion(
        workflowRun,
        'stripe'
      );
      expect(shouldBlockStripe).toBe(true);
    });

    it('should handle workflow with duplicate email steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Send Email',
          status: 'failed',
          logs: [],
          toolName: 'Portia Google Send Email Tool',
          output: 'Failed to send email',
        },
        {
          id: 'step2',
          name: 'Retry Send Email',
          status: 'completed',
          logs: [],
          toolName: 'Portia Google Send Email Tool',
          output: 'Sent email with id: retry123',
        },
      ];

      const workflowRun: WorkflowRun = {
        id: 'run1',
        orderId: 'order1',
        status: 'running',
        steps,
        startTime: '2024-01-01T00:00:00Z',
        totalSteps: 2,
        completedSteps: 1,
        progress: 50,
      };

      // Should find the first email step (even if failed)
      const emailStep = detector.findEmailStep(steps);
      expect(emailStep?.id).toBe('step1');

      // Should detect completion based on any completed email step
      const isComplete = detector.checkForEmailCompletion(workflowRun);
      expect(isComplete).toBe(true); // Because step2 is completed with confirmation
    });
  });
});
