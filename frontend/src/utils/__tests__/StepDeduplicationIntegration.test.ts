import { describe, it, expect, beforeEach } from 'vitest';
import { stepDeduplicationEngine } from '../StepDeduplicationEngine';
import type { WorkflowStep } from '../../types';

describe('StepDeduplicationEngine Integration', () => {
  beforeEach(() => {
    stepDeduplicationEngine.reset();
  });

  it('should deduplicate steps with same tool name and merge status transitions', () => {
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
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:05:00Z',
        logs: [],
        toolName: 'LogisticsShippingTool',
        output: { result: 'shipping calculated' },
      },
    ];

    const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].status).toBe('completed');
    expect(deduplicated[0].output).toEqual({ result: 'shipping calculated' });
    expect(deduplicated[0].endTime).toBe('2024-01-01T10:05:00Z');
  });

  it('should maintain chronological order of steps', () => {
    const steps: WorkflowStep[] = [
      {
        id: 'step3',
        name: 'Third Step',
        status: 'completed',
        startTime: '2024-01-01T10:02:00Z',
        logs: [],
      },
      {
        id: 'step1',
        name: 'First Step',
        status: 'completed',
        startTime: '2024-01-01T10:00:00Z',
        logs: [],
      },
      {
        id: 'step2',
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
  });

  it('should handle duplicate ClarificationTool steps correctly', () => {
    const steps: WorkflowStep[] = [
      {
        id: 'clarification_1',
        name: 'User Confirmation',
        status: 'active',
        startTime: '2024-01-01T10:00:00Z',
        logs: [],
        toolName: 'ClarificationTool',
      },
      {
        id: 'clarification_2',
        name: 'User Confirmation',
        status: 'completed',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:03:00Z',
        logs: [],
        toolName: 'ClarificationTool',
        output: { response: 'confirmed' },
      },
    ];

    const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].status).toBe('completed');
    expect(deduplicated[0].output).toEqual({ response: 'confirmed' });
  });

  it('should provide accurate step statistics', () => {
    const steps: WorkflowStep[] = [
      { id: '1', name: 'Step 1', status: 'completed', logs: [] },
      { id: '2', name: 'Step 2', status: 'active', logs: [] },
      { id: '3', name: 'Step 3', status: 'pending', logs: [] },
      { id: '4', name: 'Step 4', status: 'failed', logs: [] },
    ];

    const stats = stepDeduplicationEngine.getStepStatistics(steps);

    expect(stats).toEqual({
      total: 4,
      pending: 1,
      active: 1,
      completed: 1,
      failed: 1,
      waiting: 0,
      skipped: 0,
    });
  });

  it('should handle backend-generated step IDs correctly', () => {
    const steps: WorkflowStep[] = [
      {
        id: 'step_12345678-1234-1234-1234-123456789abc',
        name: 'Backend Step',
        status: 'active',
        startTime: '2024-01-01T10:00:00Z',
        logs: [],
      },
      {
        id: 'step_12345678-1234-1234-1234-123456789abc',
        name: 'Backend Step',
        status: 'completed',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:05:00Z',
        logs: [],
      },
    ];

    const deduplicated = stepDeduplicationEngine.deduplicateSteps(steps);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].status).toBe('completed');
  });
});
