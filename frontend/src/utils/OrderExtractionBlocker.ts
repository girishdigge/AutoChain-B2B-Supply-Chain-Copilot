/**
 * Global OrderExtractionTool Blocker
 *
 * This utility provides a global mechanism to prevent duplicate OrderExtractionTool
 * events from being processed, regardless of timing or status differences.
 */

interface BlockedEvent {
  runId: string;
  timestamp: number;
  toolName: string;
  status: string;
}

class OrderExtractionBlocker {
  private processedEvents: BlockedEvent[] = [];
  private readonly BLOCK_DURATION_MS = 30000; // 30 seconds

  /**
   * Check if an OrderExtractionTool event should be blocked for a specific run
   */
  shouldBlockOrderExtraction(
    runId: string,
    toolName: string,
    status: string
  ): boolean {
    // Clean up old events first
    this.cleanupOldEvents();

    const isOrderExtractionTool =
      toolName === 'OrderExtractionTool' ||
      (toolName && toolName.toLowerCase().includes('orderextraction')) ||
      (toolName && toolName.toLowerCase().includes('order extraction'));

    if (!isOrderExtractionTool) {
      return false; // Not an OrderExtractionTool, don't block
    }

    // Check if we've already processed an OrderExtractionTool event for this run
    const existingEvent = this.processedEvents.find(
      (event) =>
        event.runId === runId && this.isOrderExtractionEvent(event.toolName)
    );

    if (existingEvent) {
      console.log(
        '🚫 GLOBAL BLOCKER: Found existing OrderExtractionTool event, blocking duplicate'
      );
      console.log('🚫 GLOBAL BLOCKER: Existing event:', existingEvent);
      console.log('🚫 GLOBAL BLOCKER: Current event:', {
        runId,
        toolName,
        status,
      });
      return true; // Block this duplicate
    }

    // This is the first OrderExtractionTool event for this run, allow it
    console.log(
      '✅ GLOBAL BLOCKER: First OrderExtractionTool event for run, allowing:',
      runId.slice(-8)
    );
    this.recordEvent(runId, toolName, status);

    return false; // Allow this first event
  }

  /**
   * Record a processed OrderExtractionTool event
   */
  private recordEvent(runId: string, toolName: string, status: string): void {
    this.processedEvents.push({
      runId,
      timestamp: Date.now(),
      toolName,
      status,
    });

    console.log('📝 GLOBAL BLOCKER: Recorded OrderExtractionTool event:', {
      runId: runId.slice(-8),
      toolName,
      status,
      totalEvents: this.processedEvents.length,
    });
  }

  /**
   * Check if a tool name represents an OrderExtractionTool
   */
  private isOrderExtractionEvent(toolName: string): boolean {
    if (!toolName) return false;

    return (
      toolName === 'OrderExtractionTool' ||
      toolName.toLowerCase().includes('orderextraction') ||
      toolName.toLowerCase().includes('order extraction')
    );
  }

  /**
   * Clean up old events to prevent memory leaks
   */
  private cleanupOldEvents(): void {
    const now = Date.now();
    const initialCount = this.processedEvents.length;

    this.processedEvents = this.processedEvents.filter(
      (event) => now - event.timestamp < this.BLOCK_DURATION_MS
    );

    if (this.processedEvents.length < initialCount) {
      console.log('🧹 GLOBAL BLOCKER: Cleaned up old events:', {
        removed: initialCount - this.processedEvents.length,
        remaining: this.processedEvents.length,
      });
    }
  }

  /**
   * Reset blocking for a specific run (useful when workflow completes)
   */
  resetRun(runId: string): void {
    this.processedEvents = this.processedEvents.filter(
      (event) => event.runId !== runId
    );

    console.log('🔄 GLOBAL BLOCKER: Reset blocking for run:', runId.slice(-8));
  }

  /**
   * Get debug information about the current state
   */
  getDebugInfo(): {
    processedEvents: number;
    processedRunIds: string[];
    recentEvents: BlockedEvent[];
  } {
    const processedRunIds = [
      ...new Set(this.processedEvents.map((e) => e.runId)),
    ];
    return {
      processedEvents: this.processedEvents.length,
      processedRunIds: processedRunIds.map((id) => id.slice(-8)),
      recentEvents: this.processedEvents.slice(-5), // Last 5 events
    };
  }

  /**
   * Force allow an OrderExtractionTool event (for testing)
   */
  forceAllow(runId: string): void {
    this.processedEvents = this.processedEvents.filter(
      (event) => event.runId !== runId
    );
    console.log(
      '🔓 GLOBAL BLOCKER: Force allowing OrderExtractionTool for run:',
      runId.slice(-8)
    );
  }
}

// Export singleton instance
export const orderExtractionBlocker = new OrderExtractionBlocker();
