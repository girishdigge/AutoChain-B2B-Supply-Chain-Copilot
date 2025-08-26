/**
 * Test for super aggressive deduplication to fix OrderExtractionTool duplicates
 */

import { stepDeduplicationEngine } from '../utils/StepDeduplicationEngine';
import type { WorkflowStep } from '../types';

describe('Super Aggressive Deduplication', () => {
  beforeEach(() => {
    stepDeduplicationEngine.reset();
  });

  it('should use hardcoded keys for OrderExtractionTool variations', () => {
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
        name: 'order extraction',
        toolName: 'Order Extraction Tool',
        status: 'completed',
        logs: [],
        progress: 100,
      },
      {
        id: 'extraction_4',
        name: 'ORDER EXTRACTION',
        toolName: 'orderextractiontool',
        status: 'completed',
        logs: [],
        progress: 100,
      },
      {
        id: 'extraction_5',
        name: 'Order Extraction',
        toolName: undefined, // No tool name, should match by step name
        status: 'completed',
        logs: [],
        progress: 100,
      },
    ];

    const deduplicated =
      stepDeduplicationEngine.deduplicateSteps(duplicateSteps);

    console.log('🧹 Super aggressive deduplication result:', {
      input: duplicateSteps.length,
      output: deduplicated.length,
      inputSteps: duplicateSteps.map((s) => ({
        id: s.id,
        name: s.name,
        toolName: s.toolName,
        status: s.status,
      })),
      outputSteps: deduplicated.map((s) => ({
        id: s.id,
        name: s.name,
        toolName: s.toolName,
        status: s.status,
      })),
    });

    // Should deduplicate ALL variations to only 1 step using hardcoded key
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].status).toBe('completed');
    expect(deduplicated[0].progress).toBe(100);
  });

  it('should handle real-world scenario with different step IDs', () => {
    // Simulate what might be happening in the actual workflow
    const realWorldSteps: WorkflowStep[] = [
      {
        id: 'OrderExtractionTool_6022ac83_1756157573488_8cde33e8',
        name: 'Order Extraction',
        toolName: 'OrderExtractionTool',
        status: 'active',
        startTime: '2025-08-25T21:32:53.490Z',
        logs: [],
        progress: 0,
      },
      {
        id: 'OrderExtractionTool_6022ac83_1756157573488_8cde33e8',
        name: 'Order Extraction',
        toolName: 'OrderExtractionTool',
        status: 'completed',
        startTime: '2025-08-25T21:32:53.490Z',
        endTime: '2025-08-25T21:32:54.580Z',
        logs: [],
        progress: 100,
      },
      // Potential duplicate from different source
      {
        id: 'extraction',
        name: 'Order Extraction',
        toolName: 'OrderExtractionTool',
        status: 'completed',
        logs: [],
        progress: 100,
      },
    ];

    const deduplicated =
      stepDeduplicationEngine.deduplicateSteps(realWorldSteps);

    console.log('🧹 Real-world deduplication result:', {
      input: realWorldSteps.length,
      output: deduplicated.length,
      inputSteps: realWorldSteps.map((s) => ({
        id: s.id,
        name: s.name,
        toolName: s.toolName,
        status: s.status,
      })),
      outputSteps: deduplicated.map((s) => ({
        id: s.id,
        name: s.name,
        toolName: s.toolName,
        status: s.status,
      })),
    });

    // Should deduplicate to 1 step
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].status).toBe('completed');
  });
});
it('should distinguish between OrderExtractionTool and Order Tool', () => {
  // These are different tools and should NOT be deduplicated
  const differentTools: WorkflowStep[] = [
    {
      id: 'extraction_step',
      name: 'Order Extraction',
      toolName: 'OrderExtractionTool',
      status: 'completed',
      logs: [],
      progress: 100,
    },
    {
      id: 'order_step',
      name: 'Order Finalization',
      toolName: 'Order Tool',
      status: 'completed',
      logs: [],
      progress: 100,
    },
  ];

  const deduplicated = stepDeduplicationEngine.deduplicateSteps(differentTools);

  console.log('🧹 Different tools result:', {
    input: differentTools.length,
    output: deduplicated.length,
    inputSteps: differentTools.map((s) => ({
      id: s.id,
      name: s.name,
      toolName: s.toolName,
    })),
    outputSteps: deduplicated.map((s) => ({
      id: s.id,
      name: s.name,
      toolName: s.toolName,
    })),
  });

  // Should keep both steps as they are different tools
  expect(deduplicated).toHaveLength(2);
  expect(
    deduplicated.find((s) => s.toolName === 'OrderExtractionTool')
  ).toBeDefined();
  expect(deduplicated.find((s) => s.toolName === 'Order Tool')).toBeDefined();
});
