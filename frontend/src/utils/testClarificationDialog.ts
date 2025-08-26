import type { ClarificationRequest } from '../types';

/**
 * Test function to simulate a clarification request
 * Can be called from browser console for debugging
 */
export function testClarificationDialog(): void {
  const testData: ClarificationRequest = {
    clarification_id: 'test-clarification-' + Date.now(),
    question: 'Test clarification: Do you want to proceed with the order?',
    options: ['Yes, proceed', 'No, cancel', 'Modify order'],
    timeout_seconds: 300,
    required: true,
    timestamp: new Date().toISOString(),
    context: { step: 'confirmation', order_id: 'ORD-TEST-001' },
  };

  console.log('🧪 Test clarification request created:', testData);

  // Try to show clarification using global manager
  if ((window as any).clarificationManager) {
    console.log('🧪 Showing test clarification dialog');
    (window as any).clarificationManager.showClarification(testData);
  } else {
    console.error('🧪 Global clarification manager not found!');
    console.log('🧪 Available window properties:', Object.keys(window));
  }
}

/**
 * Test function to simulate a clarification event via WebSocket handler
 */
export function testClarificationEvent(): void {
  const testData: ClarificationRequest = {
    clarification_id: 'websocket-test-' + Date.now(),
    question: 'WebSocket test: Which supplier would you prefer?',
    options: [
      'Supplier A (faster)',
      'Supplier B (cheaper)',
      'Supplier C (premium)',
    ],
    timeout_seconds: 180,
    required: true,
    timestamp: new Date().toISOString(),
    context: { step: 'supplier', order_id: 'ORD-WS-TEST-001' },
  };

  console.log('🧪 Test clarification event created:', testData);

  // Dispatch custom event to trigger WebSocket handler
  const event = new CustomEvent('test-clarification', { detail: testData });
  window.dispatchEvent(event);
}

// Make functions globally available for console testing
(window as any).testClarificationDialog = testClarificationDialog;
(window as any).testClarificationEvent = testClarificationEvent;

console.log('🧪 Clarification test functions loaded:');
console.log('  - testClarificationDialog() - Test direct manager call');
console.log('  - testClarificationEvent() - Test WebSocket event handler');
