import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DataTable from '../DataTable';
import type { Column, DataTableProps } from '../DataTable';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock UI components
vi.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => (
    <div data-testid='dropdown-menu'>{children}</div>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid='dropdown-content'>{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid='dropdown-item' onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid='dropdown-trigger'>{children}</div>
  ),
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

interface TestData {
  id: string;
  name: string;
  status: string;
  count: number;
}

describe('DataTable', () => {
  const mockData: TestData[] = [
    { id: '1', name: 'Item 1', status: 'active', count: 10 },
    { id: '2', name: 'Item 2', status: 'inactive', count: 20 },
    { id: '3', name: 'Item 3', status: 'active', count: 15 },
    { id: '4', name: 'Item 4', status: 'pending', count: 5 },
    { id: '5', name: 'Item 5', status: 'active', count: 25 },
  ];

  const mockColumns: Column<TestData>[] = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'status', header: 'Status', filterable: true },
    {
      key: 'count',
      header: 'Count',
      sortable: true,
      render: (value) => <span data-testid='count-cell'>{value}</span>,
    },
  ];

  const defaultProps: DataTableProps<TestData> = {
    data: mockData,
    columns: mockColumns,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render table with data', () => {
    render(<DataTable {...defaultProps} />);

    // Check headers
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();

    // Check data rows
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getAllByText('active').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('count-cell')).toHaveLength(5);
  });

  it('should render loading state', () => {
    render(<DataTable {...defaultProps} loading={true} />);

    // Should show skeleton loader
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    // Skeleton elements should be present
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0
    );
  });

  it('should render empty state when no data', () => {
    render(<DataTable {...defaultProps} data={[]} />);

    expect(screen.getByText('No Data Available')).toBeInTheDocument();
    expect(
      screen.getByText('No data available to display.')
    ).toBeInTheDocument();
  });

  it('should render custom empty state', () => {
    const customEmptyState = <div>Custom empty message</div>;
    render(
      <DataTable {...defaultProps} data={[]} emptyState={customEmptyState} />
    );

    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('should handle search functionality', async () => {
    const user = userEvent.setup();
    render(<DataTable {...defaultProps} searchable={true} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, 'Item 1');

    // Should only show Item 1
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('should handle sorting functionality', async () => {
    const user = userEvent.setup();
    render(<DataTable {...defaultProps} sortable={true} />);

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toBeInTheDocument();

    // Click to sort ascending
    await user.click(nameHeader!);

    // Verify sort icon is present
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

    // Click again to sort descending
    await user.click(nameHeader!);
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');

    // Click again to remove sort
    await user.click(nameHeader!);
    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
  });

  it('should handle keyboard navigation for sorting', async () => {
    const user = userEvent.setup();
    render(<DataTable {...defaultProps} sortable={true} />);

    const nameHeader = screen.getByText('Name').closest('th');

    // Focus and press Enter
    nameHeader!.focus();
    await user.keyboard('{Enter}');
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

    // Press Space
    await user.keyboard(' ');
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('should handle filtering functionality', async () => {
    const user = userEvent.setup();
    render(<DataTable {...defaultProps} filterable={true} />);

    // Open filters
    const filterButton = screen.getByText('Filters');
    await user.click(filterButton);

    // Should show filter inputs
    const nameFilter = screen.getByPlaceholderText('Filter by name...');
    expect(nameFilter).toBeInTheDocument();

    await user.type(nameFilter, 'Item 1');

    // Should filter results
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('should handle pagination', async () => {
    const user = userEvent.setup();
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Item ${i + 1}`,
      status: 'active',
      count: i + 1,
    }));

    render(
      <DataTable
        {...defaultProps}
        data={largeData}
        pagination={true}
        pageSize={10}
      />
    );

    // Should show pagination info
    expect(
      screen.getByText('Showing 1 to 10 of 25 results')
    ).toBeInTheDocument();

    // Should show pagination buttons
    const nextButton = screen.getByLabelText('Go to next page');
    expect(nextButton).toBeInTheDocument();

    await user.click(nextButton);

    // Should show second page
    expect(
      screen.getByText('Showing 11 to 20 of 25 results')
    ).toBeInTheDocument();
  });

  it('should handle row clicks', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable {...defaultProps} onRowClick={onRowClick} />);

    const firstRow = screen.getByText('Item 1').closest('tr');
    await user.click(firstRow!);

    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('should handle keyboard navigation for rows', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable {...defaultProps} onRowClick={onRowClick} />);

    const firstRow = screen.getByText('Item 1').closest('tr');
    firstRow!.focus();
    await user.keyboard('{Enter}');

    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);

    await user.keyboard(' ');
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('should handle row actions', async () => {
    const user = userEvent.setup();
    const onRowAction = vi.fn();
    const rowActions = [
      { label: 'Edit', action: 'edit', icon: <span>✏️</span> },
      { label: 'Delete', action: 'delete', icon: <span>🗑️</span> },
    ];

    render(
      <DataTable
        {...defaultProps}
        onRowAction={onRowAction}
        rowActions={rowActions}
      />
    );

    // Should show actions column
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Should show action buttons
    const actionButtons = screen.getAllByTestId('dropdown-trigger');
    expect(actionButtons).toHaveLength(5); // One per row

    // Click first action button
    await user.click(actionButtons[0]);

    // Should show dropdown items
    const editActions = screen.getAllByText('Edit');
    await user.click(editActions[0]);

    expect(onRowAction).toHaveBeenCalledWith('edit', mockData[0]);
  });

  it('should clear filters', async () => {
    const user = userEvent.setup();
    render(<DataTable {...defaultProps} filterable={true} />);

    // Open filters and add a filter
    const filterButton = screen.getByText('Filters');
    await user.click(filterButton);

    const nameFilter = screen.getByPlaceholderText('Filter by name...');
    await user.type(nameFilter, 'Item 1');

    // Should show clear button
    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    // Filter should be cleared
    expect(nameFilter).toHaveValue('');
  });

  it('should handle custom column rendering', () => {
    render(<DataTable {...defaultProps} />);

    // Custom render function should be used for count column
    const countCells = screen.getAllByTestId('count-cell');
    expect(countCells).toHaveLength(5);
    expect(countCells[0]).toHaveTextContent('10');
  });

  it('should handle column accessor functions', () => {
    const columnsWithAccessor: Column<TestData>[] = [
      {
        key: 'fullInfo',
        header: 'Full Info',
        accessor: (row) => `${row.name} - ${row.status}`,
      },
    ];

    render(<DataTable data={mockData} columns={columnsWithAccessor} />);

    expect(screen.getByText('Item 1 - active')).toBeInTheDocument();
    expect(screen.getByText('Item 2 - inactive')).toBeInTheDocument();
  });

  it('should disable features when props are false', () => {
    render(
      <DataTable
        {...defaultProps}
        searchable={false}
        filterable={false}
        sortable={false}
        pagination={false}
      />
    );

    // Should not show search
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();

    // Should not show filters button
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();

    // Headers should not be clickable for sorting
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).not.toHaveAttribute('aria-sort');

    // Should not show pagination
    expect(
      screen.queryByText(/Showing \d+ to \d+ of \d+ results/)
    ).not.toBeInTheDocument();
  });

  it('should handle empty search results', async () => {
    const user = userEvent.setup();
    render(<DataTable {...defaultProps} searchable={true} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'nonexistent');

    expect(screen.getByText('No Data Available')).toBeInTheDocument();
    expect(
      screen.getByText(/No data available to display/)
    ).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <DataTable {...defaultProps} className='custom-table' />
    );

    expect(container.firstChild).toHaveClass('custom-table');
  });

  it('should handle accessibility correctly', () => {
    render(<DataTable {...defaultProps} />);

    const table = screen.getByRole('table', { name: 'Data table' });
    expect(table).toBeInTheDocument();

    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders).toHaveLength(4);

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(6); // 1 header + 5 data rows
  });

  it('should handle pagination edge cases', async () => {
    const user = userEvent.setup();
    render(<DataTable {...defaultProps} pagination={true} pageSize={3} />);

    // With 5 items and pageSize 3, pagination should be shown
    expect(screen.getByText('Showing 1 to 3 of 5 results')).toBeInTheDocument();

    const firstPageButton = screen.getByLabelText('Go to first page');
    const prevButton = screen.getByLabelText('Go to previous page');

    // Should be disabled on first page
    expect(firstPageButton).toBeDisabled();
    expect(prevButton).toBeDisabled();

    // Next/last should be enabled since there are more pages
    const nextButton = screen.getByLabelText('Go to next page');
    const lastPageButton = screen.getByLabelText('Go to last page');
    expect(nextButton).not.toBeDisabled();
    expect(lastPageButton).not.toBeDisabled();
  });

  it('should handle sorting with different data types', async () => {
    const user = userEvent.setup();
    render(<DataTable {...defaultProps} sortable={true} />);

    // Sort by count (numeric)
    const countHeader = screen.getByText('Count').closest('th');
    await user.click(countHeader!);

    // Should sort numerically, not alphabetically
    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1]; // Skip header row
    expect(firstDataRow).toHaveTextContent('5'); // Smallest count
  });
});
