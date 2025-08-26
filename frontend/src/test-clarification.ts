// Test file to verify clarification functionality
import type {
  ClarificationRequest,
  ClarificationResponse,
  LogEntry,
} from './types';

// Test data for clarification events
const testClarificationRequest: ClarificationRequest = {
  clarification_id: 'CLAR-TEST-001',
  question: 'Test clarification question: Which option do you prefer?',
  timeout_seconds: 60,
  context: { step: 'pricing', order_id: 'ORD-TEST-001' },
  options: ['Option A', 'Option B', 'Option C'],
  required: true,
};

const testClarificationResponse: ClarificationResponse = {
  clarification_id: 'CLAR-TEST-001',
  response: 'Option A',
  timestamp: new Date().toISOString(),
};

// Test log entries
const testClarificationLogs: LogEntry[] = [
  {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message:
      '🤔 Clarification Required: Test clarification question: Which option do you prefer?',
    metadata: {
      clarificationId: 'CLAR-TEST-001',
      timeout_seconds: 60,
      options: ['Option A', 'Option B', 'Option C'],
      required: true,
      context: { step: 'pricing', order_id: 'ORD-TEST-001' },
      type: 'clarification_request',
    },
  },
  {
    timestamp: new Date(Date.now() + 30000).toISOString(),
    level: 'info',
    message: '✅ Clarification Resolved: Option A',
    metadata: {
      clarificationId: 'CLAR-TEST-001',
      responseTimestamp: new Date(Date.now() + 30000).toISOString(),
      type: 'clarification_response',
    },
  },
  {
    timestamp: new Date(Date.now() + 31000).toISOString(),
    level: 'info',
    message: '🚀 Workflow resuming after clarification',
    metadata: {
      clarificationId: 'CLAR-TEST-001',
      type: 'workflow_resume',
    },
  },
];

// Export test data for use in components
export {
  testClarificationRequest,
  testClarificationResponse,
  testClarificationLogs,
};

console.log('✅ Clarification test data created successfully');
console.log('Test clarification request:', testClarificationRequest);
console.log('Test clarification logs:', testClarificationLogs);
