import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import WorkflowStepper from '../components/WorkflowStepper';
import WorkflowDemo from '../components/WorkflowDemo';
import LogStream from '../components/LogStream';
import ClarificationNotification from '../components/ClarificationNotification';
import WorkflowTestControls from '../components/WorkflowTestControls';
import StepHighlightingTest from '../components/StepHighlightingTest';
import WorkflowDebugControls from '../components/WorkflowDebugControls';
import OrderCompletionCard from '../components/OrderCompletionCard';
import OrderCompletionCardErrorBoundary from '../components/OrderCompletionCardErrorBoundary';
import { useAppState } from '../context/AppStateContext';
import { emailCompletionDetector } from '../utils/EmailBasedCompletionDetector';
import { completionStateManager } from '../utils/CompletionStateManager';
import { workflowDataExtractor } from '../utils/WorkflowDataExtractor';
import { orderCompletionDataValidator } from '../utils/OrderCompletionDataValidator';
import { webSocketStateRecovery } from '../utils/WebSocketStateRecovery';
import '../utils/testClarification'; // Import for global availability

import type { WorkflowStep, LogEntry, WorkflowRun } from '../types';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { error } from 'console';
import { JSX } from 'react/jsx-runtime';

// Default workflow steps template for new workflows
const defaultWorkflowSteps: WorkflowStep[] = [
  {
    id: 'planning',
    name: 'Planning',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'validation',
    name: 'Order Validation',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'inventory',
    name: 'Inventory Check',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'pricing',
    name: 'Price Calculation',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'supplier',
    name: 'Supplier Quotes',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'logistics',
    name: 'Logistics Planning',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'finance',
    name: 'Finance Terms',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'confirmation',
    name: 'User Confirmation',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'payment',
    name: 'Payment Processing',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'order',
    name: 'Order Finalization',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'blockchain',
    name: 'Blockchain Recording',
    status: 'pending',
    logs: [],
    progress: 0,
  },
  {
    id: 'email',
    name: 'Email Confirmation',
    status: 'pending',
    logs: [],
    progress: 0,
  },
];

/**
 * Enhanced Workflow Component with comprehensive error handling and performance optimizations
 */
const Workflow: React.FC = (): JSX.Element => {
  // Enhanced state management
  const [selectedStep, setSelectedStep] = useState<string>('');
  const [showCompletionCard, setShowCompletionCard] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);
  const [completionCheckCount, setCompletionCheckCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);

  // Debug logging for completion card state changes
  useEffect(() => {
    console.log('🎯 WORKFLOW: showCompletionCard changed:', showCompletionCard);
    console.log('🎯 WORKFLOW: completionData exists:', !!completionData);
    console.log(
      '🎯 WORKFLOW: Should render card:',
      showCompletionCard && !!completionData
    );
  }, [showCompletionCard]);

  useEffect(() => {
    console.log(
      '🎯 WORKFLOW: completionData changed:',
      !!completionData,
      completionData?.orderId
    );
    console.log('🎯 WORKFLOW: showCompletionCard state:', showCompletionCard);
    console.log(
      '🎯 WORKFLOW: Should render card:',
      showCompletionCard && !!completionData
    );
  }, [completionData]);

  // Refs for cleanup and performance
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const emailCompletionListenerRef = useRef<(() => void) | null>(null);

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    state,
    selectWorkflowRun,
    markCompletionCardShown,
    markCompletionCardDismissed,
  } = useAppState();

  // Get order ID from URL params if navigated from Orders page
  const orderIdFromParams = searchParams.get('orderId');
  const runIdFromParams = searchParams.get('runId');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  // State recovery DISABLED - User requested no session restoration
  useEffect(() => {
    console.log('🚫 State recovery disabled - starting fresh session');

    // Clear any existing persisted state to ensure fresh start
    try {
      webSocketStateRecovery.clearPersistedState();
      console.log('🗑️ Cleared any existing persisted state');
    } catch (error) {
      console.error('❌ Failed to clear persisted state:', error);
    }
  }, []); // Only run on mount

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Workflow error:', event.error);
      setError('An unexpected error occurred in the workflow.');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Enhanced step click handler with transition state
  const handleStepClick = useCallback((stepId: string) => {
    console.log(`🎯 Step clicked: ${stepId}`);
    setIsStepTransitioning(true);
    setSelectedStep(stepId);

    // Clear transition state after a brief delay
    setTimeout(() => {
      setIsStepTransitioning(false);
    }, 300);
  }, []);

  // Get all available workflow runs
  const availableRuns = useMemo(() => {
    return Object.values(state.workflow.activeRuns);
  }, [state.workflow.activeRuns]);

  // Determine current workflow run
  const currentWorkflowRun = useMemo(() => {
    // If a specific run ID is in params, use that
    if (runIdFromParams && state.workflow.activeRuns[runIdFromParams]) {
      return state.workflow.activeRuns[runIdFromParams];
    }

    // If we have a selected run in state, use that
    if (
      state.workflow.selectedRun &&
      state.workflow.activeRuns[state.workflow.selectedRun]
    ) {
      return state.workflow.activeRuns[state.workflow.selectedRun];
    }

    // If we have an order ID from params, try to find a workflow run for it
    if (orderIdFromParams) {
      const runForOrder = availableRuns.find(
        (run) => run.orderId === orderIdFromParams
      );
      if (runForOrder) {
        return runForOrder;
      }
    }

    // Return the most recent workflow run
    const sortedRuns = availableRuns.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    return sortedRuns.length > 0 ? sortedRuns[0] : null;
  }, [
    state.workflow.activeRuns,
    state.workflow.selectedRun,
    orderIdFromParams,
    runIdFromParams,
    availableRuns,
  ]);

  // Enhanced error recovery
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);

    // Simulate retry delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  // Performance monitoring and step change tracking
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      if (renderTime > 100) {
        // Log slow renders
        console.warn(`Slow workflow render: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  // Enhanced workflow steps processing with comprehensive error handling and conservative filtering
  const workflowSteps = useMemo(() => {
    console.log('🔍 Processing workflow steps for UI rendering');

    try {
      if (!currentWorkflowRun?.steps || currentWorkflowRun.steps.length === 0) {
        console.log('📋 No workflow steps available, using default template');
        return defaultWorkflowSteps;
      }

      console.log('🔍 Raw workflow steps received:', {
        runId: currentWorkflowRun.id,
        totalSteps: currentWorkflowRun.steps.length,
        stepDetails: currentWorkflowRun.steps.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          toolName: s.toolName,
        })),
      });

      // Conservative filtering - only remove clearly problematic steps
      const filteredSteps = currentWorkflowRun.steps.filter((step) => {
        // Only filter out clearly internal/system steps
        const isInternalStep =
          step.id.includes('_internal') ||
          step.id.includes('_system') ||
          step.id.includes('_temp') ||
          step.name?.includes('[Internal]') ||
          step.name?.includes('[System]');

        // Only filter out failed steps if there's a successful duplicate with same tool
        const hasSuccessfulDuplicate =
          step.status === 'failed' &&
          currentWorkflowRun.steps.some(
            (otherStep) =>
              otherStep.id !== step.id &&
              otherStep.toolName === step.toolName &&
              otherStep.status === 'completed'
          );

        const shouldFilter = isInternalStep || hasSuccessfulDuplicate;

        if (shouldFilter) {
          console.log('🚫 Filtering out step:', {
            id: step.id,
            name: step.name,
            toolName: step.toolName,
            status: step.status,
            reason: isInternalStep ? 'internal_step' : 'failed_duplicate',
          });
        }

        return !shouldFilter;
      });

      console.log('🔍 After conservative filtering:', {
        originalCount: currentWorkflowRun.steps.length,
        filteredCount: filteredSteps.length,
        filteredSteps: filteredSteps.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
        })),
      });

      // Validate filtered steps - be more permissive
      if (filteredSteps.length === 0) {
        console.warn(
          '⚠️ No steps left after filtering, using default template'
        );
        return defaultWorkflowSteps;
      }

      // Always return the filtered steps - let WorkflowStepper handle ordering
      console.log('✅ Returning filtered steps for WorkflowStepper processing');
      return filteredSteps;
    } catch (error) {
      console.error('❌ Critical error processing workflow steps:', error);
      console.error('   - Current workflow run:', currentWorkflowRun);
      console.error('   - Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      setError(
        `Failed to process workflow steps: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // Return default steps as fallback
      return defaultWorkflowSteps;
    }
  }, [
    currentWorkflowRun?.steps,
    currentWorkflowRun?.status,
    currentWorkflowRun?.id,
  ]);

  // Monitor workflow step changes for debugging
  useEffect(() => {
    if (currentWorkflowRun) {
      console.log('🔄 Workflow steps changed:', {
        runId: currentWorkflowRun.id,
        stepCount: workflowSteps.length,
        activeSteps: workflowSteps
          .filter((s) => s.status === 'active')
          .map((s) => s.id),
        completedSteps: workflowSteps
          .filter((s) => s.status === 'completed')
          .map((s) => s.id),
        pendingSteps: workflowSteps
          .filter((s) => s.status === 'pending')
          .map((s) => s.id),
      });
    }
  }, [currentWorkflowRun?.id, workflowSteps]);

  // Enhanced step selection with better transition handling
  useEffect(() => {
    console.log('🎯 Updating selected step based on workflow state');

    if (currentWorkflowRun && workflowSteps.length > 0) {
      const activeStep = workflowSteps.find((step) => step.status === 'active');
      const firstIncompleteStep = workflowSteps.find(
        (step) => step.status === 'pending' || step.status === 'active'
      );
      const firstStep = workflowSteps[0];

      const newSelectedStep =
        activeStep?.id || firstIncompleteStep?.id || firstStep?.id || '';

      console.log('🎯 Step selection logic:', {
        activeStepId: activeStep?.id,
        firstIncompleteStepId: firstIncompleteStep?.id,
        firstStepId: firstStep?.id,
        currentSelectedStep: selectedStep,
        newSelectedStep,
      });

      if (newSelectedStep && newSelectedStep !== selectedStep) {
        console.log(
          `🎯 Updating selected step: ${selectedStep} -> ${newSelectedStep}`
        );
        setSelectedStep(newSelectedStep);
      }
    } else if (!currentWorkflowRun) {
      console.log('🎯 No current workflow run, clearing selected step');
      setSelectedStep('');
    }
  }, [currentWorkflowRun, workflowSteps, selectedStep]);

  // Optimized log aggregation with error handling and deduplication
  const allLogs = useMemo(() => {
    try {
      const logs: LogEntry[] = [];
      const seenLogs = new Set<string>();

      // Add logs from workflow steps with deduplication
      workflowSteps.forEach((step) => {
        if (step.logs && Array.isArray(step.logs)) {
          step.logs.forEach((log) => {
            const logKey = `${log.timestamp}-${log.message}`;
            if (!seenLogs.has(logKey)) {
              seenLogs.add(logKey);
              logs.push({
                ...log,
                metadata: {
                  ...log.metadata,
                  stepId: step.id,
                  stepName: step.name,
                },
              });
            }
          });
        }
      });

      // Add logs from global log stream with deduplication
      if (state.workflow.logStream && Array.isArray(state.workflow.logStream)) {
        state.workflow.logStream.forEach((log) => {
          const logKey = `${log.timestamp}-${log.message}`;
          if (!seenLogs.has(logKey)) {
            seenLogs.add(logKey);
            logs.push(log);
          }
        });
      }

      // Sort by timestamp with error handling
      return logs.sort((a, b) => {
        try {
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        } catch {
          return 0; // Fallback for invalid timestamps
        }
      });
    } catch (error) {
      console.error('Error aggregating logs:', error);
      return [];
    }
  }, [workflowSteps, state.workflow.logStream]);

  // Filter clarification-related logs for special display
  const clarificationLogs = useMemo(() => {
    return allLogs.filter(
      (log) =>
        log.metadata?.type === 'clarification_request' ||
        log.metadata?.type === 'clarification_response'
    );
  }, [allLogs]);

  // Calculate workflow progress
  const workflowProgress = useMemo(() => {
    if (currentWorkflowRun) {
      return {
        completed: currentWorkflowRun.completedSteps,
        total: currentWorkflowRun.totalSteps || workflowSteps.length,
        percentage: currentWorkflowRun.progress,
        status: currentWorkflowRun.status,
        startTime: currentWorkflowRun.startTime,
        endTime: currentWorkflowRun.endTime,
        currentStep: currentWorkflowRun.currentStep,
      };
    }

    // Calculate from steps if no workflow run data
    const completed = workflowSteps.filter(
      (step) => step.status === 'completed'
    ).length;
    const total = workflowSteps.length;
    const activeStep = workflowSteps.find((step) => step.status === 'active');

    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
      status: 'pending' as const,
      startTime: undefined,
      endTime: undefined,
      currentStep: activeStep?.id,
    };
  }, [currentWorkflowRun, workflowSteps]);

  // Calculate elapsed time
  const elapsedTime = useMemo(() => {
    if (!workflowProgress.startTime) return null;

    const start = new Date(workflowProgress.startTime);
    const end = workflowProgress.endTime
      ? new Date(workflowProgress.endTime)
      : new Date();
    const diffMs = end.getTime() - start.getTime();

    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [workflowProgress.startTime, workflowProgress.endTime]);

  // ENHANCED EMAIL COMPLETION LISTENER - Listen for backend email completion events
  useEffect(() => {
    // Set up a global listener for email completion events from backend
    const handleEmailCompletionEvent = (event: any) => {
      console.log('📧 BACKEND EMAIL COMPLETION EVENT received:', event);

      if (event.type === 'email_sent' || event.type === 'email_completed') {
        console.log(
          '✅ Backend confirmed email sent, triggering completion card'
        );

        // Extract completion data
        let completionData;
        try {
          if (currentWorkflowRun) {
            completionData =
              workflowDataExtractor.extractCompletionData(currentWorkflowRun);
          } else {
            throw new Error('No current workflow run');
          }
        } catch (error) {
          console.warn(
            'Error extracting completion data from backend event:',
            error
          );
          completionData = {
            orderId: event.orderId || 'BACKEND-EMAIL-' + Date.now(),
            model: event.model || 'Order Processing Complete',
            quantity: event.quantity || 1,
            deliveryLocation: event.deliveryLocation || 'Processing Complete',
            totalAmount: event.totalAmount || 'See workflow details',
            paymentLink: event.paymentLink || '',
            blockchainTxHash: event.blockchainTxHash || '',
            buyerEmail: event.buyerEmail || 'See workflow logs',
          };
        }

        setCompletionData(completionData);
        setShowCompletionCard(true);
        console.log(
          '🎉 BACKEND EVENT: Completion card shown after backend email confirmation'
        );
      }
    };

    // Add global event listener for backend email completion
    if (typeof window !== 'undefined') {
      (window as any).handleEmailCompletionEvent = handleEmailCompletionEvent;
      console.log('📧 Registered global email completion event handler');

      // ENHANCED: Add manual trigger for testing
      (window as any).triggerEmailCompletion = (testData?: any) => {
        console.log('🧪 Manual email completion trigger called');
        const defaultTestData = {
          type: 'email_completed',
          orderId: 'TEST-ORDER-' + Date.now(),
          buyerEmail: 'test@example.com',
          model: 'Test Order',
          quantity: 1,
          deliveryLocation: 'Test Location',
          totalAmount: '$100.00',
          paymentLink: 'https://checkout.stripe.com/pay/test123',
          blockchainTxHash:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        };

        handleEmailCompletionEvent(testData || defaultTestData);
      };

      console.log('🧪 Added manual trigger: window.triggerEmailCompletion()');
    }

    return () => {
      // Cleanup global listeners
      if (typeof window !== 'undefined') {
        delete (window as any).handleEmailCompletionEvent;
        delete (window as any).triggerEmailCompletion;
      }
    };
  }, [currentWorkflowRun, workflowDataExtractor]);

  // SIMPLIFIED COMPLETION DETECTION - Focus on email step completion
  useEffect(() => {
    if (!currentWorkflowRun || !mountedRef.current) return;

    const runId = currentWorkflowRun.id;

    try {
      // Skip if completion card is already shown
      if (showCompletionCard) {
        console.log('🎯 Completion card already shown, skipping detection');
        return;
      }

      console.log('🔍 SIMPLIFIED: Checking completion for workflow run:', {
        runId,
        status: currentWorkflowRun.status,
        progress: currentWorkflowRun.progress,
        stepsCount: currentWorkflowRun.steps?.length || 0,
      });

      // ENHANCED PRIMARY CHECK: Look for completed email step with multiple patterns
      const emailStep = currentWorkflowRun.steps?.find((step) => {
        const isEmailTool =
          step.toolName === 'Portia Google Send Email Tool' ||
          step.toolName?.toLowerCase().includes('email') ||
          step.toolName?.toLowerCase().includes('gmail') ||
          step.toolName?.toLowerCase().includes('send_email') ||
          step.name?.toLowerCase().includes('email') ||
          step.name?.toLowerCase().includes('send email') ||
          step.id?.toLowerCase().includes('email');
        return isEmailTool && step.status === 'completed';
      });

      if (emailStep) {
        console.log(
          '✅ ENHANCED: Email step completed, showing completion card:',
          {
            stepId: emailStep.id,
            stepName: emailStep.name,
            toolName: emailStep.toolName,
            output: emailStep.output ? 'present' : 'missing',
          }
        );

        // Extract completion data immediately
        let completionData;
        try {
          completionData =
            workflowDataExtractor.extractCompletionData(currentWorkflowRun);
        } catch (error) {
          console.warn(
            'Error extracting completion data, using fallback:',
            error
          );
          completionData = {
            orderId:
              currentWorkflowRun.orderId || 'EMAIL-COMPLETED-' + Date.now(),
            model: 'Order Processing Complete',
            quantity: 1,
            deliveryLocation: 'Processing Complete',
            totalAmount: 'See workflow details',
            paymentLink: '',
            blockchainTxHash: '',
            buyerEmail: 'See workflow logs',
          };
        }

        setCompletionData(completionData);
        setShowCompletionCard(true);
        console.log(
          '🎉 ENHANCED: Completion card shown after email step completion'
        );
        return;
      }

      // ENHANCED SECONDARY CHECK: Look for email confirmation in any completed step output
      const stepWithEmailConfirmation = currentWorkflowRun.steps?.find(
        (step) => {
          if (step.status !== 'completed' || !step.output) return false;

          const outputString =
            typeof step.output === 'string'
              ? step.output
              : JSON.stringify(step.output);
          const emailPatterns = [
            /Sent email with id/i,
            /Email sent successfully/i,
            /Message sent with ID/i,
            /Email delivered/i,
            /Successfully sent email/i,
            /email.*sent/i,
            /confirmation.*sent/i,
          ];

          return emailPatterns.some((pattern) => pattern.test(outputString));
        }
      );

      if (stepWithEmailConfirmation) {
        console.log(
          '✅ ENHANCED: Email confirmation found in step output, showing completion card:',
          {
            stepId: stepWithEmailConfirmation.id,
            stepName: stepWithEmailConfirmation.name,
            toolName: stepWithEmailConfirmation.toolName,
          }
        );

        // Extract completion data immediately
        let completionData;
        try {
          completionData =
            workflowDataExtractor.extractCompletionData(currentWorkflowRun);
        } catch (error) {
          console.warn(
            'Error extracting completion data, using fallback:',
            error
          );
          completionData = {
            orderId:
              currentWorkflowRun.orderId || 'EMAIL-CONFIRMED-' + Date.now(),
            model: 'Order Processing Complete',
            quantity: 1,
            deliveryLocation: 'Processing Complete',
            totalAmount: 'See workflow details',
            paymentLink: '',
            blockchainTxHash: '',
            buyerEmail: 'See workflow logs',
          };
        }

        setCompletionData(completionData);
        setShowCompletionCard(true);
        console.log(
          '🎉 ENHANCED: Completion card shown after email confirmation detected'
        );
        return;
      }

      // ENHANCED FALLBACK CHECK: Multiple completion indicators
      const completedSteps =
        currentWorkflowRun.steps?.filter((s) => s.status === 'completed') || [];
      const totalSteps = currentWorkflowRun.steps?.length || 0;
      const completionRatio =
        totalSteps > 0 ? completedSteps.length / totalSteps : 0;

      // Check for key completion indicators
      const hasPaymentStep = completedSteps.some(
        (step) =>
          step.toolName?.toLowerCase().includes('stripe') ||
          step.toolName?.toLowerCase().includes('payment') ||
          step.name?.toLowerCase().includes('payment')
      );

      const hasBlockchainStep = completedSteps.some(
        (step) =>
          step.toolName?.toLowerCase().includes('blockchain') ||
          step.toolName?.toLowerCase().includes('anchor') ||
          step.name?.toLowerCase().includes('blockchain')
      );

      const hasOrderStep = completedSteps.some(
        (step) =>
          step.toolName?.toLowerCase().includes('order') ||
          step.name?.toLowerCase().includes('order')
      );

      // ENHANCED fallback conditions
      const shouldTriggerFallback =
        // Original condition
        (currentWorkflowRun.status === 'completed' && totalSteps >= 3) ||
        // NEW: High completion ratio with key steps
        (completionRatio >= 0.7 && (hasPaymentStep || hasBlockchainStep)) ||
        // NEW: Key steps completed regardless of overall status
        (hasPaymentStep && hasBlockchainStep) ||
        (hasPaymentStep && hasOrderStep && completedSteps.length >= 5) ||
        // NEW: Workflow marked complete with reasonable step count
        (currentWorkflowRun.status === 'completed' &&
          completedSteps.length >= 2);

      if (shouldTriggerFallback) {
        console.log(
          '🚀 ENHANCED FALLBACK: Multiple completion indicators detected, showing completion card:',
          {
            status: currentWorkflowRun.status,
            completedSteps: completedSteps.length,
            totalSteps,
            completionRatio,
            hasPaymentStep,
            hasBlockchainStep,
            hasOrderStep,
          }
        );

        let fallbackData;
        try {
          fallbackData =
            workflowDataExtractor.extractCompletionData(currentWorkflowRun);
        } catch (error) {
          console.warn('Error extracting fallback data:', error);
          fallbackData = {
            orderId:
              currentWorkflowRun.orderId || 'WORKFLOW-COMPLETED-' + Date.now(),
            model: 'Order Processing Complete',
            quantity: 1,
            deliveryLocation: 'Processing Complete',
            totalAmount: 'See workflow details',
            paymentLink: '',
            blockchainTxHash: '',
            buyerEmail: 'See workflow logs',
          };
        }

        setCompletionData(fallbackData);
        setShowCompletionCard(true);
        console.log(
          '🎉 ENHANCED FALLBACK: Completion card shown for completed workflow'
        );
        return;
      }

      // ULTRA AGGRESSIVE FALLBACK: Check for any signs of workflow completion
      console.log(
        '🔍 ULTRA AGGRESSIVE: Checking for any completion indicators...'
      );

      // Check if we have a reasonable number of completed steps
      if (completedSteps.length >= 3) {
        console.log(
          '🚀 ULTRA AGGRESSIVE: Found sufficient completed steps, checking for completion indicators'
        );

        // Look for any step that might indicate the workflow is done
        const hasCompletionIndicators = completedSteps.some((step) => {
          const stepText = `${step.name} ${
            step.toolName || ''
          } ${JSON.stringify(step.output || '')}`.toLowerCase();
          return (
            stepText.includes('final') ||
            stepText.includes('complete') ||
            stepText.includes('success') ||
            stepText.includes('payment') ||
            stepText.includes('order') ||
            stepText.includes('blockchain') ||
            stepText.includes('email') ||
            stepText.includes('confirmation')
          );
        });

        if (hasCompletionIndicators) {
          console.log(
            '🎯 ULTRA AGGRESSIVE: Found completion indicators, showing completion card'
          );

          let ultraFallbackData;
          try {
            ultraFallbackData =
              workflowDataExtractor.extractCompletionData(currentWorkflowRun);
          } catch (error) {
            console.warn('Error extracting ultra fallback data:', error);
            ultraFallbackData = {
              orderId:
                currentWorkflowRun.orderId || 'ULTRA-FALLBACK-' + Date.now(),
              model: 'Order Processing Complete',
              quantity: 1,
              deliveryLocation: 'Processing Complete',
              totalAmount: 'See workflow details',
              paymentLink: '',
              blockchainTxHash: '',
              buyerEmail: 'See workflow logs',
            };
          }

          setCompletionData(ultraFallbackData);
          setShowCompletionCard(true);
          console.log(
            '🎉 ULTRA AGGRESSIVE: Completion card shown based on completion indicators'
          );
          return;
        }
      }

      // FINAL SAFETY NET: Time-based completion detection
      setCompletionCheckCount((prev) => prev + 1);

      // If we've checked multiple times and have a reasonable workflow, show completion
      if (completionCheckCount >= 3 && completedSteps.length >= 2) {
        console.log(
          '🕐 TIME-BASED FALLBACK: Multiple checks performed with reasonable progress, showing completion card'
        );

        let timeFallbackData;
        try {
          timeFallbackData =
            workflowDataExtractor.extractCompletionData(currentWorkflowRun);
        } catch (error) {
          console.warn('Error extracting time fallback data:', error);
          timeFallbackData = {
            orderId:
              currentWorkflowRun.orderId || 'TIME-FALLBACK-' + Date.now(),
            model: 'Order Processing Complete',
            quantity: 1,
            deliveryLocation: 'Processing Complete',
            totalAmount: 'See workflow details',
            paymentLink: '',
            blockchainTxHash: '',
            buyerEmail: 'See workflow logs',
          };
        }

        setCompletionData(timeFallbackData);
        setShowCompletionCard(true);
        console.log(
          '🎉 TIME-BASED FALLBACK: Completion card shown after multiple checks'
        );
        return;
      }

      console.log(
        `🔍 ENHANCED: No completion conditions met after all checks (check #${completionCheckCount})`
      );
    } catch (error) {
      console.error('❌ Error in simplified completion detection:', error);
      console.log(
        '⚠️ Completion detection failed, but continuing workflow operation'
      );
    }

    // Cleanup function
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, [
    currentWorkflowRun?.id,
    currentWorkflowRun?.status,
    currentWorkflowRun?.steps,
    showCompletionCard,
  ]);

  // Memoized completion card close handler
  const handleCompletionCardClose = useCallback(() => {
    if (currentWorkflowRun) {
      markCompletionCardDismissed(currentWorkflowRun.id);
      completionStateManager.markCompletionCardDismissed(currentWorkflowRun.id);
    }
    setShowCompletionCard(false);

    // Delayed cleanup to allow for animation
    setTimeout(() => {
      if (mountedRef.current) {
        setCompletionData(null);
      }
    }, 500);
  }, [currentWorkflowRun, markCompletionCardDismissed]);

  // Memoized workflow run change handler
  const handleWorkflowRunChange = useCallback(
    (runId: string) => {
      selectWorkflowRun(runId);
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('runId', runId);
        return newParams;
      });
    },
    [selectWorkflowRun, setSearchParams]
  );

  // Animation variants
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    },
  };

  // Setup debug functions
  useEffect(() => {
    // Debug current state function
    (window as any).debugWorkflowState = () => {
      console.log('🔍 DEBUG: Current workflow state:', {
        currentWorkflowRun: currentWorkflowRun
          ? {
              id: currentWorkflowRun.id,
              status: currentWorkflowRun.status,
              progress: currentWorkflowRun.progress,
              stepsCount: currentWorkflowRun.steps?.length || 0,
              completedSteps: currentWorkflowRun.completedSteps,
              steps: currentWorkflowRun.steps?.map((s) => ({
                id: s.id,
                name: s.name,
                status: s.status,
                toolName: s.toolName,
              })),
            }
          : null,
        showCompletionCard,
        hasCompletionData: !!completionData,
        workflowStepsCount: workflowSteps.length,
      });
    };

    // Email completion check function
    (window as any).checkEmailCompletion = () => {
      if (!currentWorkflowRun) {
        console.log('❌ No current workflow run');
        return;
      }

      const emailSteps = currentWorkflowRun.steps?.filter(
        (s: any) =>
          s.toolName?.includes('Email') ||
          s.name?.includes('Email') ||
          s.toolName === 'Portia Google Send Email Tool'
      );

      console.log(
        '📧 Email steps found:',
        emailSteps?.map((s: any) => ({
          id: s.id,
          name: s.name,
          toolName: s.toolName,
          status: s.status,
          output: s.output ? String(s.output).substring(0, 200) : null,
        }))
      );

      const hasEmailConfirmation =
        currentWorkflowRun.steps?.some((step: any) => {
          try {
            if (!step.output) return false;
            const output = String(step.output);
            return (
              output.includes('Sent email with id:') ||
              output.includes('198e4106513e231c') ||
              (step.toolName === 'Portia Google Send Email Tool' &&
                step.status === 'completed')
            );
          } catch (error) {
            console.warn('Error in debug email confirmation check:', error);
            return false;
          }
        }) || false;

      console.log('📧 Email confirmation status:', hasEmailConfirmation);
      return hasEmailConfirmation;
    };

    // Email completion trigger function
    (window as any).triggerEmailCompletion = () => {
      if (!currentWorkflowRun) {
        console.log('❌ No current workflow run');
        return;
      }

      console.log('📧 MANUAL: Triggering email completion detection');

      // Find or create an email step
      const emailStep = currentWorkflowRun.steps?.find(
        (step: any) =>
          step.toolName === 'Portia Google Send Email Tool' ||
          step.toolName?.toLowerCase().includes('email')
      );

      if (emailStep) {
        console.log('📧 Found email step:', emailStep.id, emailStep.status);

        if (emailStep.status === 'completed') {
          console.log(
            '📧 Email step already completed, triggering completion card'
          );

          try {
            const completionData =
              workflowDataExtractor.extractCompletionData(currentWorkflowRun);
            setCompletionData(completionData);
            setShowCompletionCard(true);
            console.log('📧 Completion card triggered from email step');
          } catch (error) {
            console.error('❌ Error extracting data:', error);
            (window as any).forceShowCompletionCard();
          }
        } else {
          console.log('📧 Email step not completed yet:', emailStep.status);
        }
      } else {
        console.log('📧 No email step found, using force show instead');
        (window as any).forceShowCompletionCard();
      }
    };
  }, [currentWorkflowRun, showCompletionCard, completionData, workflowSteps]);

  // Error boundary UI
  if (error) {
    return (
      <div className='p-6 max-w-4xl mx-auto'>
        <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
          <h2 className='text-lg font-semibold text-red-800 dark:text-red-200 mb-2'>
            Workflow Error
          </h2>
          <p className='text-red-600 dark:text-red-300 mb-4'>{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors'
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className='p-6 max-w-4xl mx-auto'
      variants={pageVariants}
      initial='hidden'
      animate='visible'
      role='main'
      aria-label='Workflow visualization page'
    >
      {/* Workflow Run Selection */}
      {availableRuns.length > 1 && (
        <div className='mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <h3 className='text-sm font-medium' id='workflow-runs-label'>
                Active Workflow Runs
              </h3>
              <Badge
                variant='outline'
                aria-label={`${availableRuns.length} active workflow runs`}
              >
                {availableRuns.length} active
              </Badge>
            </div>
            <Select
              value={currentWorkflowRun?.id || ''}
              onValueChange={handleWorkflowRunChange}
              aria-labelledby='workflow-runs-label'
            >
              <SelectTrigger className='w-64' aria-label='Select workflow run'>
                <SelectValue placeholder='Select workflow run' />
              </SelectTrigger>
              <SelectContent>
                {availableRuns.map((run) => (
                  <SelectItem
                    key={run.id}
                    value={run.id}
                    aria-label={`Workflow run ${run.orderId} - ${run.status}`}
                  >
                    <div className='flex items-center gap-2'>
                      <Badge
                        variant={
                          run.status === 'running' ? 'default' : 'secondary'
                        }
                        className='text-xs'
                        aria-label={`Status: ${run.status}`}
                      >
                        {run.status}
                      </Badge>
                      <span>{run.orderId}</span>
                      <span className='text-xs text-slate-500'>
                        ({new Date(run.startTime).toLocaleTimeString()})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Workflow Progress Overview */}
      <div className='mb-8 p-6 bg-gradient-to-r from-sky-500/10 via-cyan-400/5 to-fuchsia-500/10 rounded-2xl border border-slate-200 dark:border-slate-700'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <h2 className='text-lg font-semibold'>Order Processing Pipeline</h2>
            {currentWorkflowRun && (
              <div className='flex items-center gap-2'>
                <Badge
                  variant={
                    workflowProgress.status === 'running'
                      ? 'default'
                      : workflowProgress.status === 'completed'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {currentWorkflowRun.orderId}
                </Badge>
                <Badge variant='outline' className='text-xs'>
                  {workflowProgress.status}
                </Badge>
              </div>
            )}
            {!currentWorkflowRun && (
              <Badge variant='outline'>No active workflow</Badge>
            )}
          </div>
          <div className='flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300'>
            <span>
              Progress: {workflowProgress.completed}/{workflowProgress.total}{' '}
              steps
            </span>
            {elapsedTime && (
              <>
                <span>•</span>
                <span>Elapsed: {elapsedTime}</span>
              </>
            )}
            {workflowProgress.startTime && (
              <>
                <span>•</span>
                <span>
                  Started:{' '}
                  {new Date(workflowProgress.startTime).toLocaleTimeString()}
                </span>
              </>
            )}
          </div>
        </div>

        <div className='w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2'>
          <motion.div
            className='bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full'
            initial={{ width: 0 }}
            animate={{ width: `${workflowProgress.percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* No Workflow State */}
      {!currentWorkflowRun && availableRuns.length === 0 && (
        <div className='mb-8 p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700'>
          <h3 className='text-lg font-medium mb-2'>No Active Workflows</h3>
          <p className='text-slate-600 dark:text-slate-300 mb-4'>
            Start processing an order to see the workflow visualization here.
          </p>
          <Button
            onClick={() => navigate('/orders')}
            variant='outline'
            aria-label='Navigate to orders page to start a new workflow'
          >
            Go to Orders
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className='mb-8 p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-slate-600 dark:text-slate-300'>
            Loading workflow data...
          </p>
        </div>
      )}

      {/* Active Clarification Notifications */}
      <ClarificationNotification
        clarificationLogs={clarificationLogs}
        className='mb-6'
        onDismiss={(clarificationId) => {
          console.log('Dismissed clarification:', clarificationId);
        }}
      />

      {/* Workflow Tabs */}
      <Tabs defaultValue='current' className='space-y-6'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='current'>Current Workflow</TabsTrigger>
          <TabsTrigger value='logs'>Live Logs</TabsTrigger>
          <TabsTrigger value='demo'>Interactive Demo</TabsTrigger>
        </TabsList>

        <TabsContent value='current' className='space-y-6'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold'>Current Pipeline Steps</h2>
            {currentWorkflowRun && (
              <div className='flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300'>
                <span>Run ID: {currentWorkflowRun.id}</span>
                {workflowProgress.currentStep && (
                  <>
                    <span>•</span>
                    <span>Current: {workflowProgress.currentStep}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {workflowSteps.length > 0 ? (
            <div
              className={`transition-opacity duration-300 ${
                isStepTransitioning ? 'opacity-75' : 'opacity-100'
              }`}
            >
              <WorkflowStepper
                steps={workflowSteps}
                currentStep={selectedStep}
                onStepClick={handleStepClick}
                orientation='vertical'
                aria-label='Workflow steps visualization'
                className='workflow-stepper'
              />
            </div>
          ) : (
            <div className='p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700'>
              <h3 className='text-lg font-medium mb-2'>
                Loading Workflow Steps
              </h3>
              <p className='text-slate-600 dark:text-slate-300 mb-4'>
                {currentWorkflowRun
                  ? 'Processing workflow steps...'
                  : 'Waiting for workflow to start...'}
              </p>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
            </div>
          )}
        </TabsContent>

        <TabsContent value='logs' className='space-y-6'>
          <h2 className='text-xl font-semibold'>Workflow Log Stream</h2>
          <p className='text-slate-600 dark:text-slate-300 mb-4'>
            Real-time log stream showing all workflow step activities and system
            events.
          </p>

          <LogStream
            logs={allLogs}
            title='Workflow Processing Logs'
            maxHeight={600}
            autoScroll={true}
            filterable={true}
            searchable={true}
            virtualized={true}
            showControls={true}
            onLogClick={(log) => {
              console.log('Log clicked:', log);
              // Could add log detail modal here
            }}
            aria-label='Real-time workflow processing logs'
            className='workflow-logs'
          />
        </TabsContent>

        <TabsContent value='demo' className='space-y-6'>
          <h2 className='text-xl font-semibold'>Interactive Workflow Demo</h2>
          <p className='text-slate-600 dark:text-slate-300 mb-4'>
            Experience how the workflow stepper animates and updates in
            real-time during order processing.
          </p>

          {/* Debug Information Panel */}
          {process.env.NODE_ENV === 'development' && (
            <div className='mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
              <h3 className='text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2'>
                Workflow Debug Information
              </h3>
              <div className='text-xs text-blue-700 dark:text-blue-300 space-y-1'>
                <div>Current Run: {currentWorkflowRun?.id || 'None'}</div>
                <div>
                  Raw Steps Count: {currentWorkflowRun?.steps?.length || 0}
                </div>
                <div>Processed Steps Count: {workflowSteps.length}</div>
                <div>Selected Step: {selectedStep || 'None'}</div>
                <div>
                  Workflow Status: {currentWorkflowRun?.status || 'N/A'}
                </div>
                <div>Progress: {workflowProgress.percentage.toFixed(1)}%</div>
                <div>Available Runs: {availableRuns.length}</div>
                <div>
                  Step IDs: [{workflowSteps.map((s) => s.id).join(', ')}]
                </div>
                <div>
                  Step Statuses: [
                  {workflowSteps.map((s) => `${s.id}:${s.status}`).join(', ')}]
                </div>
              </div>
            </div>
          )}

          {/* Debug Information Panel */}
          {process.env.NODE_ENV === 'development' && (
            <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
              <h3 className='text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2'>
                Debug Information
              </h3>
              <div className='text-xs text-yellow-700 dark:text-yellow-300 space-y-1'>
                <div>Current Run: {currentWorkflowRun?.id || 'None'}</div>
                <div>Steps Count: {workflowSteps.length}</div>
                <div>Selected Step: {selectedStep || 'None'}</div>
                <div>
                  Completion Card: {showCompletionCard ? 'Visible' : 'Hidden'}
                </div>
                <div>Has Completion Data: {completionData ? 'Yes' : 'No'}</div>
                <div>
                  Workflow Status: {currentWorkflowRun?.status || 'N/A'}
                </div>
                <div>Progress: {workflowProgress.percentage.toFixed(1)}%</div>
                <div>
                  Completion Card: {showCompletionCard ? 'Visible' : 'Hidden'}
                </div>
                <div>Has Completion Data: {completionData ? 'Yes' : 'No'}</div>
                <div className='mt-2 space-x-2'>
                  <button
                    onClick={() => {
                      if (currentWorkflowRun) {
                        const result = (
                          window as any
                        ).debugOrderCompletionCard?.(currentWorkflowRun);
                        console.log('🧪 Debug result:', result);
                      }
                    }}
                    className='px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600'
                  >
                    Debug Completion
                  </button>
                  <button
                    onClick={() => {
                      if (currentWorkflowRun) {
                        try {
                          const rawOrderData =
                            workflowDataExtractor.extractCompletionData(
                              currentWorkflowRun
                            );

                          const validationResult =
                            orderCompletionDataValidator.validate(
                              rawOrderData,
                              {
                                allowPartialData: true,
                                strictEmailValidation: false,
                              }
                            );

                          console.log(
                            '🧪 Manual trigger - Raw data:',
                            rawOrderData
                          );
                          console.log(
                            '🧪 Manual trigger - Validation result:',
                            validationResult
                          );

                          setCompletionData(validationResult.validatedData);
                          setShowCompletionCard(true);

                          console.log(
                            '🧪 Manually triggered completion card with validated data:',
                            validationResult.validatedData
                          );
                        } catch (error) {
                          console.error('🧪 Manual trigger failed:', error);

                          // Create partial data as fallback
                          const partialData =
                            orderCompletionDataValidator.createPartialCompletionData(
                              {},
                              currentWorkflowRun.id
                            );

                          setCompletionData(partialData);
                          setShowCompletionCard(true);

                          console.log(
                            '🧪 Using partial completion data:',
                            partialData
                          );
                        }
                      }
                    }}
                    className='px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600'
                  >
                    Force Show Card
                  </button>
                  <button
                    onClick={() => {
                      console.log(
                        '🚀 DIRECT: Forcing completion card with minimal data'
                      );
                      const directData = {
                        orderId: currentWorkflowRun?.id || 'test-order',
                        model: 'Test Product',
                        quantity: 1,
                        deliveryLocation: 'Test Location',
                        totalAmount: '$100.00',
                        paymentLink: 'https://checkout.stripe.com/pay/test123',
                        blockchainTxHash:
                          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                        buyerEmail: 'test@example.com',
                      };
                      setCompletionData(directData);
                      setShowCompletionCard(true);
                      console.log(
                        '🚀 DIRECT: Completion card should now be visible'
                      );
                    }}
                    className='px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600'
                  >
                    DIRECT Show
                  </button>
                </div>
              </div>
            </div>
          )}

          <WorkflowTestControls />
          <StepHighlightingTest />
          <WorkflowDebugControls />
          <WorkflowDemo />
        </TabsContent>
      </Tabs>

      {/* Order Completion Card with Error Boundary */}
      {completionData && (
        <OrderCompletionCardErrorBoundary
          onClose={handleCompletionCardClose}
          fallbackData={{
            orderId: completionData.orderId,
            buyerEmail: completionData.buyerEmail,
            paymentLink: completionData.paymentLink,
            blockchainTxHash: completionData.blockchainTxHash,
          }}
        >
          <OrderCompletionCard
            isVisible={showCompletionCard}
            onClose={handleCompletionCardClose}
            orderData={completionData}
            aria-label='Order completion notification'
          />
        </OrderCompletionCardErrorBoundary>
      )}
    </motion.div>
  );
};

export default Workflow;
