import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CompletionStateManager } from '../CompletionStateManager';

describe('CompletionStateManager', () => {
  let manager: CompletionStateManager;
  let mockCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    manager = new CompletionStateManager();
    mockCallback = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    manager.clearAll();
  });

  describe('getCompletionState', () => {
    it('should return default state for new run ID', () => {
      const state = manager.getCompletionState('test-run-1');

      expect(state).toEqual({
        isCompleted: false,
        completionTrigger: null,
        completionTimestamp: null,
        completionData: null,
        prematureTriggersBlocked: [],
        hasShownCard: false,
        cardDismissed: false,
      });
    });

    it('should return existing state for known run ID', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      manager.markEmailCompletion(runId, completionData, mockCallback);

      const state = manager.getCompletionState(runId);
      expect(state.isCompleted).toBe(true);
      expect(state.completionTrigger).toBe('email');
      expect(state.completionData).toEqual(completionData);
    });
  });

  describe('markEmailCompletion', () => {
    it('should mark completion state immediately', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      manager.markEmailCompletion(runId, completionData, mockCallback);

      const state = manager.getCompletionState(runId);
      expect(state.isCompleted).toBe(true);
      expect(state.completionTrigger).toBe('email');
      expect(state.completionData).toEqual(completionData);
      expect(state.completionTimestamp).toBeTruthy();
    });

    it('should trigger callback after 1-second delay', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      manager.markEmailCompletion(runId, completionData, mockCallback);

      // Callback should not be called immediately
      expect(mockCallback).not.toHaveBeenCalled();

      // Fast-forward 1 second
      vi.advanceTimersByTime(1000);

      // Callback should now be called
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should not trigger callback if card already shown', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      // Mark card as shown first
      manager.markCompletionCardShown(runId);

      manager.markEmailCompletion(runId, completionData, mockCallback);

      // Fast-forward 1 second
      vi.advanceTimersByTime(1000);

      // Callback should not be called
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should not trigger callback if card dismissed', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      // Mark card as dismissed first
      manager.markCompletionCardDismissed(runId);

      manager.markEmailCompletion(runId, completionData, mockCallback);

      // Fast-forward 1 second
      vi.advanceTimersByTime(1000);

      // Callback should not be called
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should clear existing timer when called multiple times', () => {
      const runId = 'test-run-1';
      const completionData1 = { orderId: 'order-123' };
      const completionData2 = { orderId: 'order-456' };
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // First call
      manager.markEmailCompletion(runId, completionData1, callback1);

      // Second call before first timer expires
      vi.advanceTimersByTime(500);
      manager.markEmailCompletion(runId, completionData2, callback2);

      // Fast-forward remaining time
      vi.advanceTimersByTime(1000);

      // Only second callback should be called
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);

      // State should reflect second completion data
      const state = manager.getCompletionState(runId);
      expect(state.completionData).toEqual(completionData2);
    });
  });

  describe('blockPrematureCompletion', () => {
    it('should add trigger source to blocked list', () => {
      const runId = 'test-run-1';
      const triggerSource = 'stripe-payment-tool';

      manager.blockPrematureCompletion(runId, triggerSource);

      const state = manager.getCompletionState(runId);
      expect(state.prematureTriggersBlocked).toContain(triggerSource);
    });

    it('should accumulate multiple blocked triggers', () => {
      const runId = 'test-run-1';
      const triggers = ['stripe-payment-tool', 'finance-tool', 'billing-tool'];

      triggers.forEach((trigger) => {
        manager.blockPrematureCompletion(runId, trigger);
      });

      const state = manager.getCompletionState(runId);
      expect(state.prematureTriggersBlocked).toEqual(triggers);
    });

    it('should not duplicate blocked triggers', () => {
      const runId = 'test-run-1';
      const triggerSource = 'stripe-payment-tool';

      manager.blockPrematureCompletion(runId, triggerSource);
      manager.blockPrematureCompletion(runId, triggerSource);

      const state = manager.getCompletionState(runId);
      expect(state.prematureTriggersBlocked).toEqual([
        triggerSource,
        triggerSource,
      ]);
    });
  });

  describe('markCompletionCardShown', () => {
    it('should mark card as shown', () => {
      const runId = 'test-run-1';

      manager.markCompletionCardShown(runId);

      const state = manager.getCompletionState(runId);
      expect(state.hasShownCard).toBe(true);
    });
  });

  describe('markCompletionCardDismissed', () => {
    it('should mark card as dismissed', () => {
      const runId = 'test-run-1';

      manager.markCompletionCardDismissed(runId);

      const state = manager.getCompletionState(runId);
      expect(state.cardDismissed).toBe(true);
    });
  });

  describe('shouldPreventCompletion', () => {
    it('should return false for new run', () => {
      const runId = 'test-run-1';

      const shouldPrevent = manager.shouldPreventCompletion(runId);

      expect(shouldPrevent).toBe(false);
    });

    it('should return true if card already shown', () => {
      const runId = 'test-run-1';

      manager.markCompletionCardShown(runId);

      const shouldPrevent = manager.shouldPreventCompletion(runId);

      expect(shouldPrevent).toBe(true);
    });

    it('should return true if card dismissed', () => {
      const runId = 'test-run-1';

      manager.markCompletionCardDismissed(runId);

      const shouldPrevent = manager.shouldPreventCompletion(runId);

      expect(shouldPrevent).toBe(true);
    });

    it('should return true if both card shown and dismissed', () => {
      const runId = 'test-run-1';

      manager.markCompletionCardShown(runId);
      manager.markCompletionCardDismissed(runId);

      const shouldPrevent = manager.shouldPreventCompletion(runId);

      expect(shouldPrevent).toBe(true);
    });
  });

  describe('resetCompletionState', () => {
    it('should clear completion state for run', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      // Set up some state
      manager.markEmailCompletion(runId, completionData, mockCallback);
      manager.markCompletionCardShown(runId);
      manager.blockPrematureCompletion(runId, 'stripe-tool');

      // Reset state
      manager.resetCompletionState(runId);

      // Should return to default state
      const state = manager.getCompletionState(runId);
      expect(state).toEqual({
        isCompleted: false,
        completionTrigger: null,
        completionTimestamp: null,
        completionData: null,
        prematureTriggersBlocked: [],
        hasShownCard: false,
        cardDismissed: false,
      });
    });

    it('should clear pending timer', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      manager.markEmailCompletion(runId, completionData, mockCallback);

      // Reset before timer expires
      vi.advanceTimersByTime(500);
      manager.resetCompletionState(runId);

      // Fast-forward remaining time
      vi.advanceTimersByTime(1000);

      // Callback should not be called
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      manager.markEmailCompletion(runId, completionData, mockCallback);
      manager.blockPrematureCompletion(runId, 'stripe-tool');
      manager.blockPrematureCompletion(runId, 'finance-tool');

      const debugInfo = manager.getDebugInfo(runId);

      expect(debugInfo.state.isCompleted).toBe(true);
      expect(debugInfo.hasPendingTimer).toBe(true);
      expect(debugInfo.blockedTriggersCount).toBe(2);
    });

    it('should return correct timer status', () => {
      const runId = 'test-run-1';

      // No timer initially
      let debugInfo = manager.getDebugInfo(runId);
      expect(debugInfo.hasPendingTimer).toBe(false);

      // Timer after marking completion
      manager.markEmailCompletion(runId, {}, mockCallback);
      debugInfo = manager.getDebugInfo(runId);
      expect(debugInfo.hasPendingTimer).toBe(true);

      // No timer after expiration
      vi.advanceTimersByTime(1000);
      debugInfo = manager.getDebugInfo(runId);
      expect(debugInfo.hasPendingTimer).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should clear all states and timers', () => {
      const runId1 = 'test-run-1';
      const runId2 = 'test-run-2';
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // Set up multiple states
      manager.markEmailCompletion(runId1, { orderId: 'order-1' }, callback1);
      manager.markEmailCompletion(runId2, { orderId: 'order-2' }, callback2);

      manager.clearAll();

      // States should be reset to default
      expect(manager.getCompletionState(runId1)).toEqual({
        isCompleted: false,
        completionTrigger: null,
        completionTimestamp: null,
        completionData: null,
        prematureTriggersBlocked: [],
        hasShownCard: false,
        cardDismissed: false,
      });

      expect(manager.getCompletionState(runId2)).toEqual({
        isCompleted: false,
        completionTrigger: null,
        completionTimestamp: null,
        completionData: null,
        prematureTriggersBlocked: [],
        hasShownCard: false,
        cardDismissed: false,
      });

      // Timers should be cleared
      vi.advanceTimersByTime(1000);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('completion state persistence', () => {
    it('should persist state across component re-renders', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      // Mark completion
      manager.markEmailCompletion(runId, completionData, mockCallback);
      manager.markCompletionCardShown(runId);

      // Simulate component re-render by getting state multiple times
      const state1 = manager.getCompletionState(runId);
      const state2 = manager.getCompletionState(runId);
      const state3 = manager.getCompletionState(runId);

      // All states should be identical
      expect(state1).toEqual(state2);
      expect(state2).toEqual(state3);
      expect(state1.hasShownCard).toBe(true);
      expect(state1.isCompleted).toBe(true);
    });

    it('should prevent duplicate triggers on re-renders', () => {
      const runId = 'test-run-1';
      const completionData = { orderId: 'order-123' };

      // Mark completion and show card
      manager.markEmailCompletion(runId, completionData, mockCallback);
      vi.advanceTimersByTime(1000); // Let timer expire
      manager.markCompletionCardShown(runId);

      // Simulate multiple re-render attempts to trigger completion
      const shouldPrevent1 = manager.shouldPreventCompletion(runId);
      const shouldPrevent2 = manager.shouldPreventCompletion(runId);
      const shouldPrevent3 = manager.shouldPreventCompletion(runId);

      // All should prevent completion
      expect(shouldPrevent1).toBe(true);
      expect(shouldPrevent2).toBe(true);
      expect(shouldPrevent3).toBe(true);
    });
  });

  describe('completion trigger logging', () => {
    it('should track premature completion attempts', () => {
      const runId = 'test-run-1';
      const triggers = [
        'StripePaymentTool',
        'FinanceTool',
        'BillingTool',
        'CheckoutTool',
      ];

      triggers.forEach((trigger) => {
        manager.blockPrematureCompletion(runId, trigger);
      });

      const debugInfo = manager.getDebugInfo(runId);
      expect(debugInfo.state.prematureTriggersBlocked).toEqual(triggers);
      expect(debugInfo.blockedTriggersCount).toBe(triggers.length);
    });

    it('should maintain trigger log across state updates', () => {
      const runId = 'test-run-1';

      // Block some triggers
      manager.blockPrematureCompletion(runId, 'stripe-tool');
      manager.blockPrematureCompletion(runId, 'finance-tool');

      // Mark completion
      manager.markEmailCompletion(
        runId,
        { orderId: 'order-123' },
        mockCallback
      );

      // Show card
      manager.markCompletionCardShown(runId);

      // Blocked triggers should still be tracked
      const state = manager.getCompletionState(runId);
      expect(state.prematureTriggersBlocked).toEqual([
        'stripe-tool',
        'finance-tool',
      ]);
    });
  });
});
