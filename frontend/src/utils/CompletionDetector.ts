import type { WorkflowRun } from '../types';

export interface CompletionState {
  hasShownCard: boolean;
  completionTime: string;
  cardDismissed: boolean;
}

export interface CompletionDetectorOptions {
  debounceMs?: number;
  requiredSteps?: string[];
}

/**
 * CompletionDetector handles robust workflow completion detection with debouncing
 * and state validation to prevent duplicate completion card displays.
 */
export class CompletionDetector {
  private completionStates: Map<string, CompletionState> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly debounceMs: number;
  private readonly requiredSteps: string[];

  constructor(options: CompletionDetectorOptions = {}) {
    this.debounceMs = options.debounceMs ?? 2000; // 2 second debounce by default
    this.requiredSteps = options.requiredSteps ?? [
      'extraction',
      'payment',
      'blockchain',
      'email',
    ];
  }

  /**
   * Detects if a workflow run has completed based on status and step completion
   */
  detectCompletion(workflowRun: WorkflowRun): boolean {
    if (!workflowRun) return false;

    console.log(
      '🔍 CompletionDetector: Checking completion for run:',
      workflowRun.id
    );
    console.log('🔍 Workflow status:', workflowRun.status);
    console.log('🔍 Workflow progress:', workflowRun.progress);

    // Primary completion check: workflow status is completed
    if (workflowRun.status === 'completed') {
      console.log('✅ Completion detected: workflow status is completed');
      return true;
    }

    // Check for email step completion as a strong indicator of workflow completion
    const emailStepCompleted = workflowRun.steps.some((step) => {
      const isEmailStep =
        step.id.toLowerCase().includes('email') ||
        step.name?.toLowerCase().includes('email') ||
        step.toolName?.toLowerCase().includes('email') ||
        step.toolName?.toLowerCase().includes('portia google send email tool');

      const isCompleted = step.status === 'completed';

      if (isEmailStep) {
        console.log('📧 Found email step:', {
          id: step.id,
          name: step.name,
          toolName: step.toolName,
          status: step.status,
          isCompleted,
        });
      }

      return isEmailStep && isCompleted;
    });

    if (emailStepCompleted) {
      console.log('✅ Completion detected: email step is completed');
      return true;
    }

    // Check for blockchain step completion as another strong indicator
    const blockchainStepCompleted = workflowRun.steps.some((step) => {
      const isBlockchainStep =
        step.id.toLowerCase().includes('blockchain') ||
        step.id.toLowerCase().includes('anchor') ||
        step.name?.toLowerCase().includes('blockchain') ||
        step.toolName?.toLowerCase().includes('blockchain') ||
        step.toolName?.toLowerCase().includes('anchor');

      const isCompleted = step.status === 'completed';

      if (isBlockchainStep) {
        console.log('⛓️ Found blockchain step:', {
          id: step.id,
          name: step.name,
          toolName: step.toolName,
          status: step.status,
          isCompleted,
        });
      }

      return isBlockchainStep && isCompleted;
    });

    // If blockchain is completed and we have high progress, consider it complete
    if (blockchainStepCompleted && workflowRun.progress >= 85) {
      console.log(
        '✅ Completion detected: blockchain step completed with high progress'
      );
      return true;
    }

    // Secondary check: all critical steps are completed
    const criticalStepsStatus = this.requiredSteps.map((stepPattern) => {
      const found = workflowRun.steps.some((step) => {
        const matchesPattern =
          step.id.toLowerCase().includes(stepPattern.toLowerCase()) ||
          step.name?.toLowerCase().includes(stepPattern.toLowerCase()) ||
          step.toolName?.toLowerCase().includes(stepPattern.toLowerCase());

        return matchesPattern && step.status === 'completed';
      });

      console.log(
        `🔍 Critical step '${stepPattern}': ${found ? 'FOUND' : 'MISSING'}`
      );
      return found;
    });

    const criticalStepsCompleted = criticalStepsStatus.every(
      (status) => status
    );
    const highCompletionPercentage = workflowRun.progress >= 80; // Lowered threshold

    console.log('🔍 Critical steps completed:', criticalStepsCompleted);
    console.log(
      '🔍 High completion percentage (>=80%):',
      highCompletionPercentage
    );

    const isComplete = criticalStepsCompleted && highCompletionPercentage;

    if (isComplete) {
      console.log(
        '✅ Completion detected: all critical steps completed with high progress'
      );
    } else {
      console.log('❌ Completion not detected');
    }

    return isComplete;
  }

  /**
   * Determines if the completion card should be shown with debouncing and state validation
   */
  shouldShowCompletionCard(
    workflowRun: WorkflowRun,
    onShowCard?: () => void
  ): boolean {
    if (!workflowRun) return false;

    const runId = workflowRun.id;
    const currentState = this.completionStates.get(runId);

    // Don't show if already shown or dismissed
    if (currentState?.hasShownCard || currentState?.cardDismissed) {
      return false;
    }

    // Check if workflow is actually completed
    if (!this.detectCompletion(workflowRun)) {
      return false;
    }

    // Clear any existing debounce timer
    const existingTimer = this.debounceTimers.get(runId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set up debounced execution
    const timer = setTimeout(() => {
      // Double-check completion state hasn't changed
      const latestState = this.completionStates.get(runId);
      if (!latestState?.hasShownCard && !latestState?.cardDismissed) {
        // Mark as shown
        this.markCompletionCardShown(runId);

        // Execute callback if provided
        if (onShowCard) {
          onShowCard();
        }
      }

      // Clean up timer
      this.debounceTimers.delete(runId);
    }, this.debounceMs);

    this.debounceTimers.set(runId, timer);

    return false; // Return false initially, callback will handle the actual display
  }

  /**
   * Marks that the completion card has been shown for a workflow run
   */
  markCompletionCardShown(runId: string): void {
    const currentState = this.completionStates.get(runId) || {
      hasShownCard: false,
      completionTime: new Date().toISOString(),
      cardDismissed: false,
    };

    this.completionStates.set(runId, {
      ...currentState,
      hasShownCard: true,
      completionTime: new Date().toISOString(),
    });
  }

  /**
   * Marks that the completion card has been dismissed for a workflow run
   */
  markCompletionCardDismissed(runId: string): void {
    const currentState = this.completionStates.get(runId) || {
      hasShownCard: false,
      completionTime: new Date().toISOString(),
      cardDismissed: false,
    };

    this.completionStates.set(runId, {
      ...currentState,
      cardDismissed: true,
    });
  }

  /**
   * Gets the completion state for a workflow run
   */
  getCompletionState(runId: string): CompletionState | undefined {
    return this.completionStates.get(runId);
  }

  /**
   * Resets the completion state for a workflow run
   */
  resetCompletionState(runId: string): void {
    this.completionStates.delete(runId);

    // Clear any pending debounce timer
    const timer = this.debounceTimers.get(runId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(runId);
    }
  }

  /**
   * Clears all completion states (useful for cleanup)
   */
  clearAllStates(): void {
    // Clear all timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();

    // Clear all states
    this.completionStates.clear();
  }

  /**
   * Validates that order data is sufficient for completion card display
   */
  validateOrderData(workflowRun: WorkflowRun): {
    isValid: boolean;
    missingFields: string[];
    extractedData: any;
  } {
    const missingFields: string[] = [];

    // Extract data from workflow steps
    const extractedData = this.extractOrderDataFromSteps(workflowRun.steps);

    console.log('🔍 Validating extracted data:', extractedData);

    // Only require orderId as essential - other fields are optional for display
    if (!extractedData.orderId || extractedData.orderId === 'Unknown Order') {
      missingFields.push('orderId');
    }

    // Log missing optional fields but don't mark as invalid
    if (!extractedData.paymentLink) {
      console.log('⚠️ Payment link missing - will show placeholder');
      missingFields.push('paymentLink');
    }

    if (!extractedData.blockchainTxHash) {
      console.log('⚠️ Blockchain hash missing - will hide blockchain button');
      missingFields.push('blockchainTxHash');
    }

    // Consider valid if we have at least the order ID
    const isValid =
      extractedData.orderId && extractedData.orderId !== 'Unknown Order';

    console.log('🔍 Validation result:', {
      isValid,
      missingFields,
      hasOrderId: !!extractedData.orderId,
      hasPaymentLink: !!extractedData.paymentLink,
      hasBlockchainHash: !!extractedData.blockchainTxHash,
    });

    return {
      isValid,
      missingFields,
      extractedData,
    };
  }

  /**
   * Extracts order data from workflow steps for completion card display
   */
  private extractOrderDataFromSteps(steps: any[]): any {
    console.log('🔍 Extracting order data from steps:', steps.length);
    console.log(
      '🔍 Available steps:',
      steps.map((s) => ({
        id: s.id,
        name: s.name,
        toolName: s.toolName,
        status: s.status,
        hasOutput: !!s.output,
      }))
    );

    const findStepByPattern = (patterns: string[]) => {
      const found = steps.find((step) => {
        return patterns.some(
          (pattern) =>
            step.id.toLowerCase().includes(pattern.toLowerCase()) ||
            step.name?.toLowerCase().includes(pattern.toLowerCase()) ||
            step.toolName?.toLowerCase().includes(pattern.toLowerCase())
        );
      });

      if (found) {
        console.log(`🔍 Found step for patterns [${patterns.join(', ')}]:`, {
          id: found.id,
          name: found.name,
          toolName: found.toolName,
          hasOutput: !!found.output,
        });
      } else {
        console.log(`❌ No step found for patterns [${patterns.join(', ')}]`);
      }

      return found;
    };

    const parseStepOutput = (step: any) => {
      if (!step?.output) {
        console.log('❌ Step has no output:', step?.id);
        return {};
      }

      console.log('🔍 Parsing step output:', {
        stepId: step.id,
        outputType: typeof step.output,
        outputPreview:
          typeof step.output === 'string'
            ? step.output.substring(0, 100)
            : step.output,
      });

      if (typeof step.output === 'string') {
        try {
          const parsed = JSON.parse(step.output);
          console.log('✅ Successfully parsed JSON output:', parsed);
          return parsed;
        } catch {
          // Extract structured data from string
          const output = step.output;
          console.log(
            '🔍 Extracting from string output:',
            output.substring(0, 200)
          );

          const result: any = { raw: output };

          // Extract payment link with more patterns
          const paymentLinkPatterns = [
            /https:\/\/checkout\.stripe\.com[^\s"'}\]]+/g,
            /"payment_link":\s*"([^"]+)"/g,
            /"stripe_url":\s*"([^"]+)"/g,
            /"checkout_url":\s*"([^"]+)"/g,
          ];

          for (const pattern of paymentLinkPatterns) {
            const matches = [...output.matchAll(pattern)];
            if (matches.length > 0) {
              const link = matches[0][1] || matches[0][0];
              if (link && link.includes('checkout.stripe.com')) {
                result.payment_link = link;
                console.log('✅ Found payment link:', link);
                break;
              }
            }
          }

          // Extract blockchain hash with more patterns
          const hashPatterns = [
            /[a-fA-F0-9]{64}/g,
            /"tx_hash":\s*"([^"]+)"/g,
            /"transaction_hash":\s*"([^"]+)"/g,
            /"hash":\s*"([^"]+)"/g,
          ];

          for (const pattern of hashPatterns) {
            const matches = [...output.matchAll(pattern)];
            if (matches.length > 0) {
              const hash = matches[0][1] || matches[0][0];
              if (hash && /^[a-fA-F0-9]{64}$/.test(hash)) {
                result.tx_hash = hash;
                console.log('✅ Found blockchain hash:', hash);
                break;
              }
            }
          }

          // Extract other data
          const dataPatterns = {
            order_id: [/"order_id":\s*"([^"]+)"/g, /"orderId":\s*"([^"]+)"/g],
            model: [/"model":\s*"([^"]+)"/g],
            quantity: [/"quantity":\s*(\d+)/g],
            total_amount: [
              /"total_amount":\s*"([^"]+)"/g,
              /"totalAmount":\s*"([^"]+)"/g,
            ],
            buyer_email: [
              /"buyer_email":\s*"([^"]+)"/g,
              /"buyerEmail":\s*"([^"]+)"/g,
            ],
            delivery_location: [
              /"delivery_location":\s*"([^"]+)"/g,
              /"deliveryLocation":\s*"([^"]+)"/g,
            ],
          };

          for (const [key, patterns] of Object.entries(dataPatterns)) {
            for (const pattern of patterns) {
              const matches = [...output.matchAll(pattern)];
              if (matches.length > 0) {
                const value = matches[0][1];
                if (value) {
                  result[key] = key === 'quantity' ? parseInt(value) : value;
                  console.log(`✅ Found ${key}:`, value);
                  break;
                }
              }
            }
          }

          return result;
        }
      }

      console.log('✅ Using direct output object:', step.output);
      return step.output;
    };

    // Find relevant steps with more comprehensive patterns
    const extractionStep = findStepByPattern([
      'order_extraction_tool',
      'orderextractiontool',
      'extraction',
      'extract',
      'order extraction',
    ]);

    const paymentStep = findStepByPattern([
      'stripe_payment_tool',
      'stripepaymenttool',
      'stripe payment',
      'payment',
      'stripe',
      'checkout',
    ]);

    const blockchainStep = findStepByPattern([
      'blockchain_anchor_tool',
      'blockchain_anchor',
      'blockchainanchortool',
      'blockchain anchor',
      'blockchain',
      'anchor',
    ]);

    const orderStep = findStepByPattern([
      'order_tool',
      'ordertool',
      'order tool',
      'finalize',
      'finalization',
    ]);

    // Parse outputs with detailed logging
    console.log('🔍 Parsing step outputs...');
    const extractionOutput = parseStepOutput(extractionStep);
    const paymentOutput = parseStepOutput(paymentStep);
    const blockchainOutput = parseStepOutput(blockchainStep);
    const orderOutput = parseStepOutput(orderStep);

    console.log('🔍 Parsed outputs:', {
      extraction: extractionOutput,
      payment: paymentOutput,
      blockchain: blockchainOutput,
      order: orderOutput,
    });

    // Extract and validate data with fallbacks
    const extractOrderId = () => {
      const id =
        paymentOutput?.order_id ||
        orderOutput?.order_id ||
        extractionOutput?.order_id ||
        paymentOutput?.orderId ||
        orderOutput?.orderId ||
        extractionOutput?.orderId;

      console.log('🔍 Extracted order ID:', id);
      return id || 'Unknown Order';
    };

    const extractPaymentLink = () => {
      let link =
        paymentOutput?.payment_link ||
        paymentOutput?.stripe_url ||
        paymentOutput?.checkout_url ||
        paymentOutput?.paymentLink ||
        paymentStep?.output?.payment_link;

      // Also check raw output if step exists
      if (
        !link &&
        paymentStep?.output &&
        typeof paymentStep.output === 'string'
      ) {
        const match = paymentStep.output.match(
          /https:\/\/checkout\.stripe\.com[^\s"'}\]]+/
        );
        if (match) {
          link = match[0];
        }
      }

      console.log('🔍 Extracted payment link:', link);

      // Validate Stripe link
      if (
        link &&
        typeof link === 'string' &&
        link.includes('checkout.stripe.com') &&
        !link.includes('/pay/demo')
      ) {
        console.log('✅ Valid payment link found');
        return link;
      }

      console.log('❌ No valid payment link found');
      return null;
    };

    const extractBlockchainHash = () => {
      let hash =
        blockchainOutput?.tx_hash ||
        blockchainOutput?.transaction_hash ||
        blockchainOutput?.hash ||
        blockchainOutput?.txHash ||
        blockchainStep?.output;

      // If step output is a string, try to extract hash
      if (
        !hash &&
        blockchainStep?.output &&
        typeof blockchainStep.output === 'string'
      ) {
        const match = blockchainStep.output.match(/[a-fA-F0-9]{64}/);
        if (match) {
          hash = match[0];
        }
      }

      console.log('🔍 Extracted blockchain hash:', hash);

      // Validate hash format (64 hex characters)
      if (typeof hash === 'string' && /^[a-fA-F0-9]{64}$/.test(hash)) {
        console.log('✅ Valid blockchain hash found');
        return hash;
      }

      console.log('❌ No valid blockchain hash found');
      return null;
    };

    // FALLBACK: Try to extract data from ANY step that has output
    console.log('🔍 FALLBACK: Scanning all steps for any useful data...');
    const allOutputs: any[] = [];

    steps.forEach((step, index) => {
      if (step.output) {
        console.log(`🔍 Step ${index} (${step.id}) has output:`, step.output);
        const parsed = parseStepOutput(step);
        if (parsed && Object.keys(parsed).length > 0) {
          allOutputs.push({
            stepId: step.id,
            stepName: step.name,
            data: parsed,
          });
        }
      }
    });

    console.log('🔍 All parsed outputs:', allOutputs);

    // Extract data with comprehensive fallbacks
    const extractWithFallback = (
      field: string,
      fallback: any = `Unknown ${field}`
    ) => {
      const sources = [
        extractionOutput?.[field],
        paymentOutput?.[field],
        blockchainOutput?.[field],
        orderOutput?.[field],
        // Try all outputs
        ...allOutputs.map((o) => o.data?.[field]).filter(Boolean),
      ].filter(Boolean);

      const result = sources[0] || fallback;
      console.log(`🔍 ${field} sources:`, sources, '-> Selected:', result);
      return result;
    };

    const result = {
      orderId:
        extractWithFallback('order_id') ||
        extractWithFallback('orderId', 'Unknown Order'),
      model: extractWithFallback('model', 'Unknown Model'),
      quantity: extractWithFallback('quantity', 1),
      deliveryLocation:
        extractWithFallback('delivery_location') ||
        extractWithFallback('deliveryLocation', 'Unknown Location'),
      totalAmount:
        extractWithFallback('total_amount') ||
        extractWithFallback('totalAmount', 'Unknown Amount'),
      paymentLink: extractPaymentLink(),
      blockchainTxHash: extractBlockchainHash(),
      buyerEmail:
        extractWithFallback('buyer_email') ||
        extractWithFallback('buyerEmail', 'Unknown Email'),
    };

    console.log('🎯 FINAL EXTRACTED DATA WITH FALLBACKS:', result);
    return result;
  }
}

// Export a singleton instance for global use
export const completionDetector = new CompletionDetector();
