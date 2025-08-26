import { useCallback, useEffect } from 'react';
import { toast } from '../lib/toast';
import { useAppState } from '../context/AppStateContext';
import { usePortiaSocket } from './usePortiaSocket';
import type {
  ProcessingStarted,
  StepUpdate,
  ClarificationRequest,
  ClarificationResponse,
  PhaseTransition,
  PaymentLinkEvent,
  BlockchainTxEvent,
  FinalOutputEvent,
  ErrorEvent,
  WorkflowRun,
  WorkflowStep,
  LogEntry,
  BlockchainTransaction,
} from '../types';

interface UseWebSocketEventHandlersOptions {
  socket: ReturnType<typeof usePortiaSocket>;
}

export const useWebSocketEventHandlers = ({
  socket,
}: UseWebSocketEventHandlersOptions) => {
  const {
    state,
    updateWebSocketState,
    updateOrder,
    addWorkflowRun,
    updateWorkflowRun,
    selectWorkflowRun,
    addLogEntry,
    addBlockchainTransaction,
    updateBlockchainTransaction,
  } = useAppState();

  // Global event counter for debugging
  let eventCounter = 0;

  // Helper to create log entries
  const createLogEntry = useCallback(
    (level: LogEntry['level'], message: string, metadata?: any): LogEntry => ({
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
    }),
    []
  );

  // Helper to find or create workflow run
  const getOrCreateWorkflowRun = useCallback(
    (runId: string, orderId?: string): WorkflowRun => {
      const existing = state.workflow.activeRuns[runId];
      if (existing) return existing;

      const newRun: WorkflowRun = {
        id: runId,
        orderId: orderId || 'unknown',
        status: 'pending',
        steps: [],
        startTime: new Date().toISOString(),
        totalSteps: 0,
        completedSteps: 0,
        progress: 0,
      };

      addWorkflowRun(newRun);
      return newRun;
    },
    [state.workflow.activeRuns, addWorkflowRun]
  );

  // Processing Started Handler
  const handleProcessingStarted = useCallback(
    (data: ProcessingStarted) => {
      console.log('Processing started:', data);

      getOrCreateWorkflowRun(data.run_id, data.order_id);

      // Create initial planning step that becomes active immediately
      const planningStep: WorkflowStep = {
        id: 'planning',
        name: 'Planning',
        status: 'active',
        startTime: new Date().toISOString(),
        logs: [],
        progress: 0,
        toolName: 'planning', // For consistency
      };

      updateWorkflowRun(data.run_id, {
        status: 'running',
        totalSteps: (data.total_steps || 0) + 1, // Add 1 for planning step
        startTime: new Date().toISOString(),
        orderId: data.order_id || 'unknown',
        steps: [planningStep],
        currentStep: 'planning',
      });

      selectWorkflowRun(data.run_id);

      addLogEntry(
        createLogEntry('info', `Processing started: ${data.message}`, {
          runId: data.run_id,
          orderId: data.order_id,
          totalSteps: data.total_steps,
        })
      );

      toast.events.orderStarted(data.order_id || data.run_id, data.message);
    },
    [
      getOrCreateWorkflowRun,
      updateWorkflowRun,
      selectWorkflowRun,
      addLogEntry,
      createLogEntry,
    ]
  );

  // Helper to map tool names to step IDs
  const mapToolNameToStepId = useCallback((toolName: string): string => {
    console.log('🗺️ Mapping tool name:', toolName);

    const toolMappings: Record<string, string> = {
      OrderExtractionTool: 'extraction',
      ValidatorTool: 'validation',
      'Inventory Check Tool': 'inventory',
      'Pricing Calculator': 'pricing',
      'Supplier Quote Tool': 'supplier',
      LogisticsShippingTool: 'logistics',
      FinanceAndPaymentTool: 'finance',
      ClarificationTool: 'confirmation',
      StripePaymentTool: 'payment',
      'Order Tool': 'order',
      'Blockchain Anchor Tool': 'blockchain',
      'Portia Google Send Email Tool': 'email',
      'Merge Fields Tool': 'merge',
    };

    // Try exact match first
    if (toolMappings[toolName]) {
      console.log(
        '✅ Exact match found:',
        toolName,
        '->',
        toolMappings[toolName]
      );
      return toolMappings[toolName];
    }

    // Try partial matches for flexibility
    const lowerToolName = toolName.toLowerCase();
    for (const [key, value] of Object.entries(toolMappings)) {
      if (
        lowerToolName.includes(key.toLowerCase()) ||
        key.toLowerCase().includes(lowerToolName)
      ) {
        console.log('✅ Partial match found:', toolName, '->', value);
        return value;
      }
    }

    // Special handling for email step variations
    if (
      lowerToolName.includes('email') ||
      lowerToolName.includes('send email')
    ) {
      console.log('📧 Email step detected:', toolName, '-> email');
      return 'email';
    }

    // Fallback: create ID from tool name
    const fallbackId = toolName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    console.log('⚠️ Using fallback ID:', toolName, '->', fallbackId);
    return fallbackId;
  }, []);

  // Helper to get friendly step name
  const getFriendlyStepName = useCallback(
    (stepName: string, toolName?: string): string => {
      // Exact friendly names matching backend tool names
      const friendlyNames: Record<string, string> = {
        // Exact tool names from backend logs
        OrderExtractionTool: 'Order Extraction',
        ValidatorTool: 'Order Validation',
        'Merge Fields Tool': 'Data Merging',
        'Inventory Check Tool': 'Inventory Check',
        'Pricing Calculator': 'Price Calculation',
        'Supplier Quote Tool': 'Supplier Quotes',
        LogisticsShippingTool: 'Logistics Planning',
        FinanceAndPaymentTool: 'Finance Terms',
        ClarificationTool: 'User Confirmation',
        StripePaymentTool: 'Payment Processing',
        'Order Tool': 'Order Finalization',
        'Blockchain Anchor Tool': 'Blockchain Recording',
        'Portia Google Send Email Tool': 'Email Confirmation',

        // Alternative formats
        order_extraction_tool: 'Order Extraction',
        validator_tool: 'Order Validation',
        merge_fields_tool: 'Data Merging',
        inventory_tool: 'Inventory Check',
        pricing_tool: 'Price Calculation',
        supplier_tool: 'Supplier Quotes',
        logistics_tool: 'Logistics Planning',
        finance_tool: 'Finance Terms',
        clarification_tool: 'User Confirmation',
        stripe_payment_tool: 'Payment Processing',
        order_tool: 'Order Finalization',
        blockchain_anchor: 'Blockchain Recording',
        email: 'Email Confirmation',

        // Step name patterns
        'Plan generated successfully': 'Planning',
        'Waiting for user input': 'User Confirmation',
        'User input received': 'User Confirmation',
      };

      // Use tool name mapping if available
      if (toolName && friendlyNames[toolName]) {
        return friendlyNames[toolName];
      }

      // Use step name mapping if available
      if (stepName && friendlyNames[stepName]) {
        return friendlyNames[stepName];
      }

      // Special handling for email step
      if (
        stepName &&
        (stepName.toLowerCase().includes('email') || stepName === 'email')
      ) {
        return 'Email Confirmation';
      }

      // Use step name as-is if it's already friendly
      if (stepName && !stepName.includes('Tool') && !stepName.includes('_')) {
        return stepName;
      }

      // Fallback to cleaning up the step name
      return stepName
        .replace(/Tool$/, '')
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/\s+/g, ' ');
    },
    []
  );

  // Step Update Handler
  const handleStepUpdate = useCallback(
    (data: StepUpdate) => {
      console.log('🔄 Step update received:', data);

      console.log(
        '📊 Current active runs:',
        Object.keys(state.workflow.activeRuns)
      );
      console.log('🎯 Selected run:', state.workflow.selectedRun);

      // Map step to consistent ID
      let mappedStepId: string;

      // Special handling for planning step
      if (
        data.step_name === 'Plan generated successfully' ||
        data.step_name?.includes('Plan generated')
      ) {
        mappedStepId = 'planning';
      }
      // Special handling for clarification steps
      else if (
        data.step_name === 'Waiting for user input' ||
        data.step_name === 'User input received' ||
        data.tool_name === 'ClarificationTool'
      ) {
        mappedStepId = 'confirmation';
      }
      // Map tool name to step ID for consistency with frontend
      else {
        mappedStepId = data.tool_name
          ? mapToolNameToStepId(data.tool_name)
          : data.step_id;
      }

      console.log('🗺️ Step mapping details:', {
        originalStepId: data.step_id,
        toolName: data.tool_name,
        mappedStepId: mappedStepId,
        stepName: data.step_name,
        status: data.status,
      });

      // Find the workflow run that contains this step, or use the selected run
      let runId = Object.keys(state.workflow.activeRuns).find((id) => {
        const run = state.workflow.activeRuns[id];
        return run.steps.some(
          (step) => step.id === mappedStepId || step.id === data.step_id
        );
      });

      // If no run found with this step, use the selected run or create a new one
      if (!runId) {
        console.log(
          '🔍 No run found with this step, looking for alternatives...'
        );
        runId =
          state.workflow.selectedRun ||
          Object.keys(state.workflow.activeRuns)[0];

        console.log('🎯 Using fallback run ID:', runId);

        // If still no run found, create a new one based on the step update
        if (!runId) {
          console.log(
            '🆕 No workflow run found, creating new one for step:',
            data.step_id
          );
          runId = `workflow-${Date.now()}`;

          // Create a new workflow run
          const newRun: WorkflowRun = {
            id: runId,
            orderId: 'auto-created',
            status: 'running',
            steps: [],
            startTime: new Date().toISOString(),
            totalSteps: 15, // Estimated based on typical workflow
            completedSteps: 0,
            progress: 0,
          };

          console.log('🚀 Creating new workflow run:', newRun);
          addWorkflowRun(newRun);
          selectWorkflowRun(runId);

          addLogEntry(
            createLogEntry(
              'info',
              `Auto-created workflow run for step: ${data.step_name}`,
              {
                runId: runId,
                stepId: data.step_id,
                stepName: data.step_name,
              }
            )
          );
        }
      }

      const run = state.workflow.activeRuns[runId];
      if (!run) {
        console.error('❌ Workflow run not found after all attempts:', runId);
        console.error(
          'Available runs:',
          Object.keys(state.workflow.activeRuns)
        );
        return;
      }

      console.log(
        '✅ Using workflow run:',
        runId,
        'with',
        run.steps.length,
        'existing steps'
      );

      console.log(
        '🔍 Looking for existing step with ID:',
        mappedStepId,
        'or',
        data.step_id
      );
      console.log(
        '📋 Current steps:',
        run.steps.map((s) => ({ id: s.id, name: s.name, status: s.status }))
      );

      // Find existing step - prioritize tool name matching to prevent duplicates
      const existingStepIndex = run.steps.findIndex((step) => {
        // 1. If we have a tool name, match by tool name (most reliable)
        if (data.tool_name && step.toolName === data.tool_name) {
          console.log(
            `✅ Found same tool name match: ${data.tool_name} (existing step: ${step.id})`
          );
          return true;
        }

        // 2. Exact mapped ID match
        if (step.id === mappedStepId) {
          console.log(`✅ Found exact mapped ID match: ${step.id}`);
          return true;
        }

        // 3. For steps without tool names, try ID matching
        if (!data.tool_name && step.id === data.step_id) {
          console.log(`✅ Found step ID match: ${data.step_id}`);
          return true;
        }

        return false;
      });

      // Additional check: if this is a "completed" event but we don't have a matching step,
      // it might be out of order. Look for any step with the same mapped ID regardless of status
      if (existingStepIndex === -1 && data.status === 'completed') {
        const outOfOrderIndex = run.steps.findIndex(
          (step) => step.id === mappedStepId
        );
        if (outOfOrderIndex >= 0) {
          console.log(
            `⚠️ Out of order completion event for existing step: ${mappedStepId}`
          );
          // Use the existing step index
          const existingStep = run.steps[outOfOrderIndex];
          run.steps[outOfOrderIndex] = {
            ...existingStep,
            status: 'completed',
            endTime: new Date().toISOString(),
            progress: 100,
            output: data.output || existingStep.output,
          };

          // Update workflow run and return early to avoid duplicate processing
          updateWorkflowRun(runId, { steps: [...run.steps] });
          return;
        }
      }

      let updatedSteps = [...run.steps];

      // Map WebSocket status to WorkflowStep status
      const mappedStatus: WorkflowStep['status'] =
        data.status === 'running' || data.status === 'started'
          ? 'active'
          : data.status === 'waiting'
          ? 'waiting'
          : data.status === 'completed'
          ? 'completed'
          : data.status === 'failed'
          ? 'failed'
          : data.status === 'skipped'
          ? 'skipped'
          : 'pending';

      console.log('🎭 Status mapping:', data.status, '->', mappedStatus);

      // Serial execution logic: When a new step starts, complete previous active step
      if (mappedStatus === 'active') {
        console.log(
          '🔄 New step started, checking for previous active steps to complete'
        );

        // Find any currently active steps (there should only be one in serial execution)
        const activeStepIndex = updatedSteps.findIndex(
          (step) => step.status === 'active'
        );
        const currentStepIndex = updatedSteps.findIndex(
          (step) => step.id === mappedStepId
        );

        // If there's an active step and it's different from the current one, complete it
        if (activeStepIndex >= 0 && activeStepIndex !== currentStepIndex) {
          console.log(
            `🔄 Completing previous active step: ${updatedSteps[activeStepIndex].id} (active -> completed)`
          );
          updatedSteps[activeStepIndex] = {
            ...updatedSteps[activeStepIndex],
            status: 'completed',
            endTime: new Date().toISOString(),
            progress: 100,
          };
        }

        // Also mark any pending steps before the current step as completed (skipped)
        if (currentStepIndex > 0) {
          for (let i = 0; i < currentStepIndex; i++) {
            if (updatedSteps[i].status === 'pending') {
              console.log(
                `🔄 Marking skipped step as completed: ${updatedSteps[i].id} (pending -> completed)`
              );
              updatedSteps[i] = {
                ...updatedSteps[i],
                status: 'completed',
                endTime: new Date().toISOString(),
                progress: 100,
              };
            }
          }
        }
      }

      if (existingStepIndex >= 0) {
        // Update existing step
        const existingStep = updatedSteps[existingStepIndex];
        console.log(
          '🔄 Updating existing step at index:',
          existingStepIndex,
          existingStep
        );

        // Don't downgrade a completed step back to active or pending
        const shouldUpdateStatus = !(
          (existingStep.status === 'completed' &&
            (mappedStatus === 'active' || mappedStatus === 'pending')) ||
          (existingStep.status === 'failed' && mappedStatus === 'active')
        );

        console.log('🔄 Step update decision:', {
          stepId: mappedStepId,
          existingStatus: existingStep.status,
          newStatus: mappedStatus,
          shouldUpdate: shouldUpdateStatus,
        });

        updatedSteps[existingStepIndex] = {
          ...existingStep,
          status: shouldUpdateStatus ? mappedStatus : existingStep.status,
          progress: data.progress_percentage ?? existingStep.progress,
          output: data.output ?? existingStep.output,
          error: data.error ?? existingStep.error,
          startTime:
            existingStep.startTime ||
            (mappedStatus === 'active' ? new Date().toISOString() : undefined),
          endTime:
            (data.status === 'completed' || data.status === 'failed') &&
            shouldUpdateStatus
              ? new Date().toISOString()
              : existingStep.endTime,
        };

        console.log(
          '✅ Updated existing step:',
          mappedStepId,
          'status:',
          shouldUpdateStatus ? mappedStatus : existingStep.status
        );
      } else {
        // Add new step - but prevent duplicates, especially for email steps
        console.log('➕ Creating new step for:', mappedStepId);

        // Double-check for email step duplicates before creating
        if (mappedStepId === 'email') {
          const existingEmailStep = updatedSteps.find(
            (step) =>
              step.id === 'email' ||
              step.id.toLowerCase().includes('email') ||
              step.name?.toLowerCase().includes('email')
          );

          if (existingEmailStep) {
            console.log(
              '📧 Preventing duplicate email step creation, updating existing:',
              existingEmailStep.id
            );
            // Update the existing email step instead
            const emailStepIndex = updatedSteps.findIndex(
              (s) => s.id === existingEmailStep.id
            );
            if (emailStepIndex >= 0) {
              updatedSteps[emailStepIndex] = {
                ...existingEmailStep,
                status: mappedStatus,
                progress:
                  data.progress_percentage ?? existingEmailStep.progress,
                output: data.output ?? existingEmailStep.output,
                endTime:
                  data.status === 'completed' || data.status === 'failed'
                    ? new Date().toISOString()
                    : existingEmailStep.endTime,
              };
            }
            console.log(
              '✅ Updated existing email step instead of creating duplicate'
            );
            // Skip creating new step
          } else {
            // Create new email step only if none exists
            const friendlyName = getFriendlyStepName(
              data.step_name,
              data.tool_name
            );
            console.log('📝 Friendly name:', friendlyName);

            const newStep: WorkflowStep = {
              id: mappedStepId,
              name: friendlyName,
              status: mappedStatus,
              startTime: new Date().toISOString(),
              logs: [],
              progress: data.progress_percentage || 0,
              output: data.output,
              error: data.error,
              toolName: data.tool_name, // Store original tool name
              endTime:
                data.status === 'completed' || data.status === 'failed'
                  ? new Date().toISOString()
                  : undefined,
            };
            updatedSteps.push(newStep);
            console.log('✅ Added new email step:', mappedStepId);
          }
        } else {
          // Create new non-email step normally
          const friendlyName = getFriendlyStepName(
            data.step_name,
            data.tool_name
          );
          console.log('📝 Friendly name:', friendlyName);

          const newStep: WorkflowStep = {
            id: mappedStepId,
            name: friendlyName,
            status: mappedStatus,
            startTime: new Date().toISOString(),
            logs: [],
            progress: data.progress_percentage || 0,
            output: data.output,
            error: data.error,
            toolName: data.tool_name, // Store original tool name
            endTime:
              data.status === 'completed' || data.status === 'failed'
                ? new Date().toISOString()
                : undefined,
          };
          updatedSteps.push(newStep);
          console.log(
            '✅ Added new step:',
            mappedStepId,
            'name:',
            friendlyName,
            'status:',
            mappedStatus
          );
        }
      }

      // Calculate overall progress
      const completedSteps = updatedSteps.filter(
        (step) => step.status === 'completed' || step.status === 'failed'
      ).length;

      const activeSteps = updatedSteps.filter(
        (step) => step.status === 'active' || step.status === 'waiting'
      );

      // Use the actual number of steps we have, but ensure we have a reasonable total
      const totalSteps = Math.max(run.totalSteps || 14, updatedSteps.length);
      const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

      // Determine current step - prefer active steps, then the most recent step
      let currentStep = run.currentStep;
      if (mappedStatus === 'active' || mappedStatus === 'waiting') {
        currentStep = mappedStepId;
      } else if (activeSteps.length > 0) {
        currentStep = activeSteps[0].id;
      }

      console.log('📊 Progress calculation:', {
        completedSteps,
        totalSteps,
        progress: Math.round(progress),
        currentStep,
        mappedStatus,
        updatedStepsCount: updatedSteps.length,
      });

      console.log('🔄 Updating workflow run with:', {
        runId,
        stepsCount: updatedSteps.length,
        completedSteps,
        progress: Math.round(progress),
        currentStep,
      });

      updateWorkflowRun(runId, {
        steps: updatedSteps,
        completedSteps,
        progress,
        currentStep,
        totalSteps,
      });

      console.log('✅ Workflow run updated successfully');

      // Check if this might be the final step and trigger completion if needed
      const completedStepsCount = updatedSteps.filter(
        (step) => step.status === 'completed'
      ).length;
      const totalStepsCount = updatedSteps.length;

      console.log('🏁 Completion check:', {
        completedSteps: completedStepsCount,
        totalSteps: totalStepsCount,
        isLastStep: completedStepsCount === totalStepsCount,
        currentStepStatus: mappedStatus,
      });

      // Only mark workflow as completed when we receive explicit final completion
      // Don't auto-complete to preserve active state visibility

      // Add log entry
      const logMessage = data.error
        ? `Step ${data.step_name} failed: ${data.error}`
        : data.status === 'waiting'
        ? `Step ${data.step_name} waiting for user input`
        : `Step ${data.step_name} ${data.status}`;

      addLogEntry(
        createLogEntry(
          data.error ? 'error' : data.status === 'waiting' ? 'warn' : 'info',
          logMessage,
          {
            stepId: data.step_id,
            stepName: data.step_name,
            status: data.status,
            executionTime: data.execution_time_ms,
            toolName: data.tool_name,
            runId: runId,
          }
        )
      );

      // Show toast for important step updates
      if (data.status === 'failed' && data.error) {
        toast.events.stepFailed(data.step_name, data.error);
      } else if (data.status === 'completed' && data.step_name) {
        // Only show completion toast for critical steps to avoid spam
        const criticalSteps = [
          'payment',
          'blockchain',
          'validation',
          'confirmation',
        ];
        if (
          criticalSteps.some((step) =>
            data.step_name.toLowerCase().includes(step)
          )
        ) {
          toast.success(`✅ ${data.step_name} Completed`, undefined, {
            duration: 3000,
          });
        }
      } else if (data.status === 'waiting') {
        toast.info(`⏳ ${data.step_name} - Waiting for input`, undefined, {
          duration: 5000,
        });
      }
    },
    [
      state.workflow.activeRuns,
      state.workflow.selectedRun,
      updateWorkflowRun,
      addLogEntry,
      createLogEntry,
      mapToolNameToStepId,
      getFriendlyStepName,
    ]
  );

  // Phase Transition Handler
  const handlePhaseTransition = useCallback(
    (data: PhaseTransition) => {
      console.log('Phase transition:', data);

      const run = state.workflow.activeRuns[data.run_id];
      if (!run) {
        console.warn(
          'No workflow run found for phase transition:',
          data.run_id
        );
        return;
      }

      addLogEntry(
        createLogEntry(
          'info',
          `Phase transition: ${data.from_phase || 'start'} → ${data.to_phase}`,
          {
            runId: data.run_id,
            fromPhase: data.from_phase,
            toPhase: data.to_phase,
            description: data.phase_description,
            estimatedDuration: data.estimated_duration_seconds,
          }
        )
      );

      toast.events.phaseTransition(data.to_phase, data.phase_description);
    },
    [state.workflow.activeRuns, addLogEntry, createLogEntry]
  );

  // Clarification Request Handler
  const handleClarificationRequest = useCallback(
    (data: ClarificationRequest) => {
      console.log('Clarification request:', data);

      // Add detailed log entry for clarification request
      addLogEntry(
        createLogEntry('warn', `🤔 Clarification Required: ${data.question}`, {
          clarificationId: data.clarification_id,
          timeout: data.timeout_seconds,
          options: data.options,
          required: data.required,
          context: data.context,
          type: 'clarification_request',
        })
      );

      // Show clarification dialog
      if (window.clarificationManager) {
        window.clarificationManager.showClarification(data);
      }

      // Use enhanced toast system for clarification requests
      toast.events.clarificationRequired(
        data.question,
        data.required,
        data.options
      );

      // Add a follow-up toast with timeout warning
      if (data.timeout_seconds > 30) {
        setTimeout(() => {
          const timeRemaining = Math.max(0, data.timeout_seconds - 30);
          toast.events.clarificationTimeout(timeRemaining);
        }, Math.max(0, (data.timeout_seconds - 30) * 1000));
      }
    },
    [addLogEntry, createLogEntry]
  );

  // Clarification Response Handler
  const handleClarificationResponse = useCallback(
    (data: ClarificationResponse) => {
      console.log('Clarification response:', data);

      // Add detailed log entry for clarification response
      addLogEntry(
        createLogEntry('info', `✅ Clarification Resolved: ${data.response}`, {
          clarificationId: data.clarification_id,
          responseTimestamp: data.timestamp,
          type: 'clarification_response',
        })
      );

      // Show success toast for clarification resolution
      toast.events.clarificationResolved(data.response);

      // Add a follow-up log entry indicating workflow can continue
      setTimeout(() => {
        addLogEntry(
          createLogEntry('info', '🚀 Workflow resuming after clarification', {
            clarificationId: data.clarification_id,
            type: 'workflow_resume',
          })
        );
      }, 1000);
    },
    [addLogEntry, createLogEntry]
  );

  // Payment Link Handler
  const handlePaymentLink = useCallback(
    (data: PaymentLinkEvent) => {
      console.log('Payment link created:', data);

      // Update the order with payment link
      updateOrder(data.order_id, {
        paymentLink: data.payment_link,
      });

      addLogEntry(
        createLogEntry(
          'info',
          `Payment link created for order ${data.order_id}`,
          {
            orderId: data.order_id,
            amount: data.amount,
            currency: data.currency,
            expiresAt: data.expires_at,
          }
        )
      );

      toast.events.paymentLinkCreated(data.order_id, data.payment_link);
    },
    [updateOrder, addLogEntry, createLogEntry]
  );

  // Blockchain Transaction Handler
  const handleBlockchainTx = useCallback(
    (data: BlockchainTxEvent) => {
      console.log('Blockchain transaction:', data);

      const transaction: BlockchainTransaction = {
        orderId: data.order_id,
        txHash: data.tx_hash,
        timestamp: new Date().toISOString(),
        status: data.status,
        blockNumber: data.block_number,
        gasUsed: data.gas_used,
        type: data.tx_type,
      };

      // Check if transaction already exists
      const existingTx = state.blockchain.transactions.find(
        (tx) => tx.txHash === data.tx_hash
      );

      if (existingTx) {
        updateBlockchainTransaction(data.tx_hash, {
          status: data.status,
          blockNumber: data.block_number,
          gasUsed: data.gas_used,
        });
      } else {
        addBlockchainTransaction(transaction);
      }

      // Update order with blockchain transaction
      updateOrder(data.order_id, {
        blockchainTx: data.tx_hash,
      });

      addLogEntry(
        createLogEntry(
          'info',
          `Blockchain transaction ${data.status}: ${data.tx_hash}`,
          {
            orderId: data.order_id,
            txType: data.tx_type,
            blockNumber: data.block_number,
            gasUsed: data.gas_used,
          }
        )
      );

      // Show appropriate toast based on transaction status
      if (data.status === 'pending') {
        toast.events.blockchainTxPending(data.tx_hash, data.tx_type);
      } else if (data.status === 'confirmed') {
        toast.events.blockchainTxConfirmed(data.tx_hash, data.tx_type);
      } else if (data.status === 'failed') {
        toast.events.blockchainTxFailed(data.tx_hash, data.tx_type);
      }
    },
    [
      state.blockchain.transactions,
      updateBlockchainTransaction,
      addBlockchainTransaction,
      updateOrder,
      addLogEntry,
      createLogEntry,
    ]
  );

  // Final Output Handler
  const handleFinalOutput = useCallback(
    (data: FinalOutputEvent) => {
      console.log('🏁 Final output received:', data);

      const run = state.workflow.activeRuns[data.run_id];
      if (!run) {
        console.warn('No workflow run found for final output:', data.run_id);
        return;
      }

      // Prevent duplicate processing of final output
      if (run.status === 'completed' || run.status === 'failed') {
        console.log(
          '⚠️ Workflow already completed, ignoring duplicate final output'
        );
        return;
      }

      console.log(
        '📊 Current steps before final processing:',
        run.steps.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          toolName: s.toolName,
        }))
      );

      // Mark all remaining steps as completed if the workflow completed successfully
      let updatedSteps: WorkflowStep[] = run.steps.map((step) => {
        if (step.status === 'pending' || step.status === 'active') {
          return {
            ...step,
            status: (data.status === 'completed'
              ? 'completed'
              : 'failed') as WorkflowStep['status'],
            endTime: new Date().toISOString(),
          };
        }
        return step;
      });

      // FALLBACK: If workflow is completed but no email step exists, add it
      // This handles cases where the email step WebSocket event was missed
      if (data.status === 'completed') {
        const hasEmailStep = updatedSteps.some(
          (step) =>
            step.id === 'email' ||
            step.toolName === 'Portia Google Send Email Tool' ||
            step.name?.toLowerCase().includes('email')
        );

        if (!hasEmailStep) {
          console.log(
            '📧 FALLBACK: Adding missing email step for completed workflow'
          );
          console.log(
            '📧 Current steps before adding email:',
            updatedSteps.map((s) => s.id)
          );

          updatedSteps.push({
            id: 'email',
            name: 'Email Confirmation',
            status: 'completed',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            logs: [],
            progress: 100,
            toolName: 'Portia Google Send Email Tool',
          });

          console.log('📧 Email step added via fallback');
        } else {
          console.log('📧 Email step already exists, no fallback needed');
        }
      }

      updateWorkflowRun(data.run_id, {
        status: data.status,
        endTime: new Date().toISOString(),
        progress: 100,
        steps: updatedSteps,
        completedSteps: updatedSteps.filter(
          (step) => step.status === 'completed'
        ).length,
      });

      // Update order status
      updateOrder(data.order_id, {
        status: data.status === 'completed' ? 'completed' : 'failed',
        updatedAt: new Date().toISOString(),
      });

      addLogEntry(
        createLogEntry(
          data.status === 'completed' ? 'info' : 'error',
          `Workflow ${data.status}: ${
            data.error || 'Processing completed successfully'
          }`,
          {
            runId: data.run_id,
            orderId: data.order_id,
            executionTime: data.execution_time_ms,
            output: data.output,
          }
        )
      );

      if (data.status === 'completed') {
        toast.events.orderCompleted(data.order_id);
      } else {
        toast.events.orderFailed(data.order_id, data.error);
      }
    },
    [
      state.workflow.activeRuns,
      updateWorkflowRun,
      updateOrder,
      addLogEntry,
      createLogEntry,
    ]
  );

  // Error Handler
  const handleError = useCallback(
    (data: ErrorEvent) => {
      console.error('WebSocket error:', data);

      addLogEntry(
        createLogEntry('error', `Error: ${data.message}`, {
          errorType: data.error_type,
          details: data.details,
          runId: data.run_id,
          stepId: data.step_id,
        })
      );

      toast.events.systemError(data.message, data.details);
    },
    [addLogEntry, createLogEntry]
  );

  // Connection event handlers
  const handleConnected = useCallback(() => {
    updateWebSocketState({ status: 'connected' });
    // Clear any existing error toasts when successfully connected
    toast.clear();
    toast.events.connected();
  }, [updateWebSocketState]);

  const handleDisconnected = useCallback(() => {
    updateWebSocketState({ status: 'disconnected' });
    toast.events.disconnected();
  }, [updateWebSocketState]);

  const handleConnectionError = useCallback(() => {
    updateWebSocketState({ status: 'error' });
    toast.events.connectionError();
  }, [updateWebSocketState]);

  // Order Submission Handler
  const handleOrderSubmitted = useCallback(
    (data: any) => {
      console.log('Order submitted:', data);

      addLogEntry(
        createLogEntry(
          'info',
          `Order ${data.order_id} submitted successfully`,
          {
            orderId: data.order_id,
            status: data.status,
            estimatedProcessingTime: data.estimated_processing_time,
          }
        )
      );

      toast.success(
        'Order Submitted',
        `Order ${data.order_id} has been received and queued for processing`
      );
    },
    [addLogEntry, createLogEntry]
  );

  // Order Created Handler
  const handleOrderCreated = useCallback(
    (data: any) => {
      console.log('Order created:', data);

      // Add the order to the state if it's not already there
      const existingOrder = state.orders.orders.find(
        (order) => order.id === data.id
      );
      if (!existingOrder) {
        // In mock mode, the order might already be in the mock data
        // In live mode, we should add it to the state
        if (!state.mockMode) {
          // Add order to state (this would typically come from the backend)
          // For now, we'll just log it since the order management is handled elsewhere
          console.log('New order created:', data);
        }
      }

      addLogEntry(
        createLogEntry(
          'info',
          `Order ${data.id} created and ready for processing`,
          {
            orderId: data.id,
            buyerEmail: data.buyerEmail,
            model: data.model,
            quantity: data.quantity,
          }
        )
      );
    },
    [addLogEntry, createLogEntry, state.orders.orders, state.mockMode]
  );

  // Processing Completed Handler
  const handleProcessingCompleted = useCallback(
    (data: any) => {
      console.log('Processing completed:', data);

      const run = state.workflow.activeRuns[data.run_id];
      if (!run) {
        console.warn(
          'No workflow run found for processing completion:',
          data.run_id
        );
        return;
      }

      // Mark workflow as completed
      updateWorkflowRun(data.run_id, {
        status: 'completed',
        endTime: new Date().toISOString(),
        progress: 100,
      });

      addLogEntry(
        createLogEntry('info', `Processing completed: ${data.message}`, {
          runId: data.run_id,
          processingTime: data.processing_time_seconds,
          finalOutput: data.final_output,
        })
      );

      toast.success('Order Processing Complete', data.message);
    },
    [state.workflow.activeRuns, updateWorkflowRun, addLogEntry, createLogEntry]
  );

  // Set up event subscriptions
  useEffect(() => {
    const unsubscribers = [
      socket.subscribe('processing_started', handleProcessingStarted),
      socket.subscribe('step_update', handleStepUpdate),
      socket.subscribe('phase_transition', handlePhaseTransition),
      socket.subscribe('clarification_request', handleClarificationRequest),
      socket.subscribe('clarification_response', handleClarificationResponse),
      socket.subscribe('payment_link', handlePaymentLink),
      socket.subscribe('blockchain_tx', handleBlockchainTx),
      socket.subscribe('final_output', handleFinalOutput),
      socket.subscribe('processing_completed', handleProcessingCompleted),
      socket.subscribe('error', handleError),
      socket.subscribe('connected', handleConnected),
      socket.subscribe('disconnected', handleDisconnected),
      socket.subscribe('order_submitted', handleOrderSubmitted),
      socket.subscribe('order_created', handleOrderCreated),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    socket,
    handleProcessingStarted,
    handleStepUpdate,
    handlePhaseTransition,
    handleClarificationRequest,
    handleClarificationResponse,
    handlePaymentLink,
    handleBlockchainTx,
    handleFinalOutput,
    handleError,
    handleConnected,
    handleDisconnected,
    handleConnectionError,
    handleOrderSubmitted,
    handleOrderCreated,
    handleProcessingCompleted,
  ]);

  // Update WebSocket state when socket state changes
  useEffect(() => {
    updateWebSocketState(socket.state);
  }, [socket.state, updateWebSocketState]);

  return {
    // Expose handlers for manual use if needed
    handleProcessingStarted,
    handleStepUpdate,
    handlePhaseTransition,
    handleClarificationRequest,
    handleClarificationResponse,
    handlePaymentLink,
    handleBlockchainTx,
    handleFinalOutput,
    handleError,
    handleConnected,
    handleDisconnected,
    handleConnectionError,
  };
};
