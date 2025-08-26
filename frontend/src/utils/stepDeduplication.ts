import type { WorkflowStep } from '../types';

/**
 * AGGRESSIVE step deduplication utility
 * Removes duplicate steps based on semantic analysis and priority
 */
export function deduplicateSteps(steps: WorkflowStep[]): WorkflowStep[] {
  console.log(
    '🧹 AGGRESSIVE DEDUPLICATION: Starting with',
    steps.length,
    'steps'
  );

  // Log all input steps for debugging
  steps.forEach((step, index) => {
    console.log(`🔍 Input Step ${index}:`, {
      id: step.id,
      name: step.name,
      toolName: step.toolName,
      status: step.status,
    });
  });

  // Create a map to track the best version of each step type
  const stepTypeMap = new Map<string, WorkflowStep>();

  // Define step type priorities (higher number = higher priority)
  const getStepPriority = (step: WorkflowStep): number => {
    // Prefer completed steps over pending/active
    if (step.status === 'completed') return 100;
    if (step.status === 'active') return 50;
    if (step.status === 'failed') return 10;
    return 1; // pending
  };

  // Aggressive semantic type detection
  const getStepType = (step: WorkflowStep): string => {
    const id = step.id.toLowerCase();
    const name = step.name?.toLowerCase() || '';
    const toolName = step.toolName?.toLowerCase() || '';

    // Create a combined search string
    const searchString = `${id} ${name} ${toolName}`;

    console.log(
      `🔍 Analyzing step: "${step.id}" with search string: "${searchString}"`
    );

    // Order extraction patterns (most specific first)
    if (
      searchString.includes('extraction') ||
      searchString.includes('extract')
    ) {
      console.log(`📝 Classified as: EXTRACTION`);
      return 'extraction';
    }

    // Finance and payment patterns
    if (
      searchString.includes('finance') ||
      searchString.includes('payment') ||
      searchString.includes('stripe') ||
      searchString.includes('checkout')
    ) {
      console.log(`💰 Classified as: FINANCE_PAYMENT`);
      return 'finance_payment';
    }

    // Blockchain patterns
    if (
      searchString.includes('blockchain') ||
      searchString.includes('anchor')
    ) {
      console.log(`⛓️ Classified as: BLOCKCHAIN`);
      return 'blockchain';
    }

    // Email patterns
    if (
      searchString.includes('email') ||
      searchString.includes('send email') ||
      searchString.includes('portia google')
    ) {
      console.log(`📧 Classified as: EMAIL`);
      return 'email';
    }

    // Validation patterns
    if (
      searchString.includes('validation') ||
      searchString.includes('validator')
    ) {
      console.log(`✅ Classified as: VALIDATION`);
      return 'validation';
    }

    // Inventory patterns
    if (searchString.includes('inventory')) {
      console.log(`📦 Classified as: INVENTORY`);
      return 'inventory';
    }

    // Pricing patterns
    if (searchString.includes('pricing') || searchString.includes('price')) {
      console.log(`💲 Classified as: PRICING`);
      return 'pricing';
    }

    // Supplier patterns
    if (searchString.includes('supplier') || searchString.includes('quote')) {
      console.log(`🏭 Classified as: SUPPLIER`);
      return 'supplier';
    }

    // Logistics patterns
    if (
      searchString.includes('logistics') ||
      searchString.includes('shipping')
    ) {
      console.log(`🚚 Classified as: LOGISTICS`);
      return 'logistics';
    }

    // Order finalization patterns (but NOT extraction)
    if (
      searchString.includes('order') &&
      !searchString.includes('extraction') &&
      !searchString.includes('extract')
    ) {
      console.log(`📋 Classified as: ORDER_FINALIZATION`);
      return 'order_finalization';
    }

    // Confirmation/clarification patterns
    if (
      searchString.includes('confirmation') ||
      searchString.includes('clarification')
    ) {
      console.log(`❓ Classified as: CONFIRMATION`);
      return 'confirmation';
    }

    // Merge patterns
    if (searchString.includes('merge')) {
      console.log(`🔀 Classified as: MERGE`);
      return 'merge';
    }

    // Fallback to step ID
    console.log(`❓ Classified as: UNKNOWN (${step.id})`);
    return `unknown_${step.id}`;
  };

  // Process each step
  steps.forEach((step) => {
    const stepType = getStepType(step);
    const priority = getStepPriority(step);

    const existing = stepTypeMap.get(stepType);

    if (!existing) {
      console.log(`✅ Adding first step of type "${stepType}":`, step.id);
      stepTypeMap.set(stepType, step);
    } else {
      const existingPriority = getStepPriority(existing);

      if (priority > existingPriority) {
        console.log(
          `🔄 Replacing step of type "${stepType}": ${existing.id} -> ${step.id} (better priority: ${priority} > ${existingPriority})`
        );
        stepTypeMap.set(stepType, step);
      } else {
        console.log(
          `🚫 Skipping duplicate step of type "${stepType}": ${step.id} (lower priority: ${priority} <= ${existingPriority})`
        );
      }
    }
  });

  // Convert map back to array
  const uniqueSteps = Array.from(stepTypeMap.values());

  // Sort steps by a logical order
  const stepOrder = [
    'extraction',
    'validation',
    'merge',
    'inventory',
    'pricing',
    'supplier',
    'logistics',
    'finance_payment',
    'confirmation',
    'order_finalization',
    'blockchain',
    'email',
  ];

  uniqueSteps.sort((a, b) => {
    const aType = getStepType(a);
    const bType = getStepType(b);
    const aIndex = stepOrder.indexOf(aType);
    const bIndex = stepOrder.indexOf(bType);

    // If both are in the order, sort by order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // If only one is in the order, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // If neither is in the order, sort by ID
    return a.id.localeCompare(b.id);
  });

  const removedCount = steps.length - uniqueSteps.length;
  console.log(`🧹 AGGRESSIVE DEDUPLICATION COMPLETE:`);
  console.log(`   - Input steps: ${steps.length}`);
  console.log(`   - Output steps: ${uniqueSteps.length}`);
  console.log(`   - Removed duplicates: ${removedCount}`);

  console.log('📋 Final step list:');
  uniqueSteps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step.id} (${step.name}) - ${step.status}`);
  });

  return uniqueSteps;
}

/**
 * Check if two steps are semantically the same
 */
export function areStepsSimilar(
  step1: WorkflowStep,
  step2: WorkflowStep
): boolean {
  // Same ID
  if (step1.id === step2.id) return true;

  // Same tool name
  if (step1.toolName && step2.toolName && step1.toolName === step2.toolName)
    return true;

  // Same display name
  if (step1.name === step2.name) return true;

  return false;
}
