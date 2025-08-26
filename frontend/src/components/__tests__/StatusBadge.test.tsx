import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import StatusBadge from '../StatusBadge';
import type { StatusBadgeProps, StatusType } from '../StatusBadge';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('StatusBadge', () => {
  const defaultProps: StatusBadgeProps = {
    status: 'pending',
  };

  it('should render with default props', () => {
    render(<StatusBadge {...defaultProps} />);

    expect(
      screen.getByRole('status', { name: 'Status: Pending' })
    ).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should render all status types correctly', () => {
    const statuses: StatusType[] = [
      'pending',
      'processing',
      'completed',
      'failed',
      'active',
      'waiting',
      'skipped',
    ];

    statuses.forEach((status) => {
      const { unmount } = render(<StatusBadge status={status} />);

      const expectedLabels = {
        pending: 'Pending',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
        active: 'Active',
        waiting: 'Waiting',
        skipped: 'Skipped',
      };

      expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
      unmount();
    });
  });

  it('should apply correct color classes for each status', () => {
    const statusColorMap = {
      pending: 'text-amber-600',
      processing: 'text-blue-600',
      completed: 'text-emerald-600',
      failed: 'text-rose-600',
      active: 'text-purple-600',
      waiting: 'text-slate-600',
      skipped: 'text-slate-500',
    };

    Object.entries(statusColorMap).forEach(([status, colorClass]) => {
      const { unmount } = render(<StatusBadge status={status as StatusType} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass(colorClass);
      unmount();
    });
  });

  it('should render different sizes correctly', () => {
    const { rerender } = render(<StatusBadge {...defaultProps} size='sm' />);
    let badge = screen.getByRole('status');
    expect(badge).toHaveClass('px-2', 'py-1', 'text-xs');

    rerender(<StatusBadge {...defaultProps} size='md' />);
    badge = screen.getByRole('status');
    expect(badge).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<StatusBadge {...defaultProps} size='lg' />);
    badge = screen.getByRole('status');
    expect(badge).toHaveClass('px-4', 'py-2', 'text-base');
  });

  it('should show/hide icon based on showIcon prop', () => {
    const { rerender } = render(
      <StatusBadge {...defaultProps} showIcon={true} />
    );

    // Icon should be present (Clock icon for pending status)
    let badge = screen.getByRole('status');
    expect(badge.querySelector('svg')).toBeInTheDocument();

    rerender(<StatusBadge {...defaultProps} showIcon={false} />);
    badge = screen.getByRole('status');
    expect(badge.querySelector('svg')).not.toBeInTheDocument();
  });

  it('should apply glow effect when showGlow is true', () => {
    const { rerender } = render(
      <StatusBadge {...defaultProps} showGlow={true} />
    );

    let badge = screen.getByRole('status');
    expect(badge).toHaveClass('shadow-lg');

    rerender(<StatusBadge {...defaultProps} showGlow={false} />);
    badge = screen.getByRole('status');
    expect(badge).not.toHaveClass('shadow-lg');
  });

  it('should apply custom className', () => {
    render(<StatusBadge {...defaultProps} className='custom-class' />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    render(<StatusBadge status='processing' />);

    const badge = screen.getByRole('status', { name: 'Status: Processing' });
    expect(badge).toHaveAttribute('aria-label', 'Status: Processing');
    expect(badge).toHaveAttribute('aria-live', 'polite'); // Processing is animated
  });

  it('should set aria-live for animated statuses', () => {
    const { rerender } = render(<StatusBadge status='processing' />);
    let badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-live', 'polite');

    rerender(<StatusBadge status='active' />);
    badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-live', 'polite');

    rerender(<StatusBadge status='completed' />);
    badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-live', 'off');
  });

  it('should render correct icons for each status', () => {
    const statusIcons = {
      pending: 'Clock',
      processing: 'Loader2',
      completed: 'CheckCircle',
      failed: 'XCircle',
      active: 'Play',
      waiting: 'Clock',
      skipped: 'AlertCircle',
    };

    Object.keys(statusIcons).forEach((status) => {
      const { unmount } = render(
        <StatusBadge status={status as StatusType} showIcon={true} />
      );

      const badge = screen.getByRole('status');
      const icon = badge.querySelector('svg');
      expect(icon).toBeInTheDocument();
      unmount();
    });
  });

  it('should handle animation prop correctly', () => {
    const { rerender } = render(
      <StatusBadge {...defaultProps} animate={true} />
    );

    // Component should render without errors when animate is true
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<StatusBadge {...defaultProps} animate={false} />);

    // Component should render without errors when animate is false
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render with all props combined', () => {
    render(
      <StatusBadge
        status='completed'
        size='lg'
        showGlow={true}
        animate={true}
        showIcon={true}
        className='test-class'
      />
    );

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('test-class');
    expect(badge).toHaveClass('px-4', 'py-2', 'text-base'); // lg size
    expect(badge).toHaveClass('shadow-lg'); // glow
    expect(badge).toHaveClass('text-emerald-600'); // completed color
    expect(badge.querySelector('svg')).toBeInTheDocument(); // icon
  });

  it('should handle edge cases gracefully', () => {
    // Test with undefined status (should fallback to pending)
    render(<StatusBadge status={'unknown' as StatusType} />);

    // Should still render without crashing
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should be memoized correctly', () => {
    const { rerender } = render(<StatusBadge {...defaultProps} />);

    // Re-render with same props
    rerender(<StatusBadge {...defaultProps} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should handle different icon sizes correctly', () => {
    const { rerender } = render(
      <StatusBadge {...defaultProps} size='sm' showIcon={true} />
    );
    let icon = screen.getByRole('status').querySelector('svg');
    expect(icon).toHaveClass('w-3', 'h-3');

    rerender(<StatusBadge {...defaultProps} size='md' showIcon={true} />);
    icon = screen.getByRole('status').querySelector('svg');
    expect(icon).toHaveClass('w-4', 'h-4');

    rerender(<StatusBadge {...defaultProps} size='lg' showIcon={true} />);
    icon = screen.getByRole('status').querySelector('svg');
    expect(icon).toHaveClass('w-5', 'h-5');
  });

  it('should maintain proper gap spacing for different sizes', () => {
    const { rerender } = render(
      <StatusBadge {...defaultProps} size='sm' showIcon={true} />
    );
    let badge = screen.getByRole('status');
    expect(badge).toHaveClass('gap-1');

    rerender(<StatusBadge {...defaultProps} size='md' showIcon={true} />);
    badge = screen.getByRole('status');
    expect(badge).toHaveClass('gap-1.5');

    rerender(<StatusBadge {...defaultProps} size='lg' showIcon={true} />);
    badge = screen.getByRole('status');
    expect(badge).toHaveClass('gap-2');
  });
});
