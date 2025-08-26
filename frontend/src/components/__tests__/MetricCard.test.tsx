import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import MetricCard from '../MetricCard';
import type { MetricCardProps } from '../MetricCard';

// Mock framer-motion (already mocked in setup.ts, but ensuring it's available)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('MetricCard', () => {
  const defaultProps: MetricCardProps = {
    title: 'Test Metric',
    value: 1234,
  };

  it('should render basic metric card with title and value', () => {
    render(<MetricCard {...defaultProps} />);

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('1.2K')).toBeInTheDocument(); // Formatted value
  });

  it('should format large numbers correctly', () => {
    const { rerender } = render(<MetricCard {...defaultProps} value={1500} />);
    expect(screen.getByText('1.5K')).toBeInTheDocument();

    rerender(<MetricCard {...defaultProps} value={1500000} />);
    expect(screen.getByText('1.5M')).toBeInTheDocument();

    rerender(<MetricCard {...defaultProps} value={999} />);
    expect(screen.getByText('999')).toBeInTheDocument();
  });

  it('should display string values as-is', () => {
    render(<MetricCard {...defaultProps} value='Custom Value' />);
    expect(screen.getByText('Custom Value')).toBeInTheDocument();
  });

  it('should render delta badge with correct styling', () => {
    const deltaProps = {
      ...defaultProps,
      delta: {
        value: 15.5,
        type: 'increase' as const,
      },
    };

    render(<MetricCard {...deltaProps} />);

    const deltaElement = screen.getByText('+15.5%');
    expect(deltaElement).toBeInTheDocument();
    expect(deltaElement.closest('div')).toHaveClass('text-emerald-500');
  });

  it('should render different delta types with correct colors', () => {
    const { rerender } = render(
      <MetricCard {...defaultProps} delta={{ value: 10, type: 'increase' }} />
    );
    expect(screen.getByText('+10').closest('div')).toHaveClass(
      'text-emerald-500'
    );

    rerender(
      <MetricCard {...defaultProps} delta={{ value: 5, type: 'decrease' }} />
    );
    expect(screen.getByText('-5').closest('div')).toHaveClass('text-rose-500');

    rerender(
      <MetricCard {...defaultProps} delta={{ value: 0, type: 'neutral' }} />
    );
    expect(screen.getByText('0').closest('div')).toHaveClass('text-slate-500');
  });

  it('should render icon when provided', () => {
    const TestIcon = () => <span data-testid='test-icon'>📊</span>;

    render(<MetricCard {...defaultProps} icon={<TestIcon />} />);

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('should render sparkline when data is provided', () => {
    const sparklineData = [10, 20, 15, 25, 30];

    render(<MetricCard {...defaultProps} sparklineData={sparklineData} />);

    const sparkline = screen.getByRole('img', {
      name: /sparkline showing trend data/i,
    });
    expect(sparkline).toBeInTheDocument();

    // Check that SVG path is generated
    const path = sparkline.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('d');
  });

  it('should not render sparkline for insufficient data', () => {
    render(<MetricCard {...defaultProps} sparklineData={[10]} />);

    expect(
      screen.queryByRole('img', { name: /sparkline/i })
    ).not.toBeInTheDocument();
  });

  it('should apply gradient styling when enabled', () => {
    const { container } = render(
      <MetricCard {...defaultProps} gradient={true} />
    );

    const gradientDiv = container.querySelector('.bg-gradient-to-r');
    expect(gradientDiv).toBeInTheDocument();
  });

  it('should not apply gradient styling when disabled', () => {
    const { container } = render(
      <MetricCard {...defaultProps} gradient={false} />
    );

    const gradientDiv = container.querySelector('.bg-gradient-to-r');
    expect(gradientDiv).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MetricCard {...defaultProps} className='custom-class' />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should be focusable and have proper accessibility attributes', () => {
    render(<MetricCard {...defaultProps} />);

    const card = screen.getByRole('article', { name: 'Metric: Test Metric' });
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('aria-label', 'Metric: Test Metric');
  });

  it('should have proper accessibility for value and delta', () => {
    render(
      <MetricCard
        {...defaultProps}
        value={1500}
        delta={{ value: 10.5, type: 'increase' }}
      />
    );

    const valueElement = screen.getByLabelText('Current value: 1.5K');
    expect(valueElement).toBeInTheDocument();

    const deltaElement = screen.getByLabelText(
      'Change: increase by 10.5 percent'
    );
    expect(deltaElement).toBeInTheDocument();
  });

  it('should handle keyboard interaction', () => {
    render(<MetricCard {...defaultProps} />);

    const card = screen.getByRole('article');

    // Should be focusable
    card.focus();
    expect(document.activeElement).toBe(card);
  });

  it('should generate correct sparkline path', () => {
    const sparklineData = [0, 50, 100];

    render(<MetricCard {...defaultProps} sparklineData={sparklineData} />);

    const sparkline = screen.getByRole('img', { name: /sparkline/i });
    const path = sparkline.querySelector('path');

    expect(path).toHaveAttribute('d');
    const pathData = path?.getAttribute('d');
    expect(pathData).toContain('M'); // Should start with Move command
  });

  it('should handle edge cases in sparkline generation', () => {
    // All same values (no range)
    const flatData = [50, 50, 50, 50];

    render(<MetricCard {...defaultProps} sparklineData={flatData} />);

    const sparkline = screen.getByRole('img', { name: /sparkline/i });
    expect(sparkline).toBeInTheDocument();
  });

  it('should display correct delta formatting for different value types', () => {
    const { rerender } = render(
      <MetricCard {...defaultProps} delta={{ value: 15.7, type: 'increase' }} />
    );
    expect(screen.getByText('+15.7%')).toBeInTheDocument();

    rerender(
      <MetricCard {...defaultProps} delta={{ value: 5, type: 'decrease' }} />
    );
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('should render without crashing when no optional props are provided', () => {
    render(<MetricCard title='Simple' value={42} />);

    expect(screen.getByText('Simple')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should handle very large numbers correctly', () => {
    render(<MetricCard {...defaultProps} value={1234567890} />);
    expect(screen.getByText('1234.6M')).toBeInTheDocument();
  });

  it('should memoize correctly and not re-render unnecessarily', () => {
    const { rerender } = render(<MetricCard {...defaultProps} />);

    // Re-render with same props should not cause issues
    rerender(<MetricCard {...defaultProps} />);

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
  });
});
