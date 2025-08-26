import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from 'react';
import { stepDeduplicationEngine } from '../utils/StepDeduplicationEngine';
import type {
  AppState,
  Order,
  WorkflowRun,
  WorkflowStep,
  BlockchainTransaction,
  LogEntry,
  OrderFilters,
  CompletionState,
} from '../types';

// Action types
type AppAction =
  | { type: 'SET_THEME'; payload: 'dark' | 'light' }
  | { type: 'SET_MOCK_MODE'; payload: boolean }
  | { type: 'SET_WEBSOCKET_STATE'; payload: Partial<AppState['websocket']> }
  | { type: 'SET_ORDERS_LOADING'; payload: boolean }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: { id: string; updates: Partial<Order> } }
  | { type: 'SET_ORDERS_ERROR'; payload: string | undefined }
  | { type: 'SET_ORDER_FILTERS'; payload: Partial<OrderFilters> }
  | { type: 'SELECT_ORDER'; payload: string | undefined }
  | { type: 'SET_WORKFLOW_LOADING'; payload: boolean }
  | { type: 'SET_WORKFLOW_ERROR'; payload: string | undefined }
  | { type: 'ADD_WORKFLOW_RUN'; payload: WorkflowRun }
  | {
      type: 'UPDATE_WORKFLOW_RUN';
      payload: { id: string; updates: Partial<WorkflowRun> };
    }
  | {
      type: 'ADD_WORKFLOW_STEP';
      payload: { runId: string; step: WorkflowStep };
    }
  | {
      type: 'UPDATE_WORKFLOW_STEP';
      payload: { runId: string; step: WorkflowStep };
    }
  | { type: 'SELECT_WORKFLOW_RUN'; payload: string | undefined }
  | { type: 'ADD_LOG_ENTRY'; payload: LogEntry }
  | { type: 'CLEAR_LOG_STREAM' }
  | { type: 'SET_BLOCKCHAIN_LOADING'; payload: boolean }
  | { type: 'SET_BLOCKCHAIN_ERROR'; payload: string | undefined }
  | { type: 'SET_BLOCKCHAIN_TRANSACTIONS'; payload: BlockchainTransaction[] }
  | { type: 'ADD_BLOCKCHAIN_TRANSACTION'; payload: BlockchainTransaction }
  | {
      type: 'UPDATE_BLOCKCHAIN_TRANSACTION';
      payload: { txHash: string; updates: Partial<BlockchainTransaction> };
    }
  | {
      type: 'SET_BLOCKCHAIN_NETWORK_STATUS';
      payload: 'healthy' | 'degraded' | 'offline';
    }
  | {
      type: 'SET_COMPLETION_STATE';
      payload: { runId: string; state: CompletionState };
    }
  | {
      type: 'MARK_COMPLETION_CARD_SHOWN';
      payload: string; // runId
    }
  | {
      type: 'MARK_COMPLETION_CARD_DISMISSED';
      payload: string; // runId
    }
  | {
      type: 'RESET_COMPLETION_STATE';
      payload: string; // runId
    };

// Initial state
const initialState: AppState = {
  theme: 'dark',
  mockMode: import.meta.env.VITE_MOCK_MODE === 'true',
  websocket: {
    status: 'disconnected',
    clientId: import.meta.env.VITE_CLIENT_ID || 'default-client',
    connectionStats: {
      reconnectAttempts: 0,
      messagesReceived: 0,
      messagesSent: 0,
    },
  },
  orders: {
    orders: [],
    loading: false,
    filters: {
      search: '',
      status: [],
    },
  },
  workflow: {
    activeRuns: {},
    logStream: [],
    loading: false,
    completionStates: {},
  },
  blockchain: {
    transactions: [],
    loading: false,
    networkStatus: 'offline',
  },
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'SET_MOCK_MODE':
      return { ...state, mockMode: action.payload };

    case 'SET_WEBSOCKET_STATE':
      return {
        ...state,
        websocket: { ...state.websocket, ...action.payload },
      };

    case 'SET_ORDERS_LOADING':
      return {
        ...state,
        orders: { ...state.orders, loading: action.payload },
      };

    case 'SET_ORDERS':
      return {
        ...state,
        orders: { ...state.orders, orders: action.payload, error: undefined },
      };

    case 'ADD_ORDER':
      return {
        ...state,
        orders: {
          ...state.orders,
          orders: [action.payload, ...state.orders.orders],
        },
      };

    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: {
          ...state.orders,
          orders: state.orders.orders.map((order) =>
            order.id === action.payload.id
              ? { ...order, ...action.payload.updates }
              : order
          ),
        },
      };

    case 'SET_ORDERS_ERROR':
      return {
        ...state,
        orders: { ...state.orders, error: action.payload, loading: false },
      };

    case 'SET_ORDER_FILTERS':
      return {
        ...state,
        orders: {
          ...state.orders,
          filters: { ...state.orders.filters, ...action.payload },
        },
      };

    case 'SELECT_ORDER':
      return {
        ...state,
        orders: { ...state.orders, selectedOrder: action.payload },
      };

    case 'SET_WORKFLOW_LOADING':
      return {
        ...state,
        workflow: { ...state.workflow, loading: action.payload },
      };

    case 'SET_WORKFLOW_ERROR':
      return {
        ...state,
        workflow: { ...state.workflow, error: action.payload, loading: false },
      };

    case 'ADD_WORKFLOW_RUN':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          activeRuns: {
            ...state.workflow.activeRuns,
            [action.payload.id]: action.payload,
          },
        },
      };

    case 'UPDATE_WORKFLOW_RUN':
      const existingRun = state.workflow.activeRuns[action.payload.id];
      if (!existingRun) {
        console.warn(
          `🚫 AppStateContext: Workflow run ${action.payload.id} not found for update`
        );
        return state;
      }

      try {
        // Apply step deduplication and merging for all step updates
        const updatedRun = { ...existingRun, ...action.payload.updates };

        if (action.payload.updates.steps) {
          console.log(
            '🔧 AppStateContext: Applying step deduplication and merging to workflow run update'
          );
          console.log(`   - Existing steps: ${existingRun.steps.length}`);
          console.log(`   - New steps: ${action.payload.updates.steps.length}`);

          // Merge existing steps with new steps, then deduplicate
          const allSteps = [
            ...existingRun.steps,
            ...action.payload.updates.steps,
          ];
          updatedRun.steps = stepDeduplicationEngine.deduplicateSteps(allSteps);

          console.log(
            `   - Final deduplicated steps: ${updatedRun.steps.length}`
          );

          // Update completion metrics based on deduplicated steps
          const completedSteps = updatedRun.steps.filter(
            (step) => step.status === 'completed' || step.status === 'failed'
          ).length;

          const totalSteps = Math.max(
            updatedRun.totalSteps || 0,
            updatedRun.steps.length
          );

          const progress =
            totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

          // Update metrics if not explicitly provided
          if (action.payload.updates.completedSteps === undefined) {
            updatedRun.completedSteps = completedSteps;
          }
          if (action.payload.updates.progress === undefined) {
            updatedRun.progress = progress;
          }
          if (action.payload.updates.totalSteps === undefined) {
            updatedRun.totalSteps = totalSteps;
          }
        }

        return {
          ...state,
          workflow: {
            ...state.workflow,
            activeRuns: {
              ...state.workflow.activeRuns,
              [action.payload.id]: updatedRun,
            },
          },
        };
      } catch (error) {
        console.error(
          '❌ AppStateContext: Error updating workflow run:',
          error
        );
        console.error('   - Run ID:', action.payload.id);
        console.error('   - Updates:', action.payload.updates);
        return state; // Return unchanged state on error
      }

    case 'ADD_WORKFLOW_STEP':
      const runForAdd = state.workflow.activeRuns[action.payload.runId];
      if (!runForAdd) return state;

      console.log(
        '🔧 AppStateContext: Adding workflow step with deduplication'
      );
      console.log(`   - Run ID: ${action.payload.runId}`);
      console.log(
        `   - Step: ${action.payload.step.name} (${action.payload.step.status})`
      );

      // Apply deduplication to combined steps
      const combinedSteps = [...runForAdd.steps, action.payload.step];
      const deduplicatedStepsForAdd =
        stepDeduplicationEngine.deduplicateSteps(combinedSteps);

      // Calculate metrics based on deduplicated steps
      const completedStepsForAdd = deduplicatedStepsForAdd.filter(
        (step) => step.status === 'completed' || step.status === 'failed'
      ).length;

      const totalStepsForAdd = Math.max(
        runForAdd.totalSteps || 0,
        deduplicatedStepsForAdd.length
      );

      const progressForAdd =
        totalStepsForAdd > 0
          ? (completedStepsForAdd / totalStepsForAdd) * 100
          : 0;

      console.log(`   - Deduplicated steps: ${deduplicatedStepsForAdd.length}`);
      console.log(`   - Completed steps: ${completedStepsForAdd}`);
      console.log(`   - Progress: ${progressForAdd.toFixed(1)}%`);

      return {
        ...state,
        workflow: {
          ...state.workflow,
          activeRuns: {
            ...state.workflow.activeRuns,
            [action.payload.runId]: {
              ...runForAdd,
              steps: deduplicatedStepsForAdd,
              completedSteps: completedStepsForAdd,
              totalSteps: totalStepsForAdd,
              progress: progressForAdd,
            },
          },
        },
      };

    case 'UPDATE_WORKFLOW_STEP':
      const runForUpdate = state.workflow.activeRuns[action.payload.runId];
      if (!runForUpdate) {
        console.warn(
          `🚫 AppStateContext: Workflow run ${action.payload.runId} not found for step update`
        );
        return state;
      }

      try {
        // Validate step data
        if (!action.payload.step || !action.payload.step.id) {
          console.warn(
            '🚫 AppStateContext: Invalid step data received:',
            action.payload.step
          );
          return state;
        }

        // BLOCK OrderExtractionTool at state management level (temporarily)
        const isOrderExtractionUpdateStep =
          action.payload.step.toolName === 'OrderExtractionTool' ||
          (action.payload.step.toolName &&
            action.payload.step.toolName
              .toLowerCase()
              .includes('orderextraction')) ||
          (action.payload.step.toolName &&
            action.payload.step.toolName
              .toLowerCase()
              .includes('order extraction')) ||
          action.payload.step.id === 'extraction' ||
          (action.payload.step.name &&
            action.payload.step.name
              .toLowerCase()
              .includes('order extraction'));

        if (isOrderExtractionUpdateStep) {
          console.log(
            '🚫 STATE-LEVEL BLOCKING: Blocking OrderExtractionTool step update at state management level:',
            {
              id: action.payload.step.id,
              name: action.payload.step.name,
              toolName: action.payload.step.toolName,
              status: action.payload.step.status,
            }
          );
          return state; // Don't update OrderExtractionTool steps in state
        }

        console.log(
          '🔧 AppStateContext: Updating workflow step with deduplication'
        );
        console.log(`   - Run ID: ${action.payload.runId}`);
        console.log(
          `   - Step: ${action.payload.step.name} (${action.payload.step.status})`
        );

        // Add the updated step and apply deduplication (which will merge with existing)
        const allStepsForUpdate = [...runForUpdate.steps, action.payload.step];
        const deduplicatedStepsForUpdate =
          stepDeduplicationEngine.deduplicateSteps(allStepsForUpdate);

        // Calculate updated metrics
        const completedStepsForUpdate = deduplicatedStepsForUpdate.filter(
          (step) => step.status === 'completed' || step.status === 'failed'
        ).length;

        const totalStepsForUpdate = Math.max(
          runForUpdate.totalSteps || 0,
          deduplicatedStepsForUpdate.length
        );

        const progressForUpdate =
          totalStepsForUpdate > 0
            ? (completedStepsForUpdate / totalStepsForUpdate) * 100
            : 0;

        console.log(
          `   - Updated steps count: ${deduplicatedStepsForUpdate.length}`
        );
        console.log(`   - Completed steps: ${completedStepsForUpdate}`);
        console.log(`   - Progress: ${progressForUpdate.toFixed(1)}%`);

        return {
          ...state,
          workflow: {
            ...state.workflow,
            activeRuns: {
              ...state.workflow.activeRuns,
              [action.payload.runId]: {
                ...runForUpdate,
                steps: deduplicatedStepsForUpdate,
                completedSteps: completedStepsForUpdate,
                totalSteps: totalStepsForUpdate,
                progress: progressForUpdate,
              },
            },
          },
        };
      } catch (error) {
        console.error(
          '❌ AppStateContext: Error updating workflow step:',
          error
        );
        console.error('   - Run ID:', action.payload.runId);
        console.error('   - Step:', action.payload.step);
        return state; // Return unchanged state on error
      }

    case 'SELECT_WORKFLOW_RUN':
      return {
        ...state,
        workflow: { ...state.workflow, selectedRun: action.payload },
      };

    case 'ADD_LOG_ENTRY':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          logStream: [...state.workflow.logStream, action.payload],
        },
      };

    case 'CLEAR_LOG_STREAM':
      return {
        ...state,
        workflow: { ...state.workflow, logStream: [] },
      };

    case 'SET_BLOCKCHAIN_LOADING':
      return {
        ...state,
        blockchain: { ...state.blockchain, loading: action.payload },
      };

    case 'SET_BLOCKCHAIN_ERROR':
      return {
        ...state,
        blockchain: {
          ...state.blockchain,
          error: action.payload,
          loading: false,
        },
      };

    case 'SET_BLOCKCHAIN_TRANSACTIONS':
      return {
        ...state,
        blockchain: {
          ...state.blockchain,
          transactions: action.payload,
          error: undefined,
        },
      };

    case 'ADD_BLOCKCHAIN_TRANSACTION':
      return {
        ...state,
        blockchain: {
          ...state.blockchain,
          transactions: [action.payload, ...state.blockchain.transactions],
        },
      };

    case 'UPDATE_BLOCKCHAIN_TRANSACTION':
      return {
        ...state,
        blockchain: {
          ...state.blockchain,
          transactions: state.blockchain.transactions.map((tx) =>
            tx.txHash === action.payload.txHash
              ? { ...tx, ...action.payload.updates }
              : tx
          ),
        },
      };

    case 'SET_BLOCKCHAIN_NETWORK_STATUS':
      return {
        ...state,
        blockchain: { ...state.blockchain, networkStatus: action.payload },
      };

    case 'SET_COMPLETION_STATE':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          completionStates: {
            ...state.workflow.completionStates,
            [action.payload.runId]: action.payload.state,
          },
        },
      };

    case 'MARK_COMPLETION_CARD_SHOWN':
      const currentStateShown = state.workflow.completionStates[
        action.payload
      ] || {
        isCompleted: false,
        completionTrigger: null,
        completionTimestamp: new Date().toISOString(),
        completionData: null,
        prematureTriggersBlocked: [],
        hasShownCard: false,
        cardDismissed: false,
      };
      return {
        ...state,
        workflow: {
          ...state.workflow,
          completionStates: {
            ...state.workflow.completionStates,
            [action.payload]: {
              ...currentStateShown,
              hasShownCard: true,
              completionTimestamp: new Date().toISOString(),
            },
          },
        },
      };

    case 'MARK_COMPLETION_CARD_DISMISSED':
      const currentStateDismissed = state.workflow.completionStates[
        action.payload
      ] || {
        isCompleted: false,
        completionTrigger: null,
        completionTimestamp: new Date().toISOString(),
        completionData: null,
        prematureTriggersBlocked: [],
        hasShownCard: false,
        cardDismissed: false,
      };
      return {
        ...state,
        workflow: {
          ...state.workflow,
          completionStates: {
            ...state.workflow.completionStates,
            [action.payload]: {
              ...currentStateDismissed,
              cardDismissed: true,
            },
          },
        },
      };

    case 'RESET_COMPLETION_STATE':
      const { [action.payload]: removed, ...remainingStates } =
        state.workflow.completionStates;
      return {
        ...state,
        workflow: {
          ...state.workflow,
          completionStates: remainingStates,
        },
      };

    default:
      return state;
  }
};

// Context
interface AppStateContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience action creators
  setTheme: (theme: 'dark' | 'light') => void;
  setMockMode: (enabled: boolean) => void;
  updateWebSocketState: (updates: Partial<AppState['websocket']>) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  setOrderFilters: (filters: Partial<OrderFilters>) => void;
  selectOrder: (id: string | undefined) => void;
  addWorkflowRun: (run: WorkflowRun) => void;
  updateWorkflowRun: (id: string, updates: Partial<WorkflowRun>) => void;
  addWorkflowStep: (runId: string, step: WorkflowStep) => void;
  updateWorkflowStep: (runId: string, step: WorkflowStep) => void;
  selectWorkflowRun: (id: string | undefined) => void;
  addLogEntry: (entry: LogEntry) => void;
  clearLogStream: () => void;
  addBlockchainTransaction: (tx: BlockchainTransaction) => void;
  updateBlockchainTransaction: (
    txHash: string,
    updates: Partial<BlockchainTransaction>
  ) => void;
  setCompletionState: (runId: string, state: CompletionState) => void;
  markCompletionCardShown: (runId: string) => void;
  markCompletionCardDismissed: (runId: string) => void;
  resetCompletionState: (runId: string) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(
  undefined
);

// Provider component
interface AppStateProviderProps {
  children: React.ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Convenience action creators
  const setTheme = useCallback((theme: 'dark' | 'light') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const setMockMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_MOCK_MODE', payload: enabled });
  }, []);

  const updateWebSocketState = useCallback(
    (updates: Partial<AppState['websocket']>) => {
      dispatch({ type: 'SET_WEBSOCKET_STATE', payload: updates });
    },
    []
  );

  const addOrder = useCallback((order: Order) => {
    dispatch({ type: 'ADD_ORDER', payload: order });
  }, []);

  const updateOrder = useCallback((id: string, updates: Partial<Order>) => {
    dispatch({ type: 'UPDATE_ORDER', payload: { id, updates } });
  }, []);

  const setOrderFilters = useCallback((filters: Partial<OrderFilters>) => {
    dispatch({ type: 'SET_ORDER_FILTERS', payload: filters });
  }, []);

  const selectOrder = useCallback((id: string | undefined) => {
    dispatch({ type: 'SELECT_ORDER', payload: id });
  }, []);

  const addWorkflowRun = useCallback((run: WorkflowRun) => {
    dispatch({ type: 'ADD_WORKFLOW_RUN', payload: run });
  }, []);

  const updateWorkflowRun = useCallback(
    (id: string, updates: Partial<WorkflowRun>) => {
      dispatch({ type: 'UPDATE_WORKFLOW_RUN', payload: { id, updates } });
    },
    []
  );

  const addWorkflowStep = useCallback((runId: string, step: WorkflowStep) => {
    dispatch({ type: 'ADD_WORKFLOW_STEP', payload: { runId, step } });
  }, []);

  const updateWorkflowStep = useCallback(
    (runId: string, step: WorkflowStep) => {
      dispatch({ type: 'UPDATE_WORKFLOW_STEP', payload: { runId, step } });
    },
    []
  );

  const selectWorkflowRun = useCallback((id: string | undefined) => {
    dispatch({ type: 'SELECT_WORKFLOW_RUN', payload: id });
  }, []);

  const addLogEntry = useCallback((entry: LogEntry) => {
    dispatch({ type: 'ADD_LOG_ENTRY', payload: entry });
  }, []);

  const clearLogStream = useCallback(() => {
    dispatch({ type: 'CLEAR_LOG_STREAM' });
  }, []);

  const addBlockchainTransaction = useCallback((tx: BlockchainTransaction) => {
    dispatch({ type: 'ADD_BLOCKCHAIN_TRANSACTION', payload: tx });
  }, []);

  const updateBlockchainTransaction = useCallback(
    (txHash: string, updates: Partial<BlockchainTransaction>) => {
      dispatch({
        type: 'UPDATE_BLOCKCHAIN_TRANSACTION',
        payload: { txHash, updates },
      });
    },
    []
  );

  const setCompletionState = useCallback(
    (runId: string, state: CompletionState) => {
      dispatch({ type: 'SET_COMPLETION_STATE', payload: { runId, state } });
    },
    []
  );

  const markCompletionCardShown = useCallback((runId: string) => {
    dispatch({ type: 'MARK_COMPLETION_CARD_SHOWN', payload: runId });
  }, []);

  const markCompletionCardDismissed = useCallback((runId: string) => {
    dispatch({ type: 'MARK_COMPLETION_CARD_DISMISSED', payload: runId });
  }, []);

  const resetCompletionState = useCallback((runId: string) => {
    dispatch({ type: 'RESET_COMPLETION_STATE', payload: runId });
  }, []);

  const contextValue: AppStateContextType = {
    state,
    dispatch,
    setTheme,
    setMockMode,
    updateWebSocketState,
    addOrder,
    updateOrder,
    setOrderFilters,
    selectOrder,
    addWorkflowRun,
    updateWorkflowRun,
    addWorkflowStep,
    updateWorkflowStep,
    selectWorkflowRun,
    addLogEntry,
    clearLogStream,
    addBlockchainTransaction,
    updateBlockchainTransaction,
    setCompletionState,
    markCompletionCardShown,
    markCompletionCardDismissed,
    resetCompletionState,
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

// Hook to use the context
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
