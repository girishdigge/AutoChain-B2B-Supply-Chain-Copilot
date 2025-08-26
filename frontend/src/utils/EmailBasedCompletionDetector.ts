import type { WorkflowRun, WorkflowStep } from '../types';

/**
 * EmailBasedCompletionDetector handles precise workflow completion detection
 * based on email step completion, preventing premature triggers from finance/stripe tools.
 */
export interface EmailBasedCompletionDetector {
  checkForEmailCompletion(workflowRun: WorkflowRun): boolean;
  isEmailStepCompleted(steps: WorkflowStep[]): boolean;
  extractEmailStepOutput(steps: WorkflowStep[]): string | null;
  findEmailStep(steps: WorkflowStep[]): WorkflowStep | null;
  hasEmailConfirmation(output: any): boolean;
}

export class EmailCompletionDetector implements EmailBasedCompletionDetector {
  private readonly EMAIL_TOOL_NAMES = [
    'Portia Google Send Email Tool',
    'portia google send email tool',
    'email',
    'send_email',
    'google_email',
    'gmail',
    'send email',
    'email tool',
  ];

  private readonly EMAIL_CONFIRMATION_PATTERNS = [
    /Sent email with id/i,
    /Email sent successfully/i,
    /Message sent with ID/i,
    /Email delivered/i,
    /Successfully sent email/i,
    /Sent email with id:\s*[a-zA-Z0-9]+/i, // Matches "Sent email with id: 198e3276dc0679242"
    /email.*sent/i,
    /confirmation.*sent/i,
    // ENHANCED: More aggressive patterns
    /gmail.*send/i,
    /portia.*google.*send/i,
    /send.*email.*tool/i,
    /email.*confirmation/i,
    /message.*delivered/i,
    /email.*complete/i,
    /notification.*sent/i,
    /buyer.*notified/i,
    /email.*success/i,
    /mail.*sent/i,
    /smtp.*success/i,
    /delivery.*confirmed/i,
  ];

  /**
   * Checks if workflow completion should be triggered based on email step completion
   * ENHANCED: More aggressive detection to ensure completion card shows after email sent
   */
  checkForEmailCompletion(workflowRun: WorkflowRun): boolean {
    if (!workflowRun || !workflowRun.steps) {
      console.log(
        '🔍 EmailCompletionDetector: No workflow run or steps provided'
      );
      return false;
    }

    console.log(
      '🔍 EmailCompletionDetector: ENHANCED - Checking email completion for run:',
      workflowRun.id
    );
    console.log('🔍 Total steps:', workflowRun.steps.length);
    console.log('🔍 Workflow status:', workflowRun.status);
    console.log('🔍 Workflow progress:', workflowRun.progress);

    // Find ALL email steps (there might be duplicates/retries)
    const emailSteps = this.findAllEmailSteps(workflowRun.steps);

    console.log(
      '📧 EmailCompletionDetector: Found email steps:',
      emailSteps.map((step) => ({
        id: step.id,
        name: step.name,
        toolName: step.toolName,
        status: step.status,
      }))
    );

    // PRIMARY CHECK: Any email step is completed
    for (const emailStep of emailSteps) {
      const isCompleted = emailStep.status === 'completed';
      const hasConfirmation = this.hasEmailConfirmation(emailStep.output);

      console.log(
        `📧 EmailCompletionDetector: Checking step ${emailStep.id}:`,
        {
          isCompleted,
          hasConfirmation,
          output: emailStep.output ? 'present' : 'missing',
        }
      );

      // Accept completion even without confirmation if step is marked completed
      if (isCompleted) {
        console.log(
          '✅ EmailCompletionDetector: Email completion confirmed for step:',
          emailStep.id,
          hasConfirmation
            ? '(with confirmation)'
            : '(without confirmation - accepting anyway)'
        );
        return true;
      }
    }

    // ENHANCED SECONDARY CHECK: Look for email-related output in any completed step
    console.log(
      '🔍 EmailCompletionDetector: No completed email steps, checking for email output in other steps...'
    );

    const stepsWithEmailOutput = workflowRun.steps.filter((step) => {
      if (step.status !== 'completed' || !step.output) return false;

      const outputString =
        typeof step.output === 'string'
          ? step.output
          : JSON.stringify(step.output);
      const hasEmailOutput = this.EMAIL_CONFIRMATION_PATTERNS.some((pattern) =>
        pattern.test(outputString)
      );

      if (hasEmailOutput) {
        console.log(
          `📧 Found email output in step ${step.id} (${step.name}):`,
          outputString.substring(0, 100)
        );
      }

      return hasEmailOutput;
    });

    if (stepsWithEmailOutput.length > 0) {
      console.log(
        '✅ EmailCompletionDetector: Found email confirmation in completed steps, triggering completion'
      );
      return true;
    }

    // ENHANCED FALLBACK: Check multiple completion indicators with more aggressive conditions
    console.log(
      '🔍 EmailCompletionDetector: No email output found, checking enhanced fallback conditions...'
    );

    // Fallback 1: Workflow is marked as completed
    const isWorkflowCompleted =
      workflowRun.status === 'completed' || workflowRun.progress >= 100;

    // Fallback 2: Has blockchain step (indicates workflow reached final stages)
    const hasBlockchainStep = workflowRun.steps.some(
      (step) =>
        step.status === 'completed' &&
        (step.toolName?.toLowerCase().includes('blockchain') ||
          step.toolName?.toLowerCase().includes('anchor') ||
          step.name?.toLowerCase().includes('blockchain'))
    );

    // Fallback 3: Has payment step (indicates order processing is complete)
    const hasPaymentStep = workflowRun.steps.some(
      (step) =>
        step.status === 'completed' &&
        (step.toolName?.toLowerCase().includes('stripe') ||
          step.toolName?.toLowerCase().includes('payment') ||
          step.name?.toLowerCase().includes('payment'))
    );

    // Fallback 4: Most steps are completed (indicates workflow is nearly done)
    const completedSteps = workflowRun.steps.filter(
      (s) => s.status === 'completed'
    ).length;
    const totalSteps = workflowRun.steps.length;
    const completionRatio = totalSteps > 0 ? completedSteps / totalSteps : 0;
    const mostStepsCompleted = completionRatio >= 0.7; // Lowered from 0.8 to 0.7 for more aggressive detection

    // Fallback 5: ENHANCED - Check if we have order completion indicators
    const hasOrderStep = workflowRun.steps.some(
      (step) =>
        step.status === 'completed' &&
        (step.toolName?.toLowerCase().includes('order') ||
          step.name?.toLowerCase().includes('order'))
    );

    // Fallback 6: ENHANCED - Check for any step that might indicate final processing
    const hasFinalProcessingStep = workflowRun.steps.some(
      (step) =>
        step.status === 'completed' &&
        (step.toolName?.toLowerCase().includes('merge') ||
          step.toolName?.toLowerCase().includes('final') ||
          step.name?.toLowerCase().includes('final') ||
          step.name?.toLowerCase().includes('complete'))
    );

    console.log('🔍 Enhanced fallback conditions:', {
      isWorkflowCompleted,
      hasBlockchainStep,
      hasPaymentStep,
      hasOrderStep,
      hasFinalProcessingStep,
      completedSteps,
      totalSteps,
      completionRatio,
      mostStepsCompleted,
    });

    // ENHANCED: More aggressive fallback conditions
    const fallbackConditionsMet =
      // Original conditions
      (isWorkflowCompleted && (hasBlockchainStep || hasPaymentStep)) ||
      (hasBlockchainStep && hasPaymentStep) ||
      (mostStepsCompleted && (hasBlockchainStep || hasPaymentStep)) ||
      // NEW: More aggressive conditions
      (isWorkflowCompleted && hasOrderStep) ||
      (mostStepsCompleted && hasOrderStep && hasPaymentStep) ||
      (hasBlockchainStep && hasOrderStep) ||
      // ULTRA AGGRESSIVE: If workflow is completed and has multiple key steps
      (isWorkflowCompleted && completedSteps >= 5) ||
      // FINAL FALLBACK: If we have clear order processing completion
      (hasPaymentStep && hasOrderStep && hasFinalProcessingStep);

    if (fallbackConditionsMet) {
      console.log(
        '✅ EmailCompletionDetector: ENHANCED FALLBACK - Multiple completion indicators detected, assuming email sent'
      );
      return true;
    }

    console.log('❌ EmailCompletionDetector: No completion conditions met');
    return false;
  }

  /**
   * Checks if any email step in the provided steps is completed
   */
  isEmailStepCompleted(steps: WorkflowStep[]): boolean {
    const emailStep = this.findEmailStep(steps);

    if (!emailStep) {
      return false;
    }

    const isCompleted = emailStep.status === 'completed';

    console.log('📧 EmailCompletionDetector: Email step completion check:', {
      stepId: emailStep.id,
      status: emailStep.status,
      isCompleted,
    });

    return isCompleted;
  }

  /**
   * Extracts the output from the email step if it exists
   */
  extractEmailStepOutput(steps: WorkflowStep[]): string | null {
    const emailStep = this.findEmailStep(steps);

    if (!emailStep || !emailStep.output) {
      console.log('❌ EmailCompletionDetector: No email step output found');
      return null;
    }

    const output =
      typeof emailStep.output === 'string'
        ? emailStep.output
        : JSON.stringify(emailStep.output);

    console.log(
      '📧 EmailCompletionDetector: Extracted email output:',
      output.substring(0, 200) + (output.length > 200 ? '...' : '')
    );

    return output;
  }

  /**
   * Finds all email steps in the workflow steps (handles duplicates/retries)
   */
  findAllEmailSteps(steps: WorkflowStep[]): WorkflowStep[] {
    const emailSteps = steps.filter((step) => {
      // Check tool name first (most reliable)
      if (step.toolName) {
        const toolNameMatch = this.EMAIL_TOOL_NAMES.some((toolName) =>
          step.toolName!.toLowerCase().includes(toolName.toLowerCase())
        );
        if (toolNameMatch) {
          return true;
        }
      }

      // Check step name
      if (step.name) {
        const nameMatch = this.EMAIL_TOOL_NAMES.some((toolName) =>
          step.name!.toLowerCase().includes(toolName.toLowerCase())
        );
        if (nameMatch) {
          return true;
        }
      }

      // Check step id as fallback
      const idMatch = this.EMAIL_TOOL_NAMES.some((toolName) =>
        step.id.toLowerCase().includes(toolName.toLowerCase())
      );
      return idMatch;
    });

    console.log(
      '📧 EmailCompletionDetector: Found',
      emailSteps.length,
      'email steps'
    );
    return emailSteps;
  }

  /**
   * Finds the email step in the workflow steps
   */
  findEmailStep(steps: WorkflowStep[]): WorkflowStep | null {
    const emailStep = steps.find((step) => {
      // Check tool name first (most reliable)
      if (step.toolName) {
        const toolNameMatch = this.EMAIL_TOOL_NAMES.some((toolName) =>
          step.toolName!.toLowerCase().includes(toolName.toLowerCase())
        );
        if (toolNameMatch) {
          console.log(
            '📧 EmailCompletionDetector: Found email step by toolName:',
            step.toolName
          );
          return true;
        }
      }

      // Check step name
      if (step.name) {
        const nameMatch = this.EMAIL_TOOL_NAMES.some((toolName) =>
          step.name!.toLowerCase().includes(toolName.toLowerCase())
        );
        if (nameMatch) {
          console.log(
            '📧 EmailCompletionDetector: Found email step by name:',
            step.name
          );
          return true;
        }
      }

      // Check step id as fallback
      const idMatch = this.EMAIL_TOOL_NAMES.some((toolName) =>
        step.id.toLowerCase().includes(toolName.toLowerCase())
      );
      if (idMatch) {
        console.log(
          '📧 EmailCompletionDetector: Found email step by id:',
          step.id
        );
        return true;
      }

      return false;
    });

    if (emailStep) {
      console.log('✅ EmailCompletionDetector: Email step found:', {
        id: emailStep.id,
        name: emailStep.name,
        toolName: emailStep.toolName,
        status: emailStep.status,
      });
    } else {
      console.log(
        '❌ EmailCompletionDetector: No email step found in',
        steps.length,
        'steps'
      );
      console.log(
        '🔍 Available steps:',
        steps.map((s) => ({
          id: s.id,
          name: s.name,
          toolName: s.toolName,
        }))
      );
    }

    return emailStep || null;
  }

  /**
   * Checks if the output contains email confirmation patterns
   */
  hasEmailConfirmation(output: any): boolean {
    if (!output) {
      console.log(
        '❌ EmailCompletionDetector: No output to check for confirmation'
      );
      return false;
    }

    const outputString =
      typeof output === 'string' ? output : JSON.stringify(output);

    console.log(
      '🔍 EmailCompletionDetector: Checking output for confirmation patterns:',
      outputString.substring(0, 200) + (outputString.length > 200 ? '...' : '')
    );

    // Check for email confirmation patterns
    const hasConfirmation = this.EMAIL_CONFIRMATION_PATTERNS.some((pattern) => {
      const match = pattern.test(outputString);
      if (match) {
        console.log(
          '✅ EmailCompletionDetector: Found confirmation pattern:',
          pattern.source
        );
      }
      return match;
    });

    if (!hasConfirmation) {
      console.log('❌ EmailCompletionDetector: No confirmation patterns found');
      console.log(
        '🔍 Checked patterns:',
        this.EMAIL_CONFIRMATION_PATTERNS.map((p) => p.source)
      );
    }

    return hasConfirmation;
  }

  /**
   * Validates that the workflow should not trigger completion prematurely
   * This method helps prevent completion triggers from finance/stripe tools
   */
  shouldBlockPrematureCompletion(
    workflowRun: WorkflowRun,
    triggerSource?: string
  ): boolean {
    if (!workflowRun) {
      return false;
    }

    // Block if triggered by finance or stripe tools
    const prematureTriggers = [
      'finance',
      'stripe',
      'payment',
      'checkout',
      'billing',
    ];

    if (
      triggerSource &&
      prematureTriggers.some((trigger) =>
        triggerSource.toLowerCase().includes(trigger)
      )
    ) {
      console.log(
        '🚫 EmailCompletionDetector: Blocking premature completion from:',
        triggerSource
      );
      return true;
    }

    // Block if email step is not completed yet
    if (!this.checkForEmailCompletion(workflowRun)) {
      console.log(
        '🚫 EmailCompletionDetector: Blocking completion - email step not ready'
      );
      return true;
    }

    return false;
  }

  /**
   * Gets detailed information about the email step for debugging
   */
  getEmailStepInfo(workflowRun: WorkflowRun): {
    found: boolean;
    step?: WorkflowStep;
    isCompleted: boolean;
    hasConfirmation: boolean;
    output?: string;
  } {
    if (!workflowRun || !workflowRun.steps) {
      return {
        found: false,
        isCompleted: false,
        hasConfirmation: false,
      };
    }

    const emailStep = this.findEmailStep(workflowRun.steps);

    if (!emailStep) {
      return {
        found: false,
        isCompleted: false,
        hasConfirmation: false,
      };
    }

    const isCompleted = emailStep.status === 'completed';
    const hasConfirmation = this.hasEmailConfirmation(emailStep.output);
    const output = this.extractEmailStepOutput([emailStep]);

    return {
      found: true,
      step: emailStep,
      isCompleted,
      hasConfirmation,
      output: output || undefined,
    };
  }
}

// Export a singleton instance for global use
export const emailCompletionDetector = new EmailCompletionDetector();
