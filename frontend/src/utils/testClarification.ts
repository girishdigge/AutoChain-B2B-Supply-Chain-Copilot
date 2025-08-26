import type { ClarificationRequest } from '../types';

/**
 * Test function to simulate a clarification request
 * Can be called from browser console for debugging
 */
export function testClarificationRequest(): ClarificationRequest {
  const testData: ClarificationRequest = {
    clarification_id: 'test-clarification-' + Date.now(),
    question: 'Test clarification: Do you want to proceed with the order?',
    options: ['Yes, proceed', 'No, cancel', 'Modify order'],
    timeout_seconds: 300,
    required: true,
  };

  console.log('🧪 Test clarification request created:', testData);

  // Dispatch a custom event that can be picked up by the WebSocket handlers
  window.dispatchEvent(
    new CustomEvent('test-clarification', {
      detail: testData,
    })
  );

  return testData;
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testClarificationRequest = testClarificationRequest;
}
