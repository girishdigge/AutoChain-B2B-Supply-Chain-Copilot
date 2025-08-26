import type { AppState, WorkflowRun, CompletionState } from '../types';
import { orderCompletionDataValidator } from './OrderCompletionDataValidator';

/**
 * State recovery data interface
 */
export interface RecoveryData {
  timestamp: string;
  clientId: string;
  workflowRuns: Record<string, WorkflowRun>;
  completionStates: Record<string, CompletionState>;
  selectedWorkflowRun?: string;
  lastWebSocketStatus: string;
}

/**
 * Recovery configuration interface
 */
export interface RecoveryConfig {
  enablePersistence?: boolean;
  maxRecoveryAge?: number; // in milliseconds
  storageKey?: string;
  enableCrossTabSync?: boolean;
  enableCompletionStateRecovery?: boolean;
}

/**
 * WebSocketStateRecovery - Manages state persistence and recovery across websocket reconnections
 *
 * Features:
 * - Persists workflow state to localStorage
 * - Recovers state on websocket reconnection
 * - Synchronizes state across browser tabs
 * - Validates and sanitizes recovered data
 * - Handles completion state recovery
 */
export class WebSocketStateRecovery {
  private readonly DEFAULT_CONFIG: RecoveryConfig = {
    enablePersistence: true,
    maxRecoveryAge: 24 * 60 * 60 * 1000, // 24 hours
    storageKey: 'portia-workflow-state',
    enableCrossTabSync: true,
    enableCompletionStateRecovery: true,
  };

  private config: RecoveryConfig;
  private storageEventListener?: (event: StorageEvent) => void;
  private isRecovering = false;

  constructor(config: RecoveryConfig = {}) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };

    if (this.config.enableCrossTabSync) {
      this.setupCrossTabSync();
    }

    console.log(
      '🔄 WebSocketStateRecovery initialized with config:',
      this.config
    );
  }

  /**
   * Persists current workflow state to localStorage
   */
  persistState(state: AppState): void {
    if (!this.config.enablePersistence) {
      return;
    }

    try {
      const recoveryData: RecoveryData = {
        timestamp: new Date().toISOString(),
        clientId: state.websocket.clientId,
        workflowRuns: state.workflow.activeRuns,
        completionStates: state.workflow.completionStates,
        selectedWorkflowRun: state.workflow.selectedRun,
        lastWebSocketStatus: state.websocket.status,
      };

      const serializedData = JSON.stringify(recoveryData);
      localStorage.setItem(this.config.storageKey!, serializedData);

      console.log('💾 State persisted to localStorage:', {
        timestamp: recoveryData.timestamp,
        workflowRunsCount: Object.keys(recoveryData.workflowRuns).length,
        completionStatesCount: Object.keys(recoveryData.completionStates)
          .length,
        selectedRun: recoveryData.selectedWorkflowRun,
      });
    } catch (error) {
      console.error('❌ Failed to persist state to localStorage:', error);
    }
  }

  /**
   * Recovers workflow state from localStorage
   */
  recoverState(currentClientId: string): RecoveryData | null {
    if (!this.config.enablePersistence) {
      return null;
    }

    try {
      const serializedData = localStorage.getItem(this.config.storageKey!);
      if (!serializedData) {
        console.log('📭 No persisted state found in localStorage');
        return null;
      }

      const recoveryData: RecoveryData = JSON.parse(serializedData);

      // Validate recovery data age
      const dataAge = Date.now() - new Date(recoveryData.timestamp).getTime();
      if (dataAge > this.config.maxRecoveryAge!) {
        console.log('⏰ Persisted state is too old, ignoring recovery data:', {
          dataAge: Math.round(dataAge / 1000 / 60),
          maxAge: Math.round(this.config.maxRecoveryAge! / 1000 / 60),
        });
        this.clearPersistedState();
        return null;
      }

      // Validate client ID (optional - allow recovery from different clients)
      if (recoveryData.clientId !== currentClientId) {
        console.log('🔄 Client ID mismatch in recovery data:', {
          stored: recoveryData.clientId,
          current: currentClientId,
        });
        // Continue with recovery anyway - might be useful for debugging
      }

      console.log('🔄 State recovery data found:', {
        timestamp: recoveryData.timestamp,
        dataAge: Math.round(dataAge / 1000 / 60),
        workflowRunsCount: Object.keys(recoveryData.workflowRuns).length,
        completionStatesCount: Object.keys(recoveryData.completionStates)
          .length,
        selectedRun: recoveryData.selectedWorkflowRun,
      });

      // Validate and sanitize the recovered data
      const validatedData = this.validateRecoveryData(recoveryData);
      return validatedData;
    } catch (error) {
      console.error('❌ Failed to recover state from localStorage:', error);
      this.clearPersistedState();
      return null;
    }
  }

  /**
   * Applies recovered state to the app state
   */
  applyRecoveredState(
    recoveryData: RecoveryData,
    dispatch: React.Dispatch<any>
  ): void {
    if (this.isRecovering) {
      console.log('🔄 Recovery already in progress, skipping');
      return;
    }

    this.isRecovering = true;

    try {
      console.log('🔄 Applying recovered state...');

      // Recover workflow runs
      Object.entries(recoveryData.workflowRuns).forEach(
        ([runId, workflowRun]) => {
          console.log(`🔄 Recovering workflow run: ${runId}`);
          dispatch({
            type: 'ADD_WORKFLOW_RUN',
            payload: workflowRun,
          });
        }
      );

      // Recover completion states if enabled
      if (this.config.enableCompletionStateRecovery) {
        Object.entries(recoveryData.completionStates).forEach(
          ([runId, completionState]) => {
            console.log(`🔄 Recovering completion state for run: ${runId}`);
            dispatch({
              type: 'SET_COMPLETION_STATE',
              payload: { runId, state: completionState },
            });
          }
        );
      }

      // Recover selected workflow run
      if (recoveryData.selectedWorkflowRun) {
        console.log(
          `🔄 Recovering selected workflow run: ${recoveryData.selectedWorkflowRun}`
        );
        dispatch({
          type: 'SELECT_WORKFLOW_RUN',
          payload: recoveryData.selectedWorkflowRun,
        });
      }

      console.log('✅ State recovery completed successfully');
    } catch (error) {
      console.error('❌ Failed to apply recovered state:', error);
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Recovers completion card state and triggers display if needed
   */
  recoverCompletionCardState(
    recoveryData: RecoveryData,
    setCompletionData: (data: any) => void,
    setShowCompletionCard: (show: boolean) => void
  ): void {
    if (!this.config.enableCompletionStateRecovery) {
      return;
    }

    try {
      console.log('🎯 Checking for completion card recovery...');

      // Find completion states that should show the card
      Object.entries(recoveryData.completionStates).forEach(
        ([runId, completionState]) => {
          if (
            completionState.isCompleted &&
            !completionState.hasShownCard &&
            !completionState.cardDismissed
          ) {
            console.log(
              `🎯 Found completion state that should show card for run: ${runId}`
            );

            // Find the corresponding workflow run
            const workflowRun = recoveryData.workflowRuns[runId];
            if (workflowRun && completionState.completionData) {
              console.log('🎯 Recovering completion card display...');

              // Validate the completion data
              const validationResult = orderCompletionDataValidator.validate(
                completionState.completionData,
                {
                  allowPartialData: true,
                  strictEmailValidation: false,
                }
              );

              if (
                validationResult.isValid ||
                validationResult.warnings.length === 0
              ) {
                setCompletionData(validationResult.validatedData);
                setShowCompletionCard(true);

                console.log('✅ Completion card recovered and displayed');
              } else {
                console.warn(
                  '⚠️ Completion data validation failed during recovery:',
                  validationResult.errors
                );
              }
            }
          }
        }
      );
    } catch (error) {
      console.error('❌ Failed to recover completion card state:', error);
    }
  }

  /**
   * Clears persisted state from localStorage
   */
  clearPersistedState(): void {
    try {
      localStorage.removeItem(this.config.storageKey!);
      console.log('🗑️ Persisted state cleared from localStorage');
    } catch (error) {
      console.error('❌ Failed to clear persisted state:', error);
    }
  }

  /**
   * Sets up cross-tab synchronization
   */
  private setupCrossTabSync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.storageEventListener = (event: StorageEvent) => {
      if (event.key === this.config.storageKey && event.newValue) {
        try {
          const recoveryData: RecoveryData = JSON.parse(event.newValue);
          console.log('🔄 Cross-tab state sync detected:', {
            timestamp: recoveryData.timestamp,
            workflowRunsCount: Object.keys(recoveryData.workflowRuns).length,
          });

          // Emit custom event for cross-tab sync
          window.dispatchEvent(
            new CustomEvent('portia-state-sync', {
              detail: recoveryData,
            })
          );
        } catch (error) {
          console.error('❌ Failed to parse cross-tab sync data:', error);
        }
      }
    };

    window.addEventListener('storage', this.storageEventListener);
    console.log('🔄 Cross-tab synchronization enabled');
  }

  /**
   * Validates and sanitizes recovery data
   */
  private validateRecoveryData(data: RecoveryData): RecoveryData {
    const validatedData: RecoveryData = {
      timestamp: data.timestamp || new Date().toISOString(),
      clientId: data.clientId || 'unknown',
      workflowRuns: {},
      completionStates: {},
      selectedWorkflowRun: data.selectedWorkflowRun,
      lastWebSocketStatus: data.lastWebSocketStatus || 'disconnected',
    };

    // Validate workflow runs
    if (data.workflowRuns && typeof data.workflowRuns === 'object') {
      Object.entries(data.workflowRuns).forEach(([runId, workflowRun]) => {
        if (this.isValidWorkflowRun(workflowRun)) {
          validatedData.workflowRuns[runId] = workflowRun;
        } else {
          console.warn(`🚫 Invalid workflow run data for ${runId}, skipping`);
        }
      });
    }

    // Validate completion states
    if (data.completionStates && typeof data.completionStates === 'object') {
      Object.entries(data.completionStates).forEach(
        ([runId, completionState]) => {
          if (this.isValidCompletionState(completionState)) {
            validatedData.completionStates[runId] = completionState;
          } else {
            console.warn(
              `🚫 Invalid completion state data for ${runId}, skipping`
            );
          }
        }
      );
    }

    console.log('✅ Recovery data validated:', {
      validWorkflowRuns: Object.keys(validatedData.workflowRuns).length,
      validCompletionStates: Object.keys(validatedData.completionStates).length,
    });

    return validatedData;
  }

  /**
   * Validates a workflow run object
   */
  private isValidWorkflowRun(workflowRun: any): workflowRun is WorkflowRun {
    return (
      workflowRun &&
      typeof workflowRun === 'object' &&
      typeof workflowRun.id === 'string' &&
      typeof workflowRun.status === 'string' &&
      Array.isArray(workflowRun.steps)
    );
  }

  /**
   * Validates a completion state object
   */
  private isValidCompletionState(
    completionState: any
  ): completionState is CompletionState {
    return (
      completionState &&
      typeof completionState === 'object' &&
      typeof completionState.isCompleted === 'boolean' &&
      typeof completionState.hasShownCard === 'boolean' &&
      typeof completionState.cardDismissed === 'boolean'
    );
  }

  /**
   * Creates a recovery checkpoint for a specific workflow run
   */
  createRecoveryCheckpoint(
    workflowRun: WorkflowRun,
    completionState?: CompletionState
  ): void {
    if (!this.config.enablePersistence) {
      return;
    }

    try {
      const existingData = this.recoverState(workflowRun.id) || {
        timestamp: new Date().toISOString(),
        clientId: workflowRun.id,
        workflowRuns: {},
        completionStates: {},
        lastWebSocketStatus: 'connected',
      };

      // Update with current workflow run
      existingData.workflowRuns[workflowRun.id] = workflowRun;
      existingData.timestamp = new Date().toISOString();

      // Update completion state if provided
      if (completionState) {
        existingData.completionStates[workflowRun.id] = completionState;
      }

      const serializedData = JSON.stringify(existingData);
      localStorage.setItem(this.config.storageKey!, serializedData);

      console.log(
        '📍 Recovery checkpoint created for workflow run:',
        workflowRun.id
      );
    } catch (error) {
      console.error('❌ Failed to create recovery checkpoint:', error);
    }
  }

  /**
   * Cleanup method to remove event listeners
   */
  cleanup(): void {
    if (this.storageEventListener) {
      window.removeEventListener('storage', this.storageEventListener);
      this.storageEventListener = undefined;
      console.log('🧹 WebSocketStateRecovery cleanup completed');
    }
  }
}

// Export a singleton instance
export const webSocketStateRecovery = new WebSocketStateRecovery();
