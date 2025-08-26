import { useCallback, useEffect } from 'react';
import { toast } from '../lib/toast';
import { useAppState } from '../context/AppStateContext';
import { usePortiaSocket } from './usePortiaSocket';
import { useMockWebSocket } from './useMockWebSocket';
import { stepDeduplicationEngine } from '../utils/StepDeduplicationEngine';
import { orderExtractionBlocker } from '../utils/OrderExtractionBlocker';
import { webSocketStateRecovery } from '../utils/WebSocketStateRecovery';
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
  socket:
    | ReturnType<typeof usePortiaSocket>
    | ReturnType<typeof useMockWebSocket>;
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
    addWorkflowStep,
    updateWorkflowStep,
    selectWorkflowRun,
    addLogEntry,
    addBlockchainTransaction,
  } = useAppState();

  // State persistence DISABLED - User requested no session restoration
  useEffect(() => {
    console.log(
      '🚫 State persistence disabled - no session data will be saved'
    );
  }, []);

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
      console.log('🚀 Processing started:', data);

      try {
        getOrCreateWorkflowRun(data.run_id, data.order_id);

        // Create initial planning step that becomes active immediately
        const planningStep: WorkflowStep = {
          id: 'planning',
          name: 'Planning',
          status: 'active',
          startTime: new Date().toISOString(),
          logs: [],
          progress: 0,
        };

        console.log('🚀 Creating workflow run with planning step');

        updateWorkflowRun(data.run_id, {
          status: 'running',
          totalSteps: Math.max(data.total_steps || 0, 12), // Ensure we have enough steps for full pipeline
          startTime: new Date().toISOString(),
          orderId: data.order_id || 'unknown',
          steps: [planningStep],
          currentStep: 'planning',
        });

        selectWorkflowRun(data.run_id);

        addLogEntry(
          createLogEntry('info', `🚀 Processing started: ${data.message}`, {
            runId: data.run_id,
            orderId: data.order_id,
            totalSteps: data.total_steps,
          })
        );

        toast.events.orderStarted(data.order_id || data.run_id, data.message);

        console.log(`✅ Workflow run ${data.run_id} initialized successfully`);
      } catch (error) {
        console.error('❌ Error handling processing started:', error);
        console.error('   - Data:', data);

        addLogEntry(
          createLogEntry('error', `Failed to start processing: ${error}`, {
            runId: data.run_id,
            orderId: data.order_id,
            error: error instanceof Error ? error.message : String(error),
          })
        );
      }
    },
    [
      getOrCreateWorkflowRun,
      updateWorkflowRun,
      selectWorkflowRun,
      addLogEntry,
      createLogEntry,
    ]
  );

  // Enhanced helper to map tool names to step IDs
  const mapToolNameToStepId = useCallback((toolName: string): string => {
    if (!toolName) return '';

    const toolMappings: Record<string, string> = {
      // Exact tool names from backend
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

      // Variations and alternative formats
      orderextractiontool: 'extraction',
      'order extraction tool': 'extraction',
      'order extraction': 'extraction',
      validatortool: 'validation',
      'validator tool': 'validation',
      validation: 'validation',
      inventorytool: 'inventory',
      'inventory tool': 'inventory',
      inventory: 'inventory',
      pricingtool: 'pricing',
      'pricing tool': 'pricing',
      pricing: 'pricing',
      suppliertool: 'supplier',
      'supplier tool': 'supplier',
      supplier: 'supplier',
      logisticstool: 'logistics',
      'logistics tool': 'logistics',
      logistics: 'logistics',
      financetool: 'finance',
      'finance tool': 'finance',
      finance: 'finance',
      clarificationtool: 'confirmation',
      'clarification tool': 'confirmation',
      clarification: 'confirmation',
      paymenttool: 'payment',
      'payment tool': 'payment',
      payment: 'payment',
      stripe: 'payment',
      ordertool: 'order',
      'order tool': 'order',
      order: 'order',
      blockchaintool: 'blockchain',
      'blockchain tool': 'blockchain',
      blockchain: 'blockchain',
      anchor: 'blockchain',
      emailtool: 'email',
      'email tool': 'email',
      email: 'email',
      mergetool: 'merge',
      'merge tool': 'merge',
      merge: 'merge',
    };

    // Try exact match first
    if (toolMappings[toolName]) {
      console.log(
        `🗺️ Tool mapping (exact): ${toolName} -> ${toolMappings[toolName]}`
      );
      return toolMappings[toolName];
    }

    // Try case-insensitive match
    const lowerToolName = toolName.toLowerCase();
    if (toolMappings[lowerToolName]) {
      console.log(
        `🗺️ Tool mapping (case-insensitive): ${toolName} -> ${toolMappings[lowerToolName]}`
      );
      return toolMappings[lowerToolName];
    }

    // Try partial matches
    for (const [key, value] of Object.entries(toolMappings)) {
      if (
        lowerToolName.includes(key.toLowerCase()) ||
        key.toLowerCase().includes(lowerToolName)
      ) {
        console.log(`🗺️ Tool mapping (partial): ${toolName} -> ${value}`);
        return value;
      }
    }

    // Fallback: create ID from tool name
    const fallbackId = toolName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    console.log(`🗺️ Tool mapping (fallback): ${toolName} -> ${fallbackId}`);
    return fallbackId;
  }, []);

  // Helper to get friendly step name
  const getFriendlyStepName = useCallback(
    (stepName: string, toolName?: string): string => {
      const friendlyNames: Record<string, string> = {
        OrderExtractionTool: 'Order Extraction',
        ValidatorTool: 'Order Validation',
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
        'Merge Fields Tool': 'Data Merging',
      };

      // Use tool name mapping if available
      if (toolName && friendlyNames[toolName]) {
        return friendlyNames[toolName];
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

  // Step Update Handler - Simplified with better error handling
  const handleStepUpdate = useCallback(
    (data: StepUpdate) => {
      console.log('🔍 Step update received:', {
        step_id: data.step_id,
        step_name: data.step_name,
        tool_name: data.tool_name,
        status: data.status,
      });

      try {
        // Validate incoming data
        if (!data.step_id && !data.tool_name && !data.step_name) {
          console.warn(
            '🚫 Invalid step update data - missing identifiers:',
            data
          );
          return;
        }

        // Find the workflow run
        let runId = Object.keys(state.workflow.activeRuns).find((id) => {
          const run = state.workflow.activeRuns[id];
          return run.steps.some((step) => step.id === data.step_id);
        });

        if (!runId) {
          runId =
            state.workflow.selectedRun ||
            Object.keys(state.workflow.activeRuns)[0];
        }

        if (!runId) {
          console.warn('🚫 No workflow run found for step update');
          return;
        }

        const run = state.workflow.activeRuns[runId];
        if (!run) {
          console.warn(`🚫 Workflow run ${runId} not found in state`);
          return;
        }

        console.log(
          `✅ Processing step update for run ${runId}:`,
          data.step_name,
          data.status
        );

        // Map step to consistent ID with improved logic
        let mappedStepId: string;
        if (
          data.step_name === 'Plan generated successfully' ||
          data.step_name?.includes('Plan generated') ||
          data.step_name?.includes('Planning')
        ) {
          mappedStepId = 'planning';
        } else if (data.tool_name) {
          mappedStepId = mapToolNameToStepId(data.tool_name);
        } else if (data.step_id) {
          mappedStepId = data.step_id.toLowerCase().replace(/[^a-z0-9]/g, '_');
        } else {
          // Fallback: create ID from step name
          mappedStepId =
            data.step_name?.toLowerCase().replace(/[^a-z0-9]/g, '_') ||
            'unknown';
        }

        console.log(
          `🗺️ Mapped step ID: ${data.step_id} -> ${mappedStepId} (tool: ${data.tool_name})`
        );

        const friendlyName = getFriendlyStepName(
          data.step_name,
          data.tool_name
        );

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
            : 'pending';

        // Create the new/updated step
        const updatedStep: WorkflowStep = {
          id: mappedStepId,
          name: friendlyName,
          status: mappedStatus,
          startTime: new Date().toISOString(),
          logs: [],
          progress: data.progress_percentage || 0,
          output: data.output,
          error: data.error,
          toolName: data.tool_name,
          endTime:
            data.status === 'completed' || data.status === 'failed'
              ? new Date().toISOString()
              : undefined,
        };

        // Check if this is a new step or an update to existing step
        const existingStepIndex = run.steps.findIndex(
          (step) =>
            step.id === mappedStepId ||
            (step.toolName && step.toolName === data.tool_name) ||
            step.name === friendlyName
        );

        if (existingStepIndex >= 0) {
          console.log('🔄 WebSocket Handler: Updating existing step');
          // Update existing step
          updateWorkflowStep(runId, updatedStep);
        } else {
          console.log('➕ WebSocket Handler: Adding new step');
          // Add new step
          addWorkflowStep(runId, updatedStep);
        }

        // Add log entry
        const logMessage = data.error
          ? `Step ${data.step_name} failed: ${data.error}`
          : `Step ${data.step_name} ${data.status}`;

        addLogEntry(
          createLogEntry(data.error ? 'error' : 'info', logMessage, {
            stepId: data.step_id,
            stepName: data.step_name,
            status: data.status,
            toolName: data.tool_name,
            runId: runId,
          })
        );

        console.log(
          `✅ Step update processed successfully for ${mappedStepId}`
        );
      } catch (error) {
        console.error('❌ Error processing step update:', error);
        console.error('   - Step data:', data);

        // Add error log entry
        addLogEntry(
          createLogEntry('error', `Failed to process step update: ${error}`, {
            stepData: data,
            error: error instanceof Error ? error.message : String(error),
          })
        );
      }
    },
    [
      state.workflow.activeRuns,
      state.workflow.selectedRun,
      updateWorkflowStep,
      addWorkflowStep,
      addLogEntry,
      createLogEntry,
      mapToolNameToStepId,
      getFriendlyStepName,
    ]
  );

  // Final Output Handler - Using StepDeduplicationEngine
  const handleFinalOutput = useCallback(
    (data: FinalOutputEvent) => {
      console.log('Final output:', data);

      const run = state.workflow.activeRuns[data.run_id];
      if (!run) {
        console.warn('No workflow run found for final output:', data.run_id);
        return;
      }

      // Mark all remaining steps as completed
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

      // Add email step if missing and workflow completed successfully
      if (data.status === 'completed') {
        const hasEmailStep = updatedSteps.some(
          (step) =>
            step.id === 'email' || step.name?.toLowerCase().includes('email')
        );

        if (!hasEmailStep) {
          console.log('Adding missing email step for completed workflow');
          updatedSteps.push({
            id: 'email',
            name: 'Email Confirmation',
            status: 'completed',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            logs: [],
            progress: 100,
          });
        }
      }

      // Reset the global blocker for this run since workflow is complete
      orderExtractionBlocker.resetRun(data.run_id);

      // Update the workflow run with final status and let the reducer handle deduplication
      console.log(
        '🔧 Final Output Handler: Updating workflow run with final steps via StepDeduplicationEngine'
      );

      updateWorkflowRun(data.run_id, {
        status: data.status,
        endTime: new Date().toISOString(),
        progress: 100,
        steps: updatedSteps, // The reducer will apply deduplication
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

  // Other handlers (simplified versions)
  const handlePhaseTransition = useCallback((data: PhaseTransition) => {
    console.log('Phase transition:', data);
  }, []);

  const handleClarificationRequest = useCallback(
    (data: ClarificationRequest) => {
      console.log('🤔 CLARIFICATION REQUEST RECEIVED:', data);
      console.log('🤔 Clarification data structure:', {
        clarification_id: data.clarification_id,
        question: data.question,
        options: data.options,
        timeout_seconds: data.timeout_seconds,
        required: data.required,
      });

      // Add clarification request to log stream for UI display
      const logEntry = createLogEntry(
        'warn',
        `🤔 Clarification Required: ${data.question}`,
        {
          type: 'clarification_request',
          clarificationId: data.clarification_id,
          question: data.question,
          options: data.options,
          timeout_seconds: data.timeout_seconds,
          required: data.required,
          context: data.context,
        }
      );

      console.log('🤔 Created log entry:', logEntry);
      addLogEntry(logEntry);

      // Show clarification dialog using global manager
      console.log('🤔 Showing clarification dialog');
      console.log('🤔 Window object keys:', Object.keys(window));
      console.log(
        '🤔 Clarification manager available:',
        !!(window as any).clarificationManager
      );

      if ((window as any).clarificationManager) {
        console.log('🤔 Calling showClarification on global manager');
        console.log(
          '🤔 Manager methods:',
          Object.keys((window as any).clarificationManager)
        );
        (window as any).clarificationManager.showClarification(data);
      } else {
        console.error('🤔 Global clarification manager not found!');
        console.log(
          '🤔 Available window properties:',
          Object.keys(window).filter(
            (key) => key.includes('clarification') || key.includes('manager')
          )
        );

        // Fallback: show toast notification
        toast.events.clarificationRequired(
          data.question,
          data.required,
          data.options
        );
      }
    },
    [addLogEntry, createLogEntry]
  );

  const handleClarificationResponse = useCallback(
    (data: ClarificationResponse) => {
      console.log('Clarification response received:', data);

      // Add clarification response to log stream
      addLogEntry(
        createLogEntry('info', `✅ Clarification Response: ${data.response}`, {
          type: 'clarification_response',
          clarificationId: data.clarification_id,
          response: data.response,
        })
      );
    },
    [addLogEntry, createLogEntry]
  );

  const handlePaymentLink = useCallback(
    (data: PaymentLinkEvent) => {
      console.log('Payment link received:', data);

      // Find the payment step and update it with the payment link
      const runId =
        state.workflow.selectedRun || Object.keys(state.workflow.activeRuns)[0];
      if (runId) {
        const run = state.workflow.activeRuns[runId];
        if (run) {
          const paymentStepIndex = run.steps.findIndex(
            (step) =>
              step.id === 'payment' ||
              step.id.includes('stripe') ||
              step.toolName === 'StripePaymentTool'
          );

          if (paymentStepIndex >= 0) {
            const updatedSteps = [...run.steps];
            updatedSteps[paymentStepIndex] = {
              ...updatedSteps[paymentStepIndex],
              output: {
                ...updatedSteps[paymentStepIndex].output,
                payment_link: data.payment_link,
                order_id: data.order_id,
              },
            };

            updateWorkflowRun(runId, { steps: updatedSteps });
          }
        }
      }

      addLogEntry(
        createLogEntry(
          'info',
          `💳 Payment link generated: ${data.payment_link}`,
          {
            paymentLink: data.payment_link,
            orderId: data.order_id,
          }
        )
      );
    },
    [
      state.workflow.activeRuns,
      state.workflow.selectedRun,
      updateWorkflowRun,
      addLogEntry,
      createLogEntry,
    ]
  );

  const handleBlockchainTx = useCallback(
    (data: BlockchainTxEvent) => {
      console.log('Blockchain transaction received:', data);

      // Find the blockchain step and update it with the transaction hash
      const runId =
        state.workflow.selectedRun || Object.keys(state.workflow.activeRuns)[0];
      if (runId) {
        const run = state.workflow.activeRuns[runId];
        if (run) {
          const blockchainStepIndex = run.steps.findIndex(
            (step) =>
              step.id === 'blockchain' ||
              step.id.includes('anchor') ||
              step.toolName === 'Blockchain Anchor Tool'
          );

          if (blockchainStepIndex >= 0) {
            const updatedSteps = [...run.steps];
            updatedSteps[blockchainStepIndex] = {
              ...updatedSteps[blockchainStepIndex],
              output: data.tx_hash, // Store the hash directly as output
            };

            updateWorkflowRun(runId, { steps: updatedSteps });
          }
        }
      }

      // Add blockchain transaction to state
      const transaction: BlockchainTransaction = {
        txHash: data.tx_hash,
        orderId: data.order_id,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        blockNumber: data.block_number,
        gasUsed: data.gas_used,
        type: 'anchor',
      };

      addBlockchainTransaction(transaction);

      addLogEntry(
        createLogEntry(
          'info',
          `⛓️ Blockchain transaction recorded: ${data.tx_hash}`,
          {
            txHash: data.tx_hash,
            orderId: data.order_id,
            blockNumber: data.block_number,
          }
        )
      );
    },
    [
      state.workflow.activeRuns,
      state.workflow.selectedRun,
      updateWorkflowRun,
      addBlockchainTransaction,
      addLogEntry,
      createLogEntry,
    ]
  );

  const handleError = useCallback((data: ErrorEvent) => {
    console.error('WebSocket error:', data);
  }, []);

  const handleConnected = useCallback(
    (data: any) => {
      console.log('🔌 WebSocket connected, checking for state recovery...');
      updateWebSocketState({ status: 'connected' });

      // Handle state recovery if available
      if (data?.hasRecoveryData && data?.recoveryData) {
        console.log('🔄 Applying state recovery from WebSocket connection...');

        try {
          // Apply recovered workflow state
          webSocketStateRecovery.applyRecoveredState(
            data.recoveryData,
            (action: any) => {
              // Map recovery actions to app state actions
              switch (action.type) {
                case 'ADD_WORKFLOW_RUN':
                  addWorkflowRun(action.payload);
                  break;
                case 'SELECT_WORKFLOW_RUN':
                  selectWorkflowRun(action.payload);
                  break;
                default:
                  console.warn('Unknown recovery action type:', action.type);
              }
            }
          );

          toast.success('Workflow state recovered from previous session');
        } catch (error) {
          console.error('❌ Failed to apply state recovery:', error);
          toast.error('Failed to recover previous session state');
        }
      } else {
        console.log('📭 No recovery data available');
      }
    },
    [updateWebSocketState, addWorkflowRun, selectWorkflowRun]
  );

  const handleDisconnected = useCallback(() => {
    updateWebSocketState({ status: 'disconnected' });
  }, [updateWebSocketState]);

  const handleConnectionError = useCallback(() => {
    updateWebSocketState({ status: 'error' });
  }, [updateWebSocketState]);

  // ENHANCED: Email Completion Trigger Handler
  const handleEmailCompletionTrigger = useCallback(
    (data: any) => {
      console.log('📧 EMAIL COMPLETION TRIGGER received from backend:', data);

      try {
        // Trigger the global email completion event handler if available
        if (
          typeof window !== 'undefined' &&
          (window as any).handleEmailCompletionEvent
        ) {
          console.log('📧 Calling global email completion event handler');
          (window as any).handleEmailCompletionEvent({
            type: 'email_completed',
            ...data,
          });
        } else {
          console.warn('📧 Global email completion event handler not found');
        }

        // Add log entry for the email completion
        addLogEntry(
          createLogEntry(
            'info',
            `📧 Email sent successfully - Order processing complete`,
            {
              type: 'email_completion',
              runId: data.run_id,
              orderId: data.orderId,
              buyerEmail: data.buyerEmail,
              paymentLink: data.paymentLink,
              blockchainTxHash: data.blockchainTxHash,
            }
          )
        );

        // Show success toast
        toast.success('Order completed! Email sent to customer.');

        console.log('✅ Email completion trigger processed successfully');
      } catch (error) {
        console.error('❌ Error processing email completion trigger:', error);

        addLogEntry(
          createLogEntry(
            'error',
            `Failed to process email completion trigger: ${error}`,
            {
              error: error instanceof Error ? error.message : String(error),
              data,
            }
          )
        );
      }
    },
    [addLogEntry, createLogEntry]
  );

  // Register event handlers
  useEffect(() => {
    if (!socket) return;

    const unsubscribers = [
      socket.subscribe('processing_started', handleProcessingStarted),
      socket.subscribe('step_update', handleStepUpdate),
      socket.subscribe('phase_transition', handlePhaseTransition),
      socket.subscribe('clarification_request', handleClarificationRequest),
      socket.subscribe('clarification_response', handleClarificationResponse),
      socket.subscribe('payment_link', handlePaymentLink),
      socket.subscribe('blockchain_tx', handleBlockchainTx),
      socket.subscribe('final_output', handleFinalOutput),
      socket.subscribe('error', handleError),
      socket.subscribe('connected', handleConnected),
      socket.subscribe('disconnected', handleDisconnected),
      socket.subscribe('connection_error', handleConnectionError),
      socket.subscribe(
        'email_completion_trigger',
        handleEmailCompletionTrigger
      ),
    ];

    // Add test event listener for debugging clarifications
    const handleTestClarification = (event: CustomEvent) => {
      console.log('🧪 Test clarification event received:', event.detail);
      handleClarificationRequest(event.detail);
    };

    window.addEventListener(
      'test-clarification',
      handleTestClarification as EventListener
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener(
        'test-clarification',
        handleTestClarification as EventListener
      );
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
    handleEmailCompletionTrigger,
  ]);

  return {
    // Export handlers for testing if needed
    handleStepUpdate,
    handleFinalOutput,
  };
};
