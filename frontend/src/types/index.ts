// Environment configuration
export interface EnvironmentConfig {
  VITE_API_BASE: string;
  VITE_WS_BASE: string;
  VITE_CLIENT_ID: string;
  VITE_MOCK_MODE: boolean;
  VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

// WebSocket message types
export interface BaseMessage {
  type: string;
  data: any;
  timestamp: string;
  client_id?: string;
  run_id?: string;
  correlation_id: string;
}

export interface ProcessingStarted {
  run_id: string;
  order_id?: string;
  status: 'started';
  message: string;
  total_steps?: number;
}

export interface StepUpdate {
  step_id: string;
  step_name: string;
  status:
    | 'started'
    | 'running'
    | 'completed'
    | 'failed'
    | 'waiting'
    | 'skipped';
  progress_percentage?: number;
  output?: any;
  error?: string;
  tool_name?: string;
  execution_time_ms?: number;
  metadata?: any;
}

export interface ClarificationRequest {
  clarification_id: string;
  question: string;
  timeout_seconds: number;
  context?: any;
  options?: string[];
  required: boolean;
  timestamp?: string;
}

export interface ClarificationResponse {
  clarification_id: string;
  response: string;
  timestamp: string;
}

export interface PhaseTransition {
  run_id: string;
  from_phase?: string;
  to_phase: string;
  phase_description: string;
  estimated_duration_seconds?: number;
}

export interface PaymentLinkEvent {
  order_id: string;
  payment_link: string;
  amount: number;
  currency: string;
  expires_at: string;
}

export interface BlockchainTxEvent {
  order_id: string;
  tx_hash: string;
  tx_type: 'order' | 'payment' | 'anchor';
  status: 'pending' | 'confirmed' | 'failed';
  block_number?: number;
  gas_used?: number;
}

export interface FinalOutputEvent {
  run_id: string;
  order_id: string;
  status: 'completed' | 'failed';
  output?: any;
  error?: string;
  execution_time_ms: number;
}

export interface ErrorEvent {
  error_type: string;
  message: string;
  details?: any;
  run_id?: string;
  step_id?: string;
}

// Application state types
export interface AppState {
  theme: 'dark' | 'light';
  mockMode: boolean;
  websocket: WebSocketState;
  orders: OrdersState;
  workflow: WorkflowState;
  blockchain: BlockchainState;
}

export interface OrdersState {
  orders: Order[];
  loading: boolean;
  error?: string;
  filters: OrderFilters;
  selectedOrder?: string;
}

export interface OrderFilters {
  search: string;
  status: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface WorkflowState {
  activeRuns: Record<string, WorkflowRun>;
  selectedRun?: string;
  logStream: LogEntry[];
  loading: boolean;
  error?: string;
  completionStates: Record<string, CompletionState>;
}

export interface CompletionState {
  isCompleted: boolean;
  completionTrigger: 'email' | 'blockchain' | 'manual' | null;
  completionTimestamp: string | null;
  completionData: any | null;
  prematureTriggersBlocked: string[];
  hasShownCard: boolean;
  cardDismissed: boolean;
}

export interface BlockchainState {
  transactions: BlockchainTransaction[];
  loading: boolean;
  error?: string;
  networkStatus: 'healthy' | 'degraded' | 'offline';
}

export interface WebSocketState {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  clientId: string;
  lastEvent?: BaseMessage;
  connectionStats: {
    connectedAt?: string;
    reconnectAttempts: number;
    messagesReceived: number;
    messagesSent: number;
  };
}

// Order related types
export interface Order {
  id: string;
  buyerEmail: string;
  model: string;
  quantity: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  updatedAt: string;
  createdAt: string;
  paymentLink?: string;
  blockchainTx?: string;
  totalAmount?: number;
  currency?: string;
  items: OrderItem[];
  buyer: BuyerInfo;
  supplier?: SupplierInfo;
  logistics?: LogisticsInfo;
  finance?: FinanceInfo;
}

export interface OrderItem {
  id: string;
  name: string;
  model: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: Record<string, any>;
}

export interface BuyerInfo {
  email: string;
  name?: string;
  company?: string;
  address?: Address;
  phone?: string;
}

export interface SupplierInfo {
  id: string;
  name: string;
  email: string;
  company: string;
  rating: number;
  leadTime: number;
  address: Address;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface LogisticsInfo {
  shippingMethod: string;
  estimatedDelivery: string;
  trackingNumber?: string;
  carrier?: string;
  shippingCost: number;
}

export interface FinanceInfo {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface BlockchainTransaction {
  orderId: string;
  txHash: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: number;
  type: 'order' | 'payment' | 'anchor';
}

// Workflow related types
export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'waiting' | 'skipped';
  startTime?: string;
  endTime?: string;
  logs: LogEntry[];
  output?: any;
  error?: string;
  progress?: number;
  estimatedDuration?: number;
  toolName?: string; // Store the original tool name for matching
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: any;
}

export interface WorkflowRun {
  id: string;
  orderId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: WorkflowStep[];
  startTime: string;
  endTime?: string;
  totalSteps: number;
  completedSteps: number;
  currentStep?: string;
  progress: number;
}
// API Response types
export interface APIResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface APIErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// API request parameter types
export interface OrdersQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface OrderSubmissionRequest {
  order_text: string;
}

export interface OrderSubmissionResponse {
  run_id: string;
  order_id: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'offline';
  websocket: {
    status: 'connected' | 'disconnected';
    active_connections: number;
  };
  blockchain: {
    status: 'connected' | 'disconnected';
    network: string;
    latest_block?: number;
  };
  uptime_seconds: number;
}

export interface OrdersListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface BlockchainStatusResponse {
  network: string;
  status: 'connected' | 'disconnected';
  latest_block: number;
  gas_price: string;
  contract_address: string;
  total_transactions: number;
}

// WebSocket Event Union Type
export type WebSocketEvent =
  | ProcessingStarted
  | StepUpdate
  | ClarificationRequest
  | ClarificationResponse
  | PhaseTransition
  | PaymentLinkEvent
  | BlockchainTxEvent
  | FinalOutputEvent
  | ErrorEvent;

// WebSocket Message with typed data
export interface TypedWebSocketMessage<T = WebSocketEvent> extends BaseMessage {
  data: T;
}
