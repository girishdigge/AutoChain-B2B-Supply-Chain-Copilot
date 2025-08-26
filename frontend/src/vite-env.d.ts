/// <reference types="vite/client" />

// Global clarification manager
declare global {
  interface Window {
    clarificationManager?: {
      showClarification: (
        request: import('./types').ClarificationRequest
      ) => void;
      closeClarification: () => void;
      isDialogOpen: boolean;
      currentRequest?: import('./types').ClarificationRequest;
      pendingCount: number;
    };
  }
}

export {};
