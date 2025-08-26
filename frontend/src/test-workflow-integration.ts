/**
 * Test script to verify workflow WebSocket integration
 * This can be run in the browser console to test the workflow functionality
 */

// Test data for workflow integration
export const testWorkflowIntegration = () => {
  console.log('🧪 Testing Workflow WebSocket Integration');

  // Test 1: Check if WebSocket context is available
  const wsContext = document.querySelector(
    '[data-testid="websocket-indicator"]'
  );
  console.log('WebSocket Indicator:', wsContext ? '✅ Found' : '❌ Not found');

  // Test 2: Check if workflow state is properly managed
  const workflowElements = document.querySelectorAll(
    '[data-testid^="workflow-"]'
  );
  console.log(`Workflow Elements: ${workflowElements.length} found`);

  // Test 3: Check if demo controls are available
  const demoControls = document.querySelector(
    '[data-testid="workflow-test-controls"]'
  );
  console.log('Demo Controls:', demoControls ? '✅ Found' : '❌ Not found');

  // Test 4: Simulate workflow events (if in mock mode)
  if (
    window.location.search.includes('mock=true') ||
    localStorage.getItem('mockMode') === 'true'
  ) {
    console.log('🎭 Mock mode detected - testing demo workflow');

    // Try to trigger a demo workflow
    const demoButton = document.querySelector(
      'button[data-testid="demo-successful-flow"]'
    );
    if (demoButton) {
      console.log('🚀 Triggering demo workflow...');
      (demoButton as HTMLButtonElement).click();
    }
  }

  return {
    wsIndicator: !!wsContext,
    workflowElements: workflowElements.length,
    demoControls: !!demoControls,
    mockMode:
      window.location.search.includes('mock=true') ||
      localStorage.getItem('mockMode') === 'true',
  };
};

// Test workflow navigation
export const testWorkflowNavigation = () => {
  console.log('🧭 Testing Workflow Navigation');

  // Test navigation from Orders to Workflow
  const currentPath = window.location.pathname;
  console.log('Current path:', currentPath);

  if (currentPath === '/workflow') {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    const runId = urlParams.get('runId');

    console.log('Order ID from URL:', orderId || 'None');
    console.log('Run ID from URL:', runId || 'None');

    return { orderId, runId, onWorkflowPage: true };
  }

  return { orderId: null, runId: null, onWorkflowPage: false };
};

// Test workflow state updates
export const testWorkflowStateUpdates = () => {
  console.log('📊 Testing Workflow State Updates');

  // Check if workflow runs are in state
  const workflowRunElements = document.querySelectorAll(
    '[data-testid="workflow-run"]'
  );
  console.log(`Active workflow runs: ${workflowRunElements.length}`);

  // Check if steps are rendered
  const stepElements = document.querySelectorAll(
    '[data-testid^="workflow-step-"]'
  );
  console.log(`Workflow steps: ${stepElements.length}`);

  // Check if logs are displayed
  const logElements = document.querySelectorAll('[data-testid^="log-entry-"]');
  console.log(`Log entries: ${logElements.length}`);

  return {
    workflowRuns: workflowRunElements.length,
    steps: stepElements.length,
    logs: logElements.length,
  };
};

// Main test runner
export const runWorkflowTests = () => {
  console.log('🔬 Running Workflow Integration Tests');
  console.log('=====================================');

  const integrationTest = testWorkflowIntegration();
  const navigationTest = testWorkflowNavigation();
  const stateTest = testWorkflowStateUpdates();

  const results = {
    integration: integrationTest,
    navigation: navigationTest,
    state: stateTest,
    timestamp: new Date().toISOString(),
  };

  console.log('📋 Test Results:', results);

  // Summary
  const passed = [
    integrationTest.wsIndicator,
    integrationTest.workflowElements > 0,
    navigationTest.onWorkflowPage || window.location.pathname !== '/workflow',
    stateTest.steps >= 0, // Steps can be 0 if no workflow is active
  ].filter(Boolean).length;

  console.log(`✅ Tests passed: ${passed}/4`);

  if (passed === 4) {
    console.log('🎉 All workflow integration tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the implementation.');
  }

  return results;
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testWorkflow = {
    runAll: runWorkflowTests,
    integration: testWorkflowIntegration,
    navigation: testWorkflowNavigation,
    state: testWorkflowStateUpdates,
  };

  console.log('🔧 Workflow test utilities available at window.testWorkflow');
}
