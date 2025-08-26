import type { OrderCompletionData } from './WorkflowDataExtractor';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedData: OrderCompletionData;
}

/**
 * Validation configuration interface
 */
export interface ValidationConfig {
  requirePaymentLink?: boolean;
  requireBlockchainHash?: boolean;
  allowPartialData?: boolean;
  strictEmailValidation?: boolean;
}

/**
 * OrderCompletionDataValidator - Validates and sanitizes order completion data
 *
 * This validator ensures that:
 * - Required fields are present and valid
 * - Payment links are properly formatted Stripe URLs
 * - Blockchain hashes are valid hex strings
 * - Email addresses are properly formatted
 * - Fallback values are provided for missing data
 */
export class OrderCompletionDataValidator {
  private readonly DEFAULT_CONFIG: ValidationConfig = {
    requirePaymentLink: false, // Don't require by default to allow partial completion
    requireBlockchainHash: false, // Don't require by default
    allowPartialData: true, // Allow partial data for better UX
    strictEmailValidation: true,
  };

  /**
   * Validates order completion data with comprehensive checks
   */
  validate(
    data: OrderCompletionData,
    config: ValidationConfig = {}
  ): ValidationResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔍 OrderCompletionDataValidator: Starting validation', {
      orderId: data.orderId,
      hasPaymentLink: !!data.paymentLink,
      hasBlockchainHash: !!data.blockchainTxHash,
      config: finalConfig,
    });

    // Create a copy of the data for validation and sanitization
    const validatedData: OrderCompletionData = { ...data };

    // Validate Order ID
    const orderIdValidation = this.validateOrderId(validatedData.orderId);
    if (!orderIdValidation.isValid) {
      errors.push(...orderIdValidation.errors);
      warnings.push(...orderIdValidation.warnings);
      validatedData.orderId = orderIdValidation.sanitizedValue;
    }

    // Validate Buyer Email
    const emailValidation = this.validateBuyerEmail(
      validatedData.buyerEmail,
      finalConfig.strictEmailValidation
    );
    if (!emailValidation.isValid) {
      if (finalConfig.strictEmailValidation) {
        errors.push(...emailValidation.errors);
      } else {
        warnings.push(...emailValidation.warnings);
      }
      validatedData.buyerEmail = emailValidation.sanitizedValue;
    }

    // Validate Payment Link
    const paymentValidation = this.validatePaymentLink(
      validatedData.paymentLink,
      finalConfig.requirePaymentLink
    );
    if (!paymentValidation.isValid) {
      if (finalConfig.requirePaymentLink) {
        errors.push(...paymentValidation.errors);
      } else {
        warnings.push(...paymentValidation.warnings);
      }
      validatedData.paymentLink = paymentValidation.sanitizedValue;
    }

    // Validate Blockchain Hash
    const blockchainValidation = this.validateBlockchainHash(
      validatedData.blockchainTxHash,
      finalConfig.requireBlockchainHash
    );
    if (!blockchainValidation.isValid) {
      if (finalConfig.requireBlockchainHash) {
        errors.push(...blockchainValidation.errors);
      } else {
        warnings.push(...blockchainValidation.warnings);
      }
      validatedData.blockchainTxHash = blockchainValidation.sanitizedValue;
    }

    // Validate Order Details
    const orderDetailsValidation = this.validateOrderDetails({
      model: validatedData.model,
      quantity: validatedData.quantity,
      deliveryLocation: validatedData.deliveryLocation,
      totalAmount: validatedData.totalAmount,
    });
    if (!orderDetailsValidation.isValid) {
      warnings.push(...orderDetailsValidation.warnings);
      Object.assign(validatedData, orderDetailsValidation.sanitizedValue);
    }

    // Validate Email Confirmation ID (optional)
    if (validatedData.emailConfirmationId) {
      const emailConfirmationValidation = this.validateEmailConfirmationId(
        validatedData.emailConfirmationId
      );
      if (!emailConfirmationValidation.isValid) {
        warnings.push(...emailConfirmationValidation.warnings);
        validatedData.emailConfirmationId =
          emailConfirmationValidation.sanitizedValue;
      }
    }

    // Check if we have enough data to show completion card
    const hasMinimumData = this.hasMinimumRequiredData(
      validatedData,
      finalConfig
    );
    if (!hasMinimumData.isValid) {
      if (!finalConfig.allowPartialData) {
        errors.push(...hasMinimumData.errors);
      } else {
        warnings.push(...hasMinimumData.warnings);
      }
    }

    const isValid = errors.length === 0;

    console.log('✅ OrderCompletionDataValidator: Validation complete', {
      isValid,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      hasPaymentLink: !!validatedData.paymentLink,
      hasBlockchainHash: !!validatedData.blockchainTxHash,
    });

    return {
      isValid,
      errors,
      warnings,
      validatedData,
    };
  }

  /**
   * Validates order ID
   */
  private validateOrderId(orderId: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedValue: string;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = orderId;

    if (!orderId || typeof orderId !== 'string') {
      errors.push('Order ID is required and must be a string');
      sanitizedValue = `order-${Date.now()}`;
    } else if (orderId.trim().length === 0) {
      errors.push('Order ID cannot be empty');
      sanitizedValue = `order-${Date.now()}`;
    } else if (orderId.length < 3) {
      warnings.push('Order ID is unusually short');
      sanitizedValue = orderId.trim();
    } else {
      sanitizedValue = orderId.trim();
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue,
    };
  }

  /**
   * Validates buyer email address
   */
  private validateBuyerEmail(
    email: string,
    strict: boolean = true
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedValue: string;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = email;

    if (!email || typeof email !== 'string') {
      const message = 'Buyer email is required';
      if (strict) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
      sanitizedValue = 'buyer@example.com';
    } else {
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailRegex.test(trimmedEmail)) {
        const message = `Invalid email format: ${email}`;
        if (strict) {
          errors.push(message);
        } else {
          warnings.push(message);
        }
        sanitizedValue = 'buyer@example.com';
      } else if (trimmedEmail === 'buyer@example.com') {
        warnings.push(
          'Using fallback email address - actual buyer email not found'
        );
        sanitizedValue = trimmedEmail;
      } else {
        sanitizedValue = trimmedEmail;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue,
    };
  }

  /**
   * Validates payment link
   */
  private validatePaymentLink(
    paymentLink: string | null,
    required: boolean = false
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedValue: string | null;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = paymentLink;

    if (!paymentLink) {
      const message = 'Payment link is not available';
      if (required) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
      sanitizedValue = null;
    } else if (typeof paymentLink !== 'string') {
      const message = 'Payment link must be a string';
      if (required) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
      sanitizedValue = null;
    } else {
      const trimmedLink = paymentLink.trim();

      // Check if it's a valid Stripe checkout URL
      const stripeUrlRegex =
        /^https:\/\/checkout\.stripe\.com\/(c\/)?pay\/[a-zA-Z0-9_-]+/;

      if (!stripeUrlRegex.test(trimmedLink)) {
        const message = `Invalid payment link format: ${trimmedLink}`;
        if (required) {
          errors.push(message);
        } else {
          warnings.push(message);
        }

        // Check if it's a demo/test link
        if (trimmedLink.includes('demo') || trimmedLink.includes('test')) {
          warnings.push('Payment link appears to be a demo/test link');
        }

        sanitizedValue = trimmedLink; // Keep the original link even if invalid
      } else {
        sanitizedValue = trimmedLink;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue,
    };
  }

  /**
   * Validates blockchain transaction hash
   */
  private validateBlockchainHash(
    hash: string | null,
    required: boolean = false
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedValue: string | null;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = hash;

    if (!hash) {
      const message = 'Blockchain transaction hash is not available';
      if (required) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
      sanitizedValue = null;
    } else if (typeof hash !== 'string') {
      const message = 'Blockchain hash must be a string';
      if (required) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
      sanitizedValue = null;
    } else {
      let trimmedHash = hash.trim();

      // Remove 0x prefix for validation
      const cleanHash = trimmedHash.replace(/^0x/, '');

      // Check if it's a valid 64-character hex string
      const hashRegex = /^[a-fA-F0-9]{64}$/;

      if (!hashRegex.test(cleanHash)) {
        const message = `Invalid blockchain hash format: ${hash}`;
        if (required) {
          errors.push(message);
        } else {
          warnings.push(message);
        }

        // Check if it's a demo/test hash
        if (cleanHash.includes('1234567890abcdef') || cleanHash.length < 40) {
          warnings.push('Blockchain hash appears to be a demo/test hash');
        }

        sanitizedValue = trimmedHash; // Keep the original hash even if invalid
      } else {
        // Ensure it has 0x prefix
        sanitizedValue = trimmedHash.startsWith('0x')
          ? trimmedHash
          : `0x${trimmedHash}`;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue,
    };
  }

  /**
   * Validates order details (model, quantity, location, amount)
   */
  private validateOrderDetails(details: {
    model: string;
    quantity: number;
    deliveryLocation: string;
    totalAmount: string;
  }): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedValue: {
      model: string;
      quantity: number;
      deliveryLocation: string;
      totalAmount: string;
    };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedValue = { ...details };

    // Validate model
    if (!details.model || details.model === 'Unknown Model') {
      warnings.push('Product model not specified');
      sanitizedValue.model = 'Product';
    } else if (typeof details.model !== 'string') {
      warnings.push('Product model should be a string');
      sanitizedValue.model = String(details.model);
    }

    // Validate quantity
    if (
      !details.quantity ||
      !Number.isInteger(details.quantity) ||
      details.quantity < 1
    ) {
      warnings.push('Invalid quantity, defaulting to 1');
      sanitizedValue.quantity = 1;
    } else if (details.quantity > 1000) {
      warnings.push('Unusually high quantity');
    }

    // Validate delivery location
    if (
      !details.deliveryLocation ||
      details.deliveryLocation === 'Unknown Location'
    ) {
      warnings.push('Delivery location not specified');
      sanitizedValue.deliveryLocation = 'Location TBD';
    } else if (typeof details.deliveryLocation !== 'string') {
      warnings.push('Delivery location should be a string');
      sanitizedValue.deliveryLocation = String(details.deliveryLocation);
    }

    // Validate total amount
    if (!details.totalAmount || details.totalAmount === '$0.00') {
      warnings.push('Total amount not specified');
      sanitizedValue.totalAmount = 'Amount TBD';
    } else if (typeof details.totalAmount !== 'string') {
      warnings.push('Total amount should be a string');
      sanitizedValue.totalAmount = String(details.totalAmount);
    } else {
      // Check if it looks like a valid currency amount
      const currencyRegex =
        /^[A-Z]{3}\s*[\d,]+(?:\.\d{2})?$|^\$[\d,]+(?:\.\d{2})?$/;
      if (!currencyRegex.test(details.totalAmount.trim())) {
        warnings.push(
          `Total amount format may be invalid: ${details.totalAmount}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue,
    };
  }

  /**
   * Validates email confirmation ID
   */
  private validateEmailConfirmationId(confirmationId: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedValue: string | undefined;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue: string | undefined = confirmationId;

    if (!confirmationId || typeof confirmationId !== 'string') {
      warnings.push('Email confirmation ID is invalid');
      sanitizedValue = undefined;
    } else if (confirmationId.trim().length === 0) {
      warnings.push('Email confirmation ID is empty');
      sanitizedValue = undefined;
    } else {
      sanitizedValue = confirmationId.trim();
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue,
    };
  }

  /**
   * Checks if the data has minimum required information to show completion card
   */
  private hasMinimumRequiredData(
    data: OrderCompletionData,
    config: ValidationConfig
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if we have at least order ID and buyer email
    if (!data.orderId || data.orderId.startsWith('order-')) {
      warnings.push('Order ID is missing or using fallback value');
    }

    if (!data.buyerEmail || data.buyerEmail === 'buyer@example.com') {
      warnings.push('Buyer email is missing or using fallback value');
    }

    // Check if we have at least one actionable item (payment link or blockchain hash)
    const hasPaymentLink =
      data.paymentLink && data.paymentLink.includes('checkout.stripe.com');
    const hasBlockchainHash =
      data.blockchainTxHash && data.blockchainTxHash.length >= 40;

    if (!hasPaymentLink && !hasBlockchainHash) {
      const message =
        'No actionable items available (no valid payment link or blockchain hash)';
      if (config.allowPartialData) {
        warnings.push(message);
      } else {
        errors.push(message);
      }
    }

    // Check order details
    const hasOrderDetails =
      data.model !== 'Unknown Model' &&
      data.model !== 'Product' &&
      data.deliveryLocation !== 'Unknown Location' &&
      data.deliveryLocation !== 'Location TBD' &&
      data.totalAmount !== '$0.00' &&
      data.totalAmount !== 'Amount TBD';

    if (!hasOrderDetails) {
      warnings.push('Order details are incomplete or using fallback values');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Creates a partial completion card data with fallback values
   */
  createPartialCompletionData(
    originalData: Partial<OrderCompletionData>,
    workflowId: string
  ): OrderCompletionData {
    console.log('🔧 Creating partial completion data with fallbacks');

    return {
      orderId: originalData.orderId || `workflow-${workflowId}`,
      model: originalData.model || 'Product',
      quantity: originalData.quantity || 1,
      deliveryLocation: originalData.deliveryLocation || 'Location TBD',
      totalAmount: originalData.totalAmount || 'Amount TBD',
      paymentLink: originalData.paymentLink || null,
      blockchainTxHash: originalData.blockchainTxHash || null,
      buyerEmail: originalData.buyerEmail || 'buyer@example.com',
      emailConfirmationId: originalData.emailConfirmationId,
    };
  }
}

// Export a singleton instance
export const orderCompletionDataValidator = new OrderCompletionDataValidator();
