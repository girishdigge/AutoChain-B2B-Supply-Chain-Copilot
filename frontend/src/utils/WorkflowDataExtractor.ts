import type { WorkflowRun, WorkflowStep } from '../types';

/**
 * OrderCompletionData interface for extracted workflow data
 */
export interface OrderCompletionData {
  orderId: string;
  model: string;
  quantity: number;
  deliveryLocation: string;
  totalAmount: string;
  paymentLink: string | null;
  blockchainTxHash: string | null;
  buyerEmail: string;
  emailConfirmationId?: string;
}

/**
 * WorkflowDataExtractor - Comprehensive data extraction from completed workflow steps
 *
 * This extractor implements the requirements from the workflow-execution-flow-fixes spec:
 * - Extracts payment links from StripePaymentTool output and raw step content
 * - Extracts blockchain hashes from Blockchain Anchor Tool output
 * - Extracts buyer email from ClarificationTool responses
 * - Extracts order details from merge fields tool output
 * - Provides fallback data extraction patterns for missing structured data
 */
export interface WorkflowDataExtractor {
  extractCompletionData(workflowRun: WorkflowRun): OrderCompletionData;
  extractPaymentLink(steps: WorkflowStep[]): string | null;
  extractBlockchainHash(steps: WorkflowStep[]): string | null;
  extractBuyerEmail(steps: WorkflowStep[]): string;
  extractOrderDetails(steps: WorkflowStep[]): {
    model: string;
    quantity: number;
    deliveryLocation: string;
    totalAmount: string;
  };
}

export class ComprehensiveDataExtractor implements WorkflowDataExtractor {
  // Tool name patterns for identification
  private readonly STRIPE_TOOL_NAMES = [
    'StripePaymentTool',
    'stripe payment tool',
    'stripe_payment',
    'payment',
    'checkout',
    'stripe',
  ];

  private readonly BLOCKCHAIN_TOOL_NAMES = [
    'Blockchain Anchor Tool',
    'blockchain anchor tool',
    'blockchain_anchor',
    'blockchain',
    'anchor',
    'chain',
  ];

  private readonly CLARIFICATION_TOOL_NAMES = [
    'ClarificationTool',
    'clarification tool',
    'clarification',
    'question',
    'ask',
  ];

  private readonly MERGE_TOOL_NAMES = [
    'merge fields tool',
    'merge_fields',
    'merge',
    'order_tool',
    'order tool',
    'order',
  ];

  // Regex patterns for data extraction - Fixed to capture full Stripe URLs
  private readonly PAYMENT_LINK_PATTERNS = [
    /https:\/\/checkout\.stripe\.com\/c\/pay\/[a-zA-Z0-9_-]+(?:#[a-zA-Z0-9%_\-=&+\/]*)?/g,
    /https:\/\/checkout\.stripe\.com\/pay\/[a-zA-Z0-9_-]+(?:#[a-zA-Z0-9%_\-=&+\/]*)?/g,
    /"payment_link":\s*"([^"]+)"/gi,
    /"payment_url":\s*"([^"]+)"/gi,
    /"checkout_url":\s*"([^"]+)"/gi,
    /payment[_\s]*link[:\s]*([^\s\n]+stripe[^\s\n]*)/gi,
  ];

  private readonly BLOCKCHAIN_HASH_PATTERNS = [
    /0x[a-fA-F0-9]{64}/g,
    /[a-fA-F0-9]{64}/g,
    /"tx_hash":\s*"([^"]+)"/gi,
    /"transaction_hash":\s*"([^"]+)"/gi,
    /"hash":\s*"([^"]+)"/gi,
  ];

  private readonly EMAIL_PATTERNS = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    /"email":\s*"([^"]+)"/gi,
    /"buyer_email":\s*"([^"]+)"/gi,
    /email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  ];

  /**
   * Extracts comprehensive completion data from a workflow run
   */
  extractCompletionData(workflowRun: WorkflowRun): OrderCompletionData {
    console.log(
      '🔍 WorkflowDataExtractor: Starting data extraction for run:',
      workflowRun.id
    );
    console.log('🔍 Total steps to analyze:', workflowRun.steps.length);

    const steps = workflowRun.steps;

    // Extract all data components
    const paymentLink = this.extractPaymentLink(steps);
    const blockchainTxHash = this.extractBlockchainHash(steps);
    const buyerEmail = this.extractBuyerEmail(steps);
    const orderDetails = this.extractOrderDetails(steps);

    const completionData: OrderCompletionData = {
      orderId: workflowRun.orderId || workflowRun.id,
      paymentLink,
      blockchainTxHash,
      buyerEmail,
      ...orderDetails,
    };

    console.log('✅ WorkflowDataExtractor: Extraction complete:', {
      orderId: completionData.orderId,
      hasPaymentLink: !!completionData.paymentLink,
      hasBlockchainHash: !!completionData.blockchainTxHash,
      buyerEmail: completionData.buyerEmail,
      model: completionData.model,
      quantity: completionData.quantity,
    });

    return completionData;
  }

  /**
   * Extracts payment link from StripePaymentTool output and raw step content
   */
  extractPaymentLink(steps: WorkflowStep[]): string | null {
    console.log(
      '💳 WorkflowDataExtractor: Extracting payment link from',
      steps.length,
      'steps'
    );

    // First, try to find Stripe-specific tool steps
    const stripeSteps = steps.filter((step) =>
      this.matchesToolNames(step, this.STRIPE_TOOL_NAMES)
    );

    console.log('💳 Found', stripeSteps.length, 'Stripe-related steps');

    // Extract from Stripe tool outputs first
    for (const step of stripeSteps) {
      const link = this.extractPaymentLinkFromOutput(step.output);
      if (link) {
        console.log(
          '✅ Payment link found in Stripe tool output:',
          link.substring(0, 50) + '...'
        );
        return link;
      }
    }

    // Fallback: scan all step outputs for payment links
    console.log('🔍 Fallback: Scanning all step outputs for payment links');
    for (const step of steps) {
      const link = this.extractPaymentLinkFromOutput(step.output);
      if (link) {
        console.log(
          '✅ Payment link found in step output:',
          step.name,
          link.substring(0, 50) + '...'
        );
        return link;
      }
    }

    console.log('❌ No payment link found in any step outputs');
    return null;
  }

  /**
   * Extracts blockchain hash from Blockchain Anchor Tool output
   */
  extractBlockchainHash(steps: WorkflowStep[]): string | null {
    console.log(
      '🔗 WorkflowDataExtractor: Extracting blockchain hash from',
      steps.length,
      'steps'
    );

    // First, try to find blockchain-specific tool steps
    const blockchainSteps = steps.filter((step) =>
      this.matchesToolNames(step, this.BLOCKCHAIN_TOOL_NAMES)
    );

    console.log('🔗 Found', blockchainSteps.length, 'blockchain-related steps');

    // Extract from blockchain tool outputs first
    for (const step of blockchainSteps) {
      const hash = this.extractBlockchainHashFromOutput(step.output);
      if (hash) {
        console.log(
          '✅ Blockchain hash found in blockchain tool output:',
          hash
        );
        return hash;
      }
    }

    // Fallback: scan all step outputs for blockchain hashes
    console.log('🔍 Fallback: Scanning all step outputs for blockchain hashes');
    for (const step of steps) {
      const hash = this.extractBlockchainHashFromOutput(step.output);
      if (hash) {
        console.log(
          '✅ Blockchain hash found in step output:',
          step.name,
          hash
        );
        return hash;
      }
    }

    console.log('❌ No blockchain hash found in any step outputs');
    return null;
  }

  /**
   * Extracts buyer email from ClarificationTool responses
   */
  extractBuyerEmail(steps: WorkflowStep[]): string {
    console.log(
      '📧 WorkflowDataExtractor: Extracting buyer email from',
      steps.length,
      'steps'
    );

    // Enhanced tool names for email extraction
    const emailToolNames = [
      'clarificationtool',
      'clarification tool',
      'clarification',
      'orderextractiontool',
      'order extraction',
      'merge fields tool',
      'merge_fields',
      'validatortool',
      'validator',
    ];

    // First, try to find email-related tool steps
    const emailSteps = steps.filter((step) =>
      this.matchesToolNames(step, emailToolNames)
    );

    console.log('📧 Found', emailSteps.length, 'email-related steps');

    // Extract from email tool outputs first
    for (const step of emailSteps) {
      const email = this.extractEmailFromOutput(step.output);
      if (email && this.isValidEmail(email)) {
        console.log('✅ Buyer email found in email tool output:', email);
        return email;
      }
    }

    // AGGRESSIVE FALLBACK: scan all step outputs for email addresses
    console.log(
      '🔍 AGGRESSIVE FALLBACK: Scanning all step outputs for email addresses'
    );
    for (const step of steps) {
      const email = this.extractEmailFromOutput(step.output);
      if (email && this.isValidEmail(email)) {
        console.log('✅ Buyer email found in step output:', step.name, email);
        return email;
      }
    }

    // LAST RESORT: Check order ID patterns (often contains email)
    for (const step of steps) {
      if (
        step.output &&
        typeof step.output === 'object' &&
        step.output.order_id
      ) {
        const orderId = step.output.order_id;
        // Order IDs often have format: email-model-location or model-location-email
        const parts = orderId.split('-');
        for (const part of parts) {
          if (this.isValidEmail(part)) {
            console.log('✅ Buyer email found in order ID:', part);
            return part;
          }
        }
      }
    }

    console.log('❌ No buyer email found, using fallback');
    return 'buyer@example.com'; // Fallback value
  }

  /**
   * Extracts order details from merge fields tool output and other sources
   */
  extractOrderDetails(steps: WorkflowStep[]): {
    model: string;
    quantity: number;
    deliveryLocation: string;
    totalAmount: string;
  } {
    console.log(
      '📋 WorkflowDataExtractor: Extracting order details from',
      steps.length,
      'steps'
    );

    // Enhanced tool name patterns for better matching
    const orderToolNames = [
      'merge fields tool',
      'merge_fields',
      'merge',
      'order_tool',
      'order tool',
      'order',
      'orderextractiontool',
      'order extraction',
      'validatortool',
      'validator',
      'clarificationtool',
      'clarification',
      'financeandpaymenttool',
      'finance',
    ];

    // First, try to find order-related tool steps
    const orderSteps = steps.filter((step) =>
      this.matchesToolNames(step, orderToolNames)
    );

    console.log('📋 Found', orderSteps.length, 'order-related steps');

    let model = 'Unknown Model';
    let quantity = 1;
    let deliveryLocation = 'Unknown Location';
    let totalAmount = '$0.00';

    // Extract from order tool outputs first
    for (const step of orderSteps) {
      console.log(`📋 Checking step: ${step.name} (${step.toolName})`);
      const details = this.extractOrderDetailsFromOutput(step.output);
      console.log(`📋 Extracted from ${step.name}:`, details);

      if (details.model !== 'Unknown Model') model = details.model;
      if (details.quantity !== 1) quantity = details.quantity;
      if (details.deliveryLocation !== 'Unknown Location')
        deliveryLocation = details.deliveryLocation;
      if (details.totalAmount !== '$0.00') totalAmount = details.totalAmount;
    }

    // AGGRESSIVE FALLBACK: scan all step outputs and names for order details
    console.log('🔍 AGGRESSIVE FALLBACK: Scanning all steps for order details');
    for (const step of steps) {
      // Check step output
      const details = this.extractOrderDetailsFromOutput(step.output);
      if (model === 'Unknown Model' && details.model !== 'Unknown Model') {
        console.log(`📋 Found model in ${step.name}: ${details.model}`);
        model = details.model;
      }
      if (quantity === 1 && details.quantity !== 1) {
        console.log(`📋 Found quantity in ${step.name}: ${details.quantity}`);
        quantity = details.quantity;
      }
      if (
        deliveryLocation === 'Unknown Location' &&
        details.deliveryLocation !== 'Unknown Location'
      ) {
        console.log(
          `📋 Found location in ${step.name}: ${details.deliveryLocation}`
        );
        deliveryLocation = details.deliveryLocation;
      }
      if (totalAmount === '$0.00' && details.totalAmount !== '$0.00') {
        console.log(`📋 Found amount in ${step.name}: ${details.totalAmount}`);
        totalAmount = details.totalAmount;
      }

      // Also check step names and tool names for clues
      if (model === 'Unknown Model') {
        const stepText = `${step.name} ${step.toolName || ''} ${JSON.stringify(
          step.output || ''
        )}`.toLowerCase();
        if (stepText.includes('lamborghini')) model = 'Lamborghini Aventador';
        else if (stepText.includes('ferrari')) model = 'Ferrari';
        else if (stepText.includes('porsche')) model = 'Porsche';
        else if (stepText.includes('bmw')) model = 'BMW';
        else if (stepText.includes('mercedes')) model = 'Mercedes';
        else if (stepText.includes('audi')) model = 'Audi';
      }

      if (deliveryLocation === 'Unknown Location') {
        const stepText = `${step.name} ${step.toolName || ''} ${JSON.stringify(
          step.output || ''
        )}`.toLowerCase();
        if (stepText.includes('london')) deliveryLocation = 'London';
        else if (stepText.includes('new york')) deliveryLocation = 'New York';
        else if (stepText.includes('paris')) deliveryLocation = 'Paris';
        else if (stepText.includes('tokyo')) deliveryLocation = 'Tokyo';
        else if (stepText.includes('berlin')) deliveryLocation = 'Berlin';
      }
    }

    const result = { model, quantity, deliveryLocation, totalAmount };
    console.log('✅ Order details extracted:', result);
    return result;
  }

  /**
   * Helper method to check if a step matches any of the given tool names
   */
  private matchesToolNames(step: WorkflowStep, toolNames: string[]): boolean {
    const stepIdentifiers = [
      step.toolName?.toLowerCase(),
      step.name?.toLowerCase(),
      step.id?.toLowerCase(),
    ].filter(Boolean);

    return toolNames.some((toolName) =>
      stepIdentifiers.some((identifier) =>
        identifier?.includes(toolName.toLowerCase())
      )
    );
  }

  /**
   * Extracts payment link from step output using various patterns
   */
  private extractPaymentLinkFromOutput(output: any): string | null {
    if (!output) return null;

    // Handle structured output first
    if (typeof output === 'object' && output.payment_link) {
      console.log(
        '💳 Found payment_link in structured output:',
        output.payment_link
      );
      return output.payment_link;
    }

    const outputString =
      typeof output === 'string' ? output : JSON.stringify(output);

    console.log(
      '💳 Searching for payment link in output:',
      outputString.substring(0, 200) + '...'
    );

    for (const pattern of this.PAYMENT_LINK_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      const matches = outputString.match(pattern);
      if (matches && matches.length > 0) {
        console.log('💳 Pattern matched:', pattern, 'Results:', matches);
        // Return the first valid Stripe checkout link
        for (const match of matches) {
          let cleanLink = match;

          // If it's a capture group result, extract the captured part
          if (match.includes('"payment_link":')) {
            const linkMatch = match.match(/"payment_link":\s*"([^"]+)"/);
            if (linkMatch) cleanLink = linkMatch[1];
          }

          // Remove any leading non-http characters
          cleanLink = cleanLink.replace(/^[^h]*/, '');

          if (cleanLink.includes('checkout.stripe.com')) {
            console.log('✅ Valid Stripe link found:', cleanLink);
            return cleanLink;
          }
        }
      }
    }

    console.log('❌ No payment link found in output');
    return null;
  }

  /**
   * Extracts blockchain hash from step output using various patterns
   */
  private extractBlockchainHashFromOutput(output: any): string | null {
    if (!output) return null;

    const outputString =
      typeof output === 'string' ? output : JSON.stringify(output);

    for (const pattern of this.BLOCKCHAIN_HASH_PATTERNS) {
      const matches = outputString.match(pattern);
      if (matches && matches.length > 0) {
        // Return the first valid hash (64 hex characters)
        for (const match of matches) {
          const cleanHash = match.replace(/^0x/, ''); // Remove 0x prefix for validation
          if (/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
            return cleanHash.startsWith('0x') ? cleanHash : `0x${cleanHash}`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extracts email address from step output using various patterns
   */
  private extractEmailFromOutput(output: any): string | null {
    if (!output) return null;

    const outputString =
      typeof output === 'string' ? output : JSON.stringify(output);

    // Enhanced email patterns
    const enhancedEmailPatterns = [
      ...this.EMAIL_PATTERNS,
      /buyer_email['":\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
      /"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"/gi,
      /for\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
      /to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    ];

    for (const pattern of enhancedEmailPatterns) {
      pattern.lastIndex = 0; // Reset regex
      const matches = outputString.match(pattern);
      if (matches && matches.length > 0) {
        // Return the first valid email address
        for (const match of matches) {
          let email = match;

          // Extract email from various formats
          if (match.includes(':')) {
            email = match.split(':').pop()?.trim() || '';
          }
          if (match.includes('"')) {
            const quotedMatch = match.match(/"([^"]+)"/);
            if (quotedMatch) email = quotedMatch[1];
          }
          if (match.includes(' ')) {
            const spaceMatch = match.match(
              /\s([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
            );
            if (spaceMatch) email = spaceMatch[1];
          }

          // Clean up the email
          email = email.replace(/['",:;\s]/g, '').trim();

          if (email && this.isValidEmail(email)) {
            return email;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extracts order details from step output using various patterns
   */
  private extractOrderDetailsFromOutput(output: any): {
    model: string;
    quantity: number;
    deliveryLocation: string;
    totalAmount: string;
  } {
    const defaults = {
      model: 'Unknown Model',
      quantity: 1,
      deliveryLocation: 'Unknown Location',
      totalAmount: '$0.00',
    };

    if (!output) return defaults;

    const outputString =
      typeof output === 'string' ? output : JSON.stringify(output);

    // Try to parse as JSON first for structured data
    try {
      const parsed =
        typeof output === 'object' ? output : JSON.parse(outputString);

      return {
        model:
          parsed.model ||
          parsed.product ||
          parsed.item ||
          parsed.buyer_email?.split('-')[1] ||
          defaults.model,
        quantity:
          parseInt(parsed.quantity || parsed.qty || parsed.amount) ||
          defaults.quantity,
        deliveryLocation:
          parsed.delivery_location ||
          parsed.location ||
          parsed.address ||
          parsed.destination ||
          parsed.buyer_email?.split('-')[2] ||
          defaults.deliveryLocation,
        totalAmount:
          parsed.total_amount ||
          parsed.total ||
          parsed.price ||
          parsed.cost ||
          parsed.total_payable ||
          defaults.totalAmount,
      };
    } catch {
      // Enhanced regex patterns for unstructured text

      // Extract model/product with more patterns
      let model =
        this.extractOrderField(outputString, [
          /(?:model|product|item)[:\s]+([^,\n]+)/i,
          /(Lamborghini\s+Aventador)(?:\s+for|\s+to|,|\.|\s*$)/i,
          /(Ferrari\s+[A-Za-z0-9]+)(?:\s+for|\s+to|,|\.|\s*$)/i,
          /(Porsche\s+[A-Za-z0-9]+)(?:\s+for|\s+to|,|\.|\s*$)/i,
          /(BMW\s+[A-Za-z0-9]+)(?:\s+for|\s+to|,|\.|\s*$)/i,
          /(Mercedes\s+[A-Za-z0-9\s]+)(?:\s+for|\s+to|,|\.|\s*$)/i,
          /(Audi\s+[A-Za-z0-9\s]+)(?:\s+for|\s+to|,|\.|\s*$)/i,
          /Order\s+placed:\s*\d+x?\s*([^,\s]+(?:\s+[^,\s]+)*?)(?:\s+for|\s+to|,)/i,
          /(\d+x?\s*[A-Z][a-zA-Z\s]+(?:Aventador|Ferrari|Porsche|BMW|Mercedes|Audi))(?:\s+for|\s+to|,)/i,
        ]) || defaults.model;

      // Extract quantity with more patterns
      const quantityMatch = this.extractWithPattern(outputString, [
        /quantity[:\s]+(\d+)/i,
        /qty[:\s]+(\d+)/i,
        /(\d+)\s*x\s*[A-Z]/i,
        /(\d+)\s+units?/i,
        /Order\s+placed:\s*(\d+)x/i,
      ]);
      const quantity = quantityMatch
        ? parseInt(quantityMatch)
        : defaults.quantity;

      // Extract delivery location with more patterns
      let deliveryLocation =
        this.extractOrderField(outputString, [
          /(?:delivery[_\s]*location|location|delivering?\s+(?:to|in))[:\s]+([^,\n]+)/i,
          /to\s+([A-Z][a-zA-Z\s]+)(?:\.|,|$)/i,
          /in\s+([A-Z][a-zA-Z\s]+)(?:\.|,|$)/i,
          /(London|New York|Paris|Tokyo|Berlin|Los Angeles|Chicago|Miami)/i,
        ]) || defaults.deliveryLocation;

      // Extract total amount with more patterns
      let totalAmount =
        this.extractOrderField(outputString, [
          /(?:total[_\s]*(?:amount|payable|cost)|total|price|cost)[:\s]+([A-Z]{3}\s*[\d,]+(?:\.\d{2})?)/i,
          /(\$[\d,]+(?:\.\d{2})?)/i,
          /(USD\s*[\d,]+(?:\.\d{2})?)/i,
          /(EUR\s*[\d,]+(?:\.\d{2})?)/i,
        ]) || defaults.totalAmount;

      // Clean up extracted values
      if (model && model !== defaults.model) {
        model = model.replace(/^\d+x?\s*/, '').trim(); // Remove quantity prefix
        model = model
          .replace(
            /\s+for\s+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}.*$/,
            ''
          )
          .trim(); // Remove email and everything after
        model = model.replace(/\s+to\s+[A-Z][a-zA-Z\s]+$/, '').trim(); // Remove delivery location
        model = model.replace(/[,.]$/, '').trim(); // Remove trailing punctuation
      }

      if (deliveryLocation && deliveryLocation !== defaults.deliveryLocation) {
        deliveryLocation = deliveryLocation.replace(/[.,]$/, '').trim(); // Remove trailing punctuation
      }

      return { model, quantity, deliveryLocation, totalAmount };
    }
  }

  /**
   * Helper method to extract data using regex patterns
   */
  private extractWithPattern(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      // Reset the regex lastIndex to ensure proper matching
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Helper method to extract order field data with better handling of comma-separated values
   */
  private extractOrderField(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      // Reset the regex lastIndex to ensure proper matching
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Validates email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
}

// Export a singleton instance for use throughout the application
export const workflowDataExtractor = new ComprehensiveDataExtractor();
