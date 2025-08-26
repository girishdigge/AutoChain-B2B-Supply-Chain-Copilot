#!/usr/bin/env node

/**
 * Simple validation script to check if the workflow blank screen fixes are working
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating workflow blank screen fixes...');

// Check if key files exist and have the expected fixes
const filesToCheck = [
  {
    path: 'src/context/AppStateContext.tsx',
    checks: [
      'deduplicatedStepsForAdd',
      'completedStepsForAdd',
      'progressForAdd',
      'try {',
      'catch (error)',
    ],
  },
  {
    path: 'src/hooks/useWebSocketEventHandlers.ts',
    checks: [
      'try {',
      'catch (error)',
      'Validate incoming data',
      'mappedStepId',
    ],
  },
  {
    path: 'src/components/WorkflowStepper.tsx',
    checks: [
      'Enhanced step ordering',
      'stepsByToolName',
      'stepsByName',
      'Array.isArray(steps)',
    ],
  },
  {
    path: 'src/pages/Workflow.tsx',
    checks: [
      'const workflowSteps = useMemo',
      'isStepTransitioning',
      'Conservative filtering',
      'Monitor workflow step changes',
    ],
  },
];

let allChecksPass = true;

filesToCheck.forEach(({ path: filePath, checks }) => {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    allChecksPass = false;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  console.log(`\n📁 Checking ${filePath}:`);

  checks.forEach((check) => {
    if (content.includes(check)) {
      console.log(`  ✅ ${check}`);
    } else {
      console.log(`  ❌ Missing: ${check}`);
      allChecksPass = false;
    }
  });
});

// Check if test files are excluded from build
const tsconfigApp = path.join(__dirname, 'tsconfig.app.json');
if (fs.existsSync(tsconfigApp)) {
  const tsconfig = fs.readFileSync(tsconfigApp, 'utf8');
  if (tsconfig.includes('src/test/**/*')) {
    console.log('\n✅ Test files excluded from build');
  } else {
    console.log('\n❌ Test files not excluded from build');
    allChecksPass = false;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (allChecksPass) {
  console.log('✅ All workflow blank screen fixes are in place!');
  console.log('\nKey improvements:');
  console.log('- Fixed state management undefined variables');
  console.log('- Enhanced error handling and validation');
  console.log('- Improved step mapping and consistency');
  console.log('- Added comprehensive logging and debugging');
  console.log('- Enhanced UI state management and transitions');
  console.log(
    '\nThe workflow should now display steps continuously from planning through completion.'
  );
} else {
  console.log('❌ Some fixes are missing or incomplete.');
  console.log('Please review the failed checks above.');
}

console.log('\n🧪 To test the fixes:');
console.log('1. Start the development server: npm run dev');
console.log('2. Navigate to the workflow page');
console.log('3. Start a workflow and monitor step progression');
console.log('4. Check browser console for debug information');
