// Debug script to test completion card visibility
// Run this in the browser console on the workflow page

console.log('🧪 Starting completion card debug test...');

// Check if debug functions are available
if (typeof window.forceShowCompletionCard === 'function') {
  console.log('✅ forceShowCompletionCard function is available');

  // Test the function
  console.log('🚀 Calling forceShowCompletionCard...');
  window.forceShowCompletionCard();

  // Check if the card appeared
  setTimeout(() => {
    const completionCard = document.querySelector(
      '[aria-label="Order completion notification"]'
    );
    const errorBoundary = document.querySelector(
      'div[class*="fixed"][class*="inset-0"][class*="z-"]'
    );

    console.log('🔍 Checking for completion card elements:');
    console.log(
      '  - OrderCompletionCard:',
      completionCard ? '✅ Found' : '❌ Not found'
    );
    console.log(
      '  - Error Boundary:',
      errorBoundary ? '✅ Found' : '❌ Not found'
    );

    if (!completionCard && !errorBoundary) {
      console.log('❌ No completion card elements found in DOM');
      console.log('🔍 Checking React state...');

      // Try to access React state through dev tools
      if (
        window.React &&
        window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
      ) {
        console.log('🔍 React dev tools available - check component state');
      }
    }

    // Check for any fixed positioned elements
    const fixedElements = document.querySelectorAll('div[class*="fixed"]');
    console.log(`🔍 Found ${fixedElements.length} fixed positioned elements`);
    fixedElements.forEach((el, i) => {
      console.log(`  ${i + 1}. ${el.className}`);
    });
  }, 1000);
} else {
  console.log('❌ forceShowCompletionCard function not available');
  console.log('🔍 Available window functions:');
  Object.keys(window)
    .filter(
      (key) =>
        key.includes('force') ||
        key.includes('completion') ||
        key.includes('debug')
    )
    .forEach((key) => {
      console.log(`  - ${key}`);
    });
}

// Also check if we can manually set the state
console.log('🔍 Checking for React component state...');

// Try to find the Workflow component in React dev tools
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('✅ React DevTools available');
} else {
  console.log('❌ React DevTools not available');
}
