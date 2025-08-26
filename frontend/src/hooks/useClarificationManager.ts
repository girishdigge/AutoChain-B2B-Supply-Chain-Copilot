import { useState, useCallback, useRef } from 'react';
import type { ClarificationRequest } from '../types';

interface ClarificationState {
  isDialogOpen: boolean;
  currentRequest?: ClarificationRequest;
  pendingRequests: ClarificationRequest[];
}

export const useClarificationManager = () => {
  const [state, setState] = useState<ClarificationState>({
    isDialogOpen: false,
    currentRequest: undefined,
    pendingRequests: [],
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show clarification dialog
  const showClarification = useCallback((request: ClarificationRequest) => {
    setState((prev) => {
      // If dialog is already open, queue the request
      if (prev.isDialogOpen && prev.currentRequest) {
        return {
          ...prev,
          pendingRequests: [...prev.pendingRequests, request],
        };
      }

      // Show the dialog with this request
      return {
        ...prev,
        isDialogOpen: true,
        currentRequest: request,
      };
    });

    // Set up auto-close timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      closeClarification();
    }, request.timeout_seconds * 1000);
  }, []);

  // Close clarification dialog
  const closeClarification = useCallback(() => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState((prev) => {
      // If there are pending requests, show the next one
      if (prev.pendingRequests.length > 0) {
        const [nextRequest, ...remainingRequests] = prev.pendingRequests;

        // Set up timeout for the next request
        timeoutRef.current = setTimeout(() => {
          closeClarification();
        }, nextRequest.timeout_seconds * 1000);

        return {
          ...prev,
          currentRequest: nextRequest,
          pendingRequests: remainingRequests,
          isDialogOpen: true,
        };
      }

      // No pending requests, close dialog
      return {
        ...prev,
        isDialogOpen: false,
        currentRequest: undefined,
      };
    });
  }, []);

  // Remove a specific clarification from pending queue
  const removePendingClarification = useCallback((clarificationId: string) => {
    setState((prev) => ({
      ...prev,
      pendingRequests: prev.pendingRequests.filter(
        (req) => req.clarification_id !== clarificationId
      ),
    }));
  }, []);

  // Clear all clarifications
  const clearAllClarifications = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState({
      isDialogOpen: false,
      currentRequest: undefined,
      pendingRequests: [],
    });
  }, []);

  return {
    isDialogOpen: state.isDialogOpen,
    currentRequest: state.currentRequest,
    pendingRequests: state.pendingRequests,
    pendingCount: state.pendingRequests.length,
    showClarification,
    closeClarification,
    removePendingClarification,
    clearAllClarifications,
  };
};
