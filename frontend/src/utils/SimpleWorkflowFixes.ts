import type { WorkflowStep, WorkflowRun } from '../types';

/**
 * SIMPLE, DIRECT FIXES for workflow issues
 * No complex logic, just straightforward solutions
 */

/**
 * Simple step deduplication - removes exact duplicates by ID and semantic duplicates
 */
export function simpleDeduplicateSteps(steps: WorkflowStep[]): WorkflowStep[] {
  console.log(
    '🔥 SIMPLE DEDUPLICATION: Input steps:',
    steps.map((s) => `${s.id} (${s.name})`)
  );

  const seen = new Set<string>();
  const result: WorkflowStep[] = [];

  for (const step of steps) {
    // Create a simple key for deduplication
    const key = `${step.id}_${step.name}_${step.toolName || ''}`.toLowerCase();

    // Also check for semantic duplicates
    const semanticKey = getSimpleSemanticKey(step);

    if (!seen.has(key) && !seen.has(semanticKey)) {
      seen.add(key);
      seen.add(semanticKey);
      result.push(step);
      console.log(`✅ KEEPING: ${step.id} (${step.name})`);
    } else {
      console.log(`🚫 REMOVING DUPLICATE: ${step.id} (${step.name})`);
    }
  }

  console.log(
    '🔥 SIMPLE DEDUPLICATION: Output steps:',
    result.map((s) => `${s.id} (${s.name})`)
  );
  return result;
}

/**
 * Get a simple semantic key for a step
 */
function getSimpleSemanticKey(step: WorkflowStep): string {
  const text = `${step.id} ${step.name} ${step.toolName || ''}`.toLowerCase();

  if (text.includes('extraction') || text.includes('extract'))
    return 'extraction';
  if (
    text.includes('payment') ||
    text.includes('stripe') ||
    text.includes('finance')
  )
    return 'payment';
  if (text.includes('blockchain') || text.includes('anchor'))
    return 'blockchain';
  if (text.includes('email')) return 'email';
  if (text.includes('validation') || text.includes('validator'))
    return 'validation';
  if (text.includes('inventory')) return 'inventory';
  if (text.includes('pricing') || text.includes('price')) return 'pricing';
  if (text.includes('supplier') || text.includes('quote')) return 'supplier';
  if (text.includes('logistics') || text.includes('shipping'))
    return 'logistics';
  if (text.includes('confirmation') || text.includes('clarification'))
    return 'confirmation';
  if (text.includes('order') && !text.includes('extraction')) return 'order';
  if (text.includes('merge')) return 'merge';

  return step.id;
}

/**
 * Simple completion detection - just check if email step is completed
 */
export function simpleDetectCompletion(workflowRun: WorkflowRun): boolean {
  console.log('🔥 SIMPLE COMPLETION CHECK for run:', workflowRun.id);
  console.log('🔥 Workflow status:', workflowRun.status);

  // Primary check: workflow status
  if (workflowRun.status === 'completed') {
    console.log('✅ COMPLETED: Workflow status is completed');
    return true;
  }

  // Secondary check: email step completed
  const emailStep = workflowRun.steps.find((step) => {
    const text = `${step.id} ${step.name} ${step.toolName || ''}`.toLowerCase();
    return text.includes('email') && step.status === 'completed';
  });

  if (emailStep) {
    console.log('✅ COMPLETED: Email step is completed:', emailStep.id);
    return true;
  }

  // Tertiary check: blockchain step completed
  const blockchainStep = workflowRun.steps.find((step) => {
    const text = `${step.id} ${step.name} ${step.toolName || ''}`.toLowerCase();
    return (
      (text.includes('blockchain') || text.includes('anchor')) &&
      step.status === 'completed'
    );
  });

  if (blockchainStep) {
    console.log(
      '✅ COMPLETED: Blockchain step is completed:',
      blockchainStep.id
    );
    return true;
  }

  console.log('❌ NOT COMPLETED');
  return false;
}

/**
 * Simple data extraction - just grab any data we can find
 */
export function simpleExtractOrderData(workflowRun: WorkflowRun): any {
  console.log('🔥 SIMPLE DATA EXTRACTION for run:', workflowRun.id);

  const result = {
    orderId: workflowRun.orderId || 'Unknown Order',
    model: 'Unknown Model',
    quantity: 1,
    deliveryLocation: 'Unknown Location',
    totalAmount: 'Unknown Amount',
    paymentLink: null as string | null,
    blockchainTxHash: null as string | null,
    buyerEmail: 'Unknown Email',
  };

  // Scan ALL steps for ANY useful data
  for (const step of workflowRun.steps) {
    if (!step.output) continue;

    console.log(`🔍 Checking step ${step.id} output:`, step.output);

    let data: any = {};

    // Try to parse output
    if (typeof step.output === 'string') {
      try {
        data = JSON.parse(step.output);
      } catch {
        data = { raw: step.output };
      }
    } else {
      data = step.output;
    }

    // Extract any useful fields
    if (data.order_id || data.orderId) {
      result.orderId = data.order_id || data.orderId;
      console.log('📋 Found order ID:', result.orderId);
    }

    if (data.model) {
      result.model = data.model;
      console.log('🚁 Found model:', result.model);
    }

    if (data.quantity) {
      result.quantity = data.quantity;
      console.log('🔢 Found quantity:', result.quantity);
    }

    if (data.delivery_location || data.deliveryLocation) {
      result.deliveryLocation = data.delivery_location || data.deliveryLocation;
      console.log('📍 Found location:', result.deliveryLocation);
    }

    if (data.total_amount || data.totalAmount) {
      result.totalAmount = data.total_amount || data.totalAmount;
      console.log('💰 Found amount:', result.totalAmount);
    }

    if (data.buyer_email || data.buyerEmail || data.email) {
      result.buyerEmail = data.buyer_email || data.buyerEmail || data.email;
      console.log('📧 Found email:', result.buyerEmail);
    }

    if (data.payment_link || data.paymentLink) {
      result.paymentLink = data.payment_link || data.paymentLink;
      console.log('💳 Found payment link:', result.paymentLink);
    }

    if (data.tx_hash || data.txHash || data.hash) {
      result.blockchainTxHash = data.tx_hash || data.txHash || data.hash;
      console.log('⛓️ Found blockchain hash:', result.blockchainTxHash);
    }

    // Also check raw string for patterns
    if (typeof step.output === 'string') {
      const raw = step.output;

      // Look for Stripe links
      const stripeMatch = raw.match(/https:\/\/checkout\.stripe\.com[^\s"']+/);
      if (stripeMatch && !result.paymentLink) {
        result.paymentLink = stripeMatch[0];
        console.log('💳 Found payment link in raw:', result.paymentLink);
      }

      // Look for blockchain hashes
      const hashMatch = raw.match(/[a-fA-F0-9]{64}/);
      if (hashMatch && !result.blockchainTxHash) {
        result.blockchainTxHash = hashMatch[0];
        console.log(
          '⛓️ Found blockchain hash in raw:',
          result.blockchainTxHash
        );
      }

      // Look for emails
      const emailMatch = raw.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      );
      if (emailMatch && result.buyerEmail === 'Unknown Email') {
        result.buyerEmail = emailMatch[0];
        console.log('📧 Found email in raw:', result.buyerEmail);
      }
    }
  }

  console.log('🔥 SIMPLE EXTRACTION RESULT:', result);
  return result;
}
