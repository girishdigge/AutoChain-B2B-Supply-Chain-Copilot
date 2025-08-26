import { describe, it, expect, beforeEach } from 'vitest';
import { StepDeduplicator } from '../StepDeduplicationEngine';
import type { WorkflowStep } from '../../types';

describe('StepDeduplicationEngine', () => {
  let engine: StepDeduplicator;

  beforeEach(() => {
    engine = new StepDeduplicator();
  });

  describe('deduplicateSteps', () => {
    it('should remove duplicate steps with same backend step_id', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'backend-uuid-12345678-1234-1234-1234-123456789abc',
          name: 'Order Extraction',
          status: 'active',
          startTime: '2024-01-01T10:00:00Z',
          logs: [],
        },
        {
          id: 'backend-uuid-12345678-1234-1234-1234-123456789abc',
          name: 'Order Extraction',
          status: 'completed',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T10:01:00Z',
          logs: [],
        },
      ];

      const result = engine.deduplicateSteps(steps);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
      expect(result[0].endTime).toBe('2024-01-01T10:01:00Z');
    });

    it('should remove duplicate steps with same tool name and execution time', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Logistics Planning',
          status: 'active',
          startTime: '2024-01-01T10:00:30Z',
          toolName: 'LogisticsShippingTool',
          logs: [],
        },
        {
          id: 'step2',
          name: 'Logistics Planning',
          status: 'completed',
          startTime: '2024-01-01T10:00:45Z', // Within same minute
          endTime: '2024-01-01T10:01:00Z',
          toolName: 'LogisticsShippingTool',
          logs: [],
        },
      ];

      const result = engine.deduplicateSteps(steps);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
      expect(result[0].toolName).toBe('LogisticsShippingTool');
    });

    it('should keep steps with different tool names', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Order Extraction',
          status: 'completed',
          startTime: '2024-01-01T10:00:00Z',
          toolName: 'OrderExtractionTool',
          logs: [],
        },
        {
          id: 'step2',
          name: 'Order Validation',
          status: 'completed',
          startTime: '2024-01-01T10:01:00Z',
          toolName: 'ValidatorTool',
          logs: [],
        },
      ];

      const result = engine.deduplicateSteps(steps);

      expect(result).toHaveLength(2);
      expect(result[0].toolName).toBe('OrderExtractionTool');
      expect(result[1].toolName).toBe('ValidatorTool');
    });

    it('should maintain chronological order based on timestamps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step3',
          name: 'Step 3',
          status: 'completed',
          startTime: '2024-01-01T10:02:00Z',
          logs: [],
        },
        {
          id: 'step1',
          name: 'Step 1',
          status: 'completed',
          startTime: '2024-01-01T10:00:00Z',
          logs: [],
        },
        {
          id: 'step2',
          name: 'Step 2',
          status: 'completed',
          startTime: '2024-01-01T10:01:00Z',
          logs: [],
        },
      ];

      const result = engine.deduplicateSteps(steps);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Step 1');
      expect(result[1].name).toBe('Step 2');
      expect(result[2].name).toBe('Step 3');
    });

    it('should handle steps without timestamps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Step 1',
          status: 'pending',
          logs: [],
        },
        {
          id: 'step2',
          name: 'Step 2',
          status: 'pending',
          logs: [],
        },
      ];

      const result = engine.deduplicateSteps(steps);

      expect(result).toHaveLength(2);
      // Should not throw errors and maintain order
    });
  });

  describe('isStepDuplicate', () => {
    it('should identify duplicate by backend step_id', () => {
      const step: WorkflowStep = {
        id: 'backend-uuid-12345678-1234-1234-1234-123456789abc',
        name: 'Test Step',
        status: 'active',
        logs: [],
      };

      const existingSteps: WorkflowStep[] = [
        {
          id: 'backend-uuid-12345678-1234-1234-1234-123456789abc',
          name: 'Test Step',
          status: 'completed',
          logs: [],
        },
      ];

      expect(engine.isStepDuplicate(step, existingSteps)).toBe(true);
    });

    it('should identify duplicate by tool name and execution time', () => {
      const step: WorkflowStep = {
        id: 'step1',
        name: 'Clarification',
        status: 'active',
        startTime: '2024-01-01T10:00:30Z',
        toolName: 'ClarificationTool',
        logs: [],
      };

      const existingSteps: WorkflowStep[] = [
        {
          id: 'step2',
          name: 'Clarification',
          status: 'completed',
          startTime: '2024-01-01T10:00:45Z', // Same minute
          toolName: 'ClarificationTool',
          logs: [],
        },
      ];

      expect(engine.isStepDuplicate(step, existingSteps)).toBe(true);
    });

    it('should not identify as duplicate when tool names differ', () => {
      const step: WorkflowStep = {
        id: 'step1',
        name: 'Processing',
        status: 'active',
        startTime: '2024-01-01T10:00:00Z',
        toolName: 'ToolA',
        logs: [],
      };

      const existingSteps: WorkflowStep[] = [
        {
          id: 'step2',
          name: 'Processing',
          status: 'completed',
          startTime: '2024-01-01T10:00:00Z',
          toolName: 'ToolB',
          logs: [],
        },
      ];

      expect(engine.isStepDuplicate(step, existingSteps)).toBe(false);
    });
  });

  describe('mergeStepUpdates', () => {
    it('should merge started → completed status transition', () => {
      const existingStep: WorkflowStep = {
        id: 'step1',
        name: 'Order Processing',
        status: 'active',
        startTime: '2024-01-01T10:00:00Z',
        progress: 50,
        logs: [
          {
            timestamp: '2024-01-01T10:00:00Z',
            level: 'info',
            message: 'Started',
          },
        ],
      };

      const newStep: WorkflowStep = {
        id: 'step1',
        name: 'Order Processing',
        status: 'completed',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:01:00Z',
        progress: 100,
        output: 'Processing complete',
        logs: [
          {
            timestamp: '2024-01-01T10:01:00Z',
            level: 'info',
            message: 'Completed',
          },
        ],
      };

      const result = engine.mergeStepUpdates(existingStep, newStep);

      expect(result.status).toBe('completed');
      expect(result.startTime).toBe('2024-01-01T10:00:00Z');
      expect(result.endTime).toBe('2024-01-01T10:01:00Z');
      expect(result.progress).toBe(100);
      expect(result.output).toBe('Processing complete');
      expect(result.logs).toHaveLength(2);
    });

    it('should not regress from completed to active status', () => {
      const existingStep: WorkflowStep = {
        id: 'step1',
        name: 'Order Processing',
        status: 'completed',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:01:00Z',
        progress: 100,
        logs: [],
      };

      const newStep: WorkflowStep = {
        id: 'step1',
        name: 'Order Processing',
        status: 'active',
        startTime: '2024-01-01T10:00:00Z',
        progress: 50,
        logs: [],
      };

      const result = engine.mergeStepUpdates(existingStep, newStep);

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.endTime).toBe('2024-01-01T10:01:00Z');
    });

    it('should merge logs from both steps', () => {
      const existingStep: WorkflowStep = {
        id: 'step1',
        name: 'Test Step',
        status: 'active',
        logs: [
          {
            timestamp: '2024-01-01T10:00:00Z',
            level: 'info',
            message: 'Log 1',
          },
          {
            timestamp: '2024-01-01T10:00:30Z',
            level: 'info',
            message: 'Log 2',
          },
        ],
      };

      const newStep: WorkflowStep = {
        id: 'step1',
        name: 'Test Step',
        status: 'completed',
        logs: [
          {
            timestamp: '2024-01-01T10:01:00Z',
            level: 'info',
            message: 'Log 3',
          },
        ],
      };

      const result = engine.mergeStepUpdates(existingStep, newStep);

      expect(result.logs).toHaveLength(3);
      expect(result.logs[0].message).toBe('Log 1');
      expect(result.logs[1].message).toBe('Log 2');
      expect(result.logs[2].message).toBe('Log 3');
    });

    it('should preserve non-empty output and error values', () => {
      const existingStep: WorkflowStep = {
        id: 'step1',
        name: 'Test Step',
        status: 'active',
        output: 'Initial output',
        logs: [],
      };

      const newStep: WorkflowStep = {
        id: 'step1',
        name: 'Test Step',
        status: 'failed',
        error: 'Processing failed',
        logs: [],
      };

      const result = engine.mergeStepUpdates(existingStep, newStep);

      expect(result.status).toBe('failed');
      expect(result.output).toBe('Initial output');
      expect(result.error).toBe('Processing failed');
    });

    it('should use higher progress value', () => {
      const existingStep: WorkflowStep = {
        id: 'step1',
        name: 'Test Step',
        status: 'active',
        progress: 75,
        logs: [],
      };

      const newStep: WorkflowStep = {
        id: 'step1',
        name: 'Test Step',
        status: 'active',
        progress: 50,
        logs: [],
      };

      const result = engine.mergeStepUpdates(existingStep, newStep);

      expect(result.progress).toBe(75);
    });
  });

  describe('edge cases', () => {
    it('should handle empty steps array', () => {
      const result = engine.deduplicateSteps([]);
      expect(result).toHaveLength(0);
    });

    it('should handle steps with missing required fields', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Test Step',
          status: 'pending',
          logs: [],
        } as WorkflowStep,
      ];

      const result = engine.deduplicateSteps(steps);
      expect(result).toHaveLength(1);
    });

    it('should handle duplicate LogisticsShippingTool steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'logistics1',
          name: 'Logistics Planning',
          status: 'active',
          startTime: '2024-01-01T10:00:00Z',
          toolName: 'LogisticsShippingTool',
          logs: [],
        },
        {
          id: 'logistics2',
          name: 'Logistics Planning',
          status: 'completed',
          startTime: '2024-01-01T10:00:30Z', // Same minute
          endTime: '2024-01-01T10:01:00Z',
          toolName: 'LogisticsShippingTool',
          logs: [],
        },
      ];

      const result = engine.deduplicateSteps(steps);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
      expect(result[0].toolName).toBe('LogisticsShippingTool');
    });

    it('should handle duplicate ClarificationTool with cached results', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'clarification1',
          name: 'User Confirmation',
          status: 'active',
          startTime: '2024-01-01T10:00:00Z',
          toolName: 'ClarificationTool',
          logs: [],
        },
        {
          id: 'clarification2',
          name: 'User Confirmation',
          status: 'completed',
          startTime: '2024-01-01T10:00:15Z', // Same minute
          endTime: '2024-01-01T10:00:30Z',
          toolName: 'ClarificationTool',
          output: 'Cached result',
          logs: [],
        },
      ];

      const result = engine.deduplicateSteps(steps);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
      expect(result[0].output).toBe('Cached result');
    });
  });

  describe('reset functionality', () => {
    it('should reset internal state', () => {
      // Process some steps to populate internal state
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Test Step',
          status: 'completed',
          logs: [],
        },
      ];

      engine.deduplicateSteps(steps);
      engine.reset();

      // After reset, should work normally
      const result = engine.deduplicateSteps(steps);
      expect(result).toHaveLength(1);
    });
  });
});
