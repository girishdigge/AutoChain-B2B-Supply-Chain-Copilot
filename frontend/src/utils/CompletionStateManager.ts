import type { WorkflowRun } from '../types';

export interface CompletionState {
  isCompleted: boolean;
  completionTrigger: 'email' | 'blockchain' | 'manual' | null;
  completionTimestamp: string | null;
  completionData: any | null;
  prematureTriggersBlocked: string[];
  hasShownCard: boolean;
  cardDismissed: boolean;
}

/**
 * CompletionStateManager handles completion state transitions and prevents premature triggers
 */
export class CompletionStateManager {
  private completionStates: Map<string, CompletionState> = new Map();
  private completionTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Gets the completion state for a workflow run
   */
  getCompletionState(runId: string): CompletionState {
    return (
      this.completionStates.get(runId) || {
        isCompleted: false,
        completionTrigger: null,
        completionTimestamp: null,
        completionData: null,
        prematureTriggersBlocked: [],
        hasShownCard: false,
        cardDismissed: false,
      }
    );
  }

  /**
   * Marks completion with a 1-second delay after email completion
   */
  markEmailCompletion(
    runId: string,
    completionData: any,
    onComplete: () => void
  ): void {
    console.log(
      '📧 CompletionStateManager: Marking email completion for run:',
      runId
    );

    // Clear any existing timer
    const existingTimer = this.completionTimers.get(runId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set completion state immediately but delay the callback
    const currentState = this.getCompletionState(runId);
    this.completionStates.set(runId, {
      ...currentState,
      isCompleted: true,
      completionTrigger: 'email',
      completionTimestamp: new Date().toISOString(),
      completionData,
    });

    // Implement 1-second delay before triggering completion card
    const timer = setTimeout(() => {
      console.log(
        '⏰ CompletionStateManager: 1-second delay completed, triggering completion card'
      );

      // Double-check state hasn't changed
      const latestState = this.getCompletionState(runId);
      if (
        latestState.isCompleted &&
        !latestState.hasShownCard &&
        !latestState.cardDismissed
      ) {
        onComplete();
      }

      this.completionTimers.delete(runId);
    }, 1000);

    this.completionTimers.set(runId, timer);
  }

  /**
   * Blocks premature completion attempts and logs them
   */
  blockPrematureCompletion(runId: string, triggerSource: string): void {
    console.log(
      '🚫 CompletionStateManager: Blocking premature completion from:',
      triggerSource
    );

    const currentState = this.getCompletionState(runId);
    const blockedTriggers = [
      ...currentState.prematureTriggersBlocked,
      triggerSource,
    ];

    this.completionStates.set(runId, {
      ...currentState,
      prematureTriggersBlocked: blockedTriggers,
    });

    console.log(
      '📊 CompletionStateManager: Total blocked triggers for run:',
      blockedTriggers.length
    );
  }

  /**
   * Marks that the completion card has been shown
   */
  markCompletionCardShown(runId: string): void {
    console.log(
      '✅ CompletionStateManager: Marking completion card as shown for run:',
      runId
    );

    const currentState = this.getCompletionState(runId);
    this.completionStates.set(runId, {
      ...currentState,
      hasShownCard: true,
    });
  }

  /**
   * Marks that the completion card has been dismissed
   */
  markCompletionCardDismissed(runId: string): void {
    console.log(
      '❌ CompletionStateManager: Marking completion card as dismissed for run:',
      runId
    );

    const currentState = this.getCompletionState(runId);
    this.completionStates.set(runId, {
      ...currentState,
      cardDismissed: true,
    });
  }

  /**
   * Checks if completion should be prevented due to existing state
   */
  shouldPreventCompletion(runId: string): boolean {
    const state = this.getCompletionState(runId);
    const shouldPrevent = state.hasShownCard || state.cardDismissed;

    if (shouldPrevent) {
      console.log(
        '🚫 CompletionStateManager: Preventing completion due to existing state:',
        {
          hasShownCard: state.hasShownCard,
          cardDismissed: state.cardDismissed,
        }
      );
    }

    return shouldPrevent;
  }

  /**
   * Resets completion state for a workflow run
   */
  resetCompletionState(runId: string): void {
    console.log(
      '🔄 CompletionStateManager: Resetting completion state for run:',
      runId
    );

    // Clear any pending timer
    const timer = this.completionTimers.get(runId);
    if (timer) {
      clearTimeout(timer);
      this.completionTimers.delete(runId);
    }

    this.completionStates.delete(runId);
  }

  /**
   * Gets debug information about completion state
   */
  getDebugInfo(runId: string): {
    state: CompletionState;
    hasPendingTimer: boolean;
    blockedTriggersCount: number;
  } {
    const state = this.getCompletionState(runId);
    return {
      state,
      hasPendingTimer: this.completionTimers.has(runId),
      blockedTriggersCount: state.prematureTriggersBlocked.length,
    };
  }

  /**
   * Clears all completion states and timers
   */
  clearAll(): void {
    console.log(
      '🧹 CompletionStateManager: Clearing all completion states and timers'
    );

    // Clear all timers
    this.completionTimers.forEach((timer) => clearTimeout(timer));
    this.completionTimers.clear();

    // Clear all states
    this.completionStates.clear();
  }
}

// Export a singleton instance for global use
export const completionStateManager = new CompletionStateManager();
