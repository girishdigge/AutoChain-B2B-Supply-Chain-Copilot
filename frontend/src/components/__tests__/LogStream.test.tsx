import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LogStream from '../LogStream';
import type { LogEntry } from '../../types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('LogStream Component', () => {
  const mockLogs: LogEntry[] = [
    {
      timestamp: '2024-01-01T10:00:00Z',
      level: 'info',
      message: 'Application started',
    },
    {
      timestamp: '2024-01-01T10:01:00Z',
      level: 'warn',
      message: 'Low memory warning',
    },
    {
      timestamp: '2024-01-01T10:02:00Z',
      level: 'error',
      message: 'Database connection failed',
    },
    {
      timestamp: '2024-01-01T10:03:00Z',
      level: 'info',
      message: 'User logged in',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render log entries', () => {
    render(<LogStream logs={mockLogs} />);

    expect(screen.getByText('Application started')).toBeInTheDocument();
    expect(screen.getByText('Low memory warning')).toBeInTheDocument();
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.getByText('User logged in')).toBeInTheDocument();
  });

  it('should show log count', () => {
    render(<LogStream logs={mockLogs} />);

    expect(screen.getByText(/4\s+entries/)).toBeInTheDocument();
  });

  it('should handle empty logs', () => {
    render(<LogStream logs={[]} />);

    expect(screen.getByText(/0\s+entries/)).toBeInTheDocument();
    expect(
      screen.getByText('No log entries available yet.')
    ).toBeInTheDocument();
  });

  it('should show controls when enabled', () => {
    render(<LogStream logs={mockLogs} showControls={true} />);

    expect(screen.getByTitle('Disable auto-scroll')).toBeInTheDocument();
    expect(screen.getByTitle('Scroll to bottom')).toBeInTheDocument();
    expect(screen.getByTitle('Scroll to top')).toBeInTheDocument();
    expect(screen.getByTitle('Export logs')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle filters')).toBeInTheDocument();
  });

  it('should handle search functionality', async () => {
    const user = userEvent.setup();
    render(<LogStream logs={mockLogs} searchable={true} showControls={true} />);

    // Open filters first to show search
    const filterButton = screen.getByTitle('Toggle filters');
    await user.click(filterButton);

    const searchInput = screen.getByPlaceholderText('Search logs...');
    await user.type(searchInput, 'Database');

    // Should filter to show only database-related logs
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.queryByText('Application started')).not.toBeInTheDocument();
  });

  it('handles log level filtering', async () => {
    const user = userEvent.setup();
    render(<LogStream logs={mockLogs} showControls={true} filterable={true} />);

    // Open filters
    const filterButton = screen.getByTitle('Toggle filters');
    await user.click(filterButton);

    // Should show filter options - use getAllByText since there are multiple INFO elements
    const infoElements = screen.getAllByText('INFO');
    expect(infoElements.length).toBeGreaterThan(0);

    const errorElements = screen.getAllByText('ERROR');
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it('should handle auto-scroll toggle', async () => {
    const user = userEvent.setup();
    render(<LogStream logs={mockLogs} showControls={true} />);

    const autoScrollButton = screen.getByTitle('Disable auto-scroll');
    await user.click(autoScrollButton);

    // Button text should change
    expect(screen.getByTitle('Enable auto-scroll')).toBeInTheDocument();
  });

  it('should have LogStream component available for import', () => {
    expect(LogStream).toBeDefined();
    // LogStream might be a React.memo wrapped component, so check for object or function
    expect(
      typeof LogStream === 'function' || typeof LogStream === 'object'
    ).toBe(true);
  });
});
