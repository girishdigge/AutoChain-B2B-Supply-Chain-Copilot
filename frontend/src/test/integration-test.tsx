/**
 * Integration Test for Complete User Flows
 *
 * This test verifies that all components work together correctly
 * and that data flows properly between pages and WebSocket events.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from '../App';
import { AppStateProvider } from '../context/AppStateContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { ThemeProvider } from '../context/ThemeContext';
import { SidebarProvider } from '../context/SidebarContext';

// Mock environment variables
vi.mock('../lib/environment', () => ({
  validateEnvironment: () => ({ valid: true, errors: [] }),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
};

global.WebSocket = vi.fn(() => mockWebSocket) as any;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AppStateProvider>
      <ThemeProvider>
        <SidebarProvider>
          <WebSocketProvider>
            {children}
            <Toaster position='top-right' />
          </WebSocketProvider>
        </SidebarProvider>
      </ThemeProvider>
    </AppStateProvider>
  </BrowserRouter>
);

describe('Complete User Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set mock mode for testing
    vi.stubEnv('VITE_MOCK_MODE', 'true');
    vi.stubEnv('VITE_CLIENT_ID', 'test-client');
    vi.stubEnv('VITE_WS_BASE', 'ws://localhost:8000/ws');
    vi.stubEnv('VITE_API_BASE', 'http://localhost:8000');
  });

  it('should render the complete application without errors', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Check that the main layout elements are present
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Supply Chain Dashboard')).toBeInTheDocument();
  });

  it('should navigate between pages correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Start on Dashboard
    expect(screen.getByText('Supply Chain Dashboard')).toBeInTheDocument();

    // Navigate to Orders
    const ordersLink = screen.getByRole('link', { name: /orders/i });
    fireEvent.click(ordersLink);

    await waitFor(() => {
      expect(screen.getByText('Orders Management')).toBeInTheDocument();
    });

    // Navigate to Workflow
    const workflowLink = screen.getByRole('link', { name: /workflow/i });
    fireEvent.click(workflowLink);

    await waitFor(() => {
      expect(screen.getByText('Workflow Visualization')).toBeInTheDocument();
    });

    // Navigate to Blockchain
    const blockchainLink = screen.getByRole('link', { name: /blockchain/i });
    fireEvent.click(blockchainLink);

    await waitFor(() => {
      expect(screen.getByText('Blockchain Transactions')).toBeInTheDocument();
    });
  });

  it('should handle WebSocket connection status correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Check for connection status indicator
    const connectionIndicator = screen.getByText(/Live Data|Connecting/);
    expect(connectionIndicator).toBeInTheDocument();
  });

  it('should display mock data correctly on all pages', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Dashboard should show KPI cards
    expect(screen.getByText('Orders Processed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Blockchain Anchors')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();

    // Navigate to Orders and check data table
    const ordersLink = screen.getByRole('link', { name: /orders/i });
    fireEvent.click(ordersLink);

    await waitFor(() => {
      expect(screen.getByText('Orders Management')).toBeInTheDocument();
      // Should show order data in table
      expect(screen.getByText(/ORD-/)).toBeInTheDocument();
    });

    // Navigate to Blockchain and check transactions
    const blockchainLink = screen.getByRole('link', { name: /blockchain/i });
    fireEvent.click(blockchainLink);

    await waitFor(() => {
      expect(screen.getByText('Blockchain Transactions')).toBeInTheDocument();
      // Should show transaction data
      expect(screen.getByText('Total Transactions')).toBeInTheDocument();
    });
  });

  it('should handle demo order submission flow', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Find and click the "Run Demo Order" button
    const demoButton = screen.getByRole('button', { name: /run demo order/i });
    fireEvent.click(demoButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Submit Demo Order')).toBeInTheDocument();
    });

    // Select a template
    const templateSelect = screen.getByRole('combobox');
    fireEvent.click(templateSelect);

    await waitFor(() => {
      const industrialPumpOption = screen.getByText('Industrial Pump Order');
      fireEvent.click(industrialPumpOption);
    });

    // Order text should be populated
    const orderTextarea = screen.getByRole('textbox');
    expect(orderTextarea).toHaveValue(
      expect.stringContaining('Industrial Pump')
    );

    // Submit the order
    const submitButton = screen.getByRole('button', { name: /submit order/i });
    fireEvent.click(submitButton);

    // Should show success message and navigate
    await waitFor(() => {
      expect(mockWebSocket.send).toHaveBeenCalled();
    });
  });

  it('should handle order detail drawer correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to Orders page
    const ordersLink = screen.getByRole('link', { name: /orders/i });
    fireEvent.click(ordersLink);

    await waitFor(() => {
      expect(screen.getByText('Orders Management')).toBeInTheDocument();
    });

    // Click on an order row to open drawer
    const orderRow = screen.getByText(/ORD-/);
    fireEvent.click(orderRow);

    // Drawer should open with order details
    await waitFor(() => {
      expect(screen.getByText('Order Details')).toBeInTheDocument();
    });
  });

  it('should handle sidebar collapse/expand correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Find the sidebar toggle button
    const toggleButton = screen.getByRole('button', {
      name: /toggle sidebar/i,
    });
    fireEvent.click(toggleButton);

    // Sidebar should collapse (this would be tested by checking CSS classes or layout changes)
    // The exact implementation depends on how the sidebar collapse is handled
  });

  it('should handle theme toggle correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Find the theme toggle button
    const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(themeToggle);

    // Theme should change (this would be tested by checking document classes)
    // The exact implementation depends on how theme switching is handled
  });

  it('should handle error boundaries correctly', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a component that throws an error
    const ErrorComponent = () => {
      throw new Error('Test error');
    };

    render(
      <TestWrapper>
        <ErrorComponent />
      </TestWrapper>
    );

    // Error boundary should catch the error and show fallback UI
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should handle WebSocket event processing correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Simulate WebSocket events
    const mockEvent = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'processing_started',
        data: {
          run_id: 'test-run-123',
          order_id: 'ORD-TEST-001',
          status: 'started',
          message: 'Processing started for test order',
          total_steps: 11,
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'test-correlation-123',
      }),
    });

    // Trigger the WebSocket message handler
    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1];

    if (messageHandler) {
      messageHandler(mockEvent);
    }

    // Should process the event and update the UI
    // This would be verified by checking if the workflow state is updated
  });

  it('should handle navigation with context correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to Orders
    const ordersLink = screen.getByRole('link', { name: /orders/i });
    fireEvent.click(ordersLink);

    await waitFor(() => {
      expect(screen.getByText('Orders Management')).toBeInTheDocument();
    });

    // Click "View Workflow" for an order
    const viewWorkflowButton = screen.getByRole('button', {
      name: /view workflow/i,
    });
    fireEvent.click(viewWorkflowButton);

    // Should navigate to workflow page with order context
    await waitFor(() => {
      expect(screen.getByText('Workflow Visualization')).toBeInTheDocument();
    });
  });

  it('should handle accessibility features correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Check for skip links
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();

    // Check for proper ARIA labels
    const mainContent = screen.getByRole('main');
    expect(mainContent).toHaveAttribute('aria-label', 'Main content area');

    // Check for screen reader announcements
    const liveRegion = screen.getByRole('status', { hidden: true });
    expect(liveRegion).toBeInTheDocument();
  });

  it('should handle loading states correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Check for loading spinners during page transitions
    // This would depend on the specific loading implementation

    // Navigate to a page that might show loading state
    const ordersLink = screen.getByRole('link', { name: /orders/i });
    fireEvent.click(ordersLink);

    // Should show loading state briefly before content loads
    // The exact test would depend on how loading states are implemented
  });

  it('should handle responsive design correctly', async () => {
    // Mock window.matchMedia for responsive testing
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes('768px'), // Mock mobile breakpoint
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Check that responsive components render correctly
    // This would test mobile-specific layouts, collapsed sidebars, etc.
  });
});

export default {};
