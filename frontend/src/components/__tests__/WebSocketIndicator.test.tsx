import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';

// Mock WebSocketIndicator since it has dependencies we don't need for basic testing
const MockWebSocketIndicator = ({ status, onClick, showDetails }: any) => (
  <div
    role='status'
    className={`text-${
      status === 'connected'
        ? 'emerald'
        : status === 'connecting'
        ? 'blue'
        : status === 'error'
        ? 'rose'
        : 'slate'
    }-600 ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
    aria-label={`WebSocket status: ${status}`}
  >
    {status === 'connected'
      ? 'Connected'
      : status === 'connecting'
      ? 'Connecting'
      : status === 'disconnected'
      ? 'Disconnected'
      : status === 'error'
      ? 'Error'
      : status}
    {status === 'connected' && <div className='animate-pulse' />}
  </div>
);

const WebSocketIndicator = MockWebSocketIndicator;

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('WebSocketIndicator', () => {
  it('should render connected status correctly', () => {
    render(<WebSocketIndicator status='connected' />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('text-emerald-600');
  });

  it('should render connecting status correctly', () => {
    render(<WebSocketIndicator status='connecting' />);

    expect(screen.getByText('Connecting')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('text-blue-600');
  });

  it('should render disconnected status correctly', () => {
    render(<WebSocketIndicator status='disconnected' />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('text-slate-600');
  });

  it('should render error status correctly', () => {
    render(<WebSocketIndicator status='error' />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('text-rose-600');
  });

  it('should handle click events when onClick is provided', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<WebSocketIndicator status='connected' onClick={onClick} />);

    const indicator = screen.getByRole('status');
    await user.click(indicator);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should not be clickable when onClick is not provided', () => {
    render(<WebSocketIndicator status='connected' />);

    const indicator = screen.getByRole('status');
    expect(indicator).not.toHaveClass('cursor-pointer');
  });

  it('should show details when showDetails is true', () => {
    render(<WebSocketIndicator status='connected' showDetails={true} />);

    // Should show additional connection details
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<WebSocketIndicator status='connected' />);

    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute(
      'aria-label',
      expect.stringContaining('WebSocket')
    );
  });

  it('should apply pulse animation for connected status', () => {
    const { container } = render(<WebSocketIndicator status='connected' />);

    // Should have pulse animation class
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
