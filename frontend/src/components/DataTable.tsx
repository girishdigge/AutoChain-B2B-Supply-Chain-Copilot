import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// Types for the DataTable
export interface Column<T> {
  key: keyof T | string;
  header: string;
  accessor?: (row: T) => any;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  onRowAction?: (action: string, row: T) => void;
  className?: string;
  rowActions?: Array<{
    label: string;
    action: string;
    icon?: React.ReactNode;
  }>;
}

// Skeleton loader component
const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className='space-y-3'>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className='flex space-x-4'>
        {Array.from({ length: columns }).map((_, j) => (
          <div
            key={j}
            className='h-4 bg-muted/50 rounded animate-pulse flex-1'
          />
        ))}
      </div>
    ))}
  </div>
);

// Enhanced empty state component
const EmptyState: React.FC<{
  message?: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}> = ({
  message = 'No data available',
  hasFilters = false,
  onClearFilters,
}) => (
  <div className='flex flex-col items-center justify-center py-12 text-center'>
    <div className='w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4'>
      <Search className='w-8 h-8 text-muted-foreground/50' />
    </div>
    <h3 className='text-lg font-medium text-foreground mb-2'>
      {hasFilters ? 'No Results Found' : 'No Data Available'}
    </h3>
    <p className='text-muted-foreground max-w-sm mb-4'>{message}</p>
    {hasFilters && onClearFilters && (
      <Button variant='outline' onClick={onClearFilters} className='gap-2'>
        <X className='w-4 h-4' />
        Clear Filters
      </Button>
    )}
  </div>
);

const DataTable = React.memo(
  <T extends Record<string, any>>({
    data,
    columns,
    searchable = true,
    filterable = true,
    sortable = true,
    pagination = true,
    pageSize = 10,
    loading = false,
    emptyState,
    onRowClick,
    onRowAction,
    className = '',
    rowActions = [],
  }: DataTableProps<T>) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{
      key: string;
      direction: 'asc' | 'desc';
    } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [showFilters, setShowFilters] = useState(false);

    // Filter and search data
    const filteredData = useMemo(() => {
      let result = [...data];

      // Apply search
      if (searchTerm && searchable) {
        result = result.filter((row) =>
          columns.some((column) => {
            const value = column.accessor
              ? column.accessor(row)
              : row[column.key as keyof T];
            return String(value)
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
          })
        );
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          result = result.filter((row) => {
            const rowValue = row[key as keyof T];
            return String(rowValue).toLowerCase().includes(value.toLowerCase());
          });
        }
      });

      return result;
    }, [data, searchTerm, filters, columns, searchable]);

    // Sort data
    const sortedData = useMemo(() => {
      if (!sortConfig || !sortable) return filteredData;

      return [...filteredData].sort((a, b) => {
        const column = columns.find((col) => col.key === sortConfig.key);
        const aValue = column?.accessor
          ? column.accessor(a)
          : a[sortConfig.key as keyof T];
        const bValue = column?.accessor
          ? column.accessor(b)
          : b[sortConfig.key as keyof T];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }, [filteredData, sortConfig, columns, sortable]);

    // Paginate data
    const paginatedData = useMemo(() => {
      if (!pagination) return sortedData;

      const startIndex = (currentPage - 1) * pageSize;
      return sortedData.slice(startIndex, startIndex + pageSize);
    }, [sortedData, currentPage, pageSize, pagination]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = (columnKey: string) => {
      if (!sortable) return;

      setSortConfig((current) => {
        if (current?.key === columnKey) {
          if (current.direction === 'asc') {
            return { key: columnKey, direction: 'desc' };
          } else {
            return null; // Remove sort
          }
        }
        return { key: columnKey, direction: 'asc' };
      });
    };

    const getSortIcon = (columnKey: string) => {
      if (!sortConfig || sortConfig.key !== columnKey) {
        return <ArrowUpDown className='w-4 h-4 opacity-50' />;
      }
      return sortConfig.direction === 'asc' ? (
        <ArrowUp className='w-4 h-4' />
      ) : (
        <ArrowDown className='w-4 h-4' />
      );
    };

    const handlePageChange = (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const handleFilterChange = (columnKey: string, value: string) => {
      setFilters((prev) => ({
        ...prev,
        [columnKey]: value,
      }));
      setCurrentPage(1); // Reset to first page when filtering
    };

    const clearFilters = () => {
      setFilters({});
      setCurrentPage(1);
    };

    const handleRowAction = (
      action: string,
      row: T,
      event: React.MouseEvent
    ) => {
      event.stopPropagation();
      onRowAction?.(action, row);
    };

    // Get filterable columns
    const filterableColumns = columns.filter((col) => col.filterable !== false);
    const hasActiveFilters = Object.values(filters).some(
      (value) => value !== ''
    );

    if (loading) {
      return (
        <div
          className={`bg-card rounded-2xl border border-border/50 p-6 ${className}`}
        >
          <TableSkeleton rows={pageSize} columns={columns.length} />
        </div>
      );
    }

    return (
      <div
        className={`bg-card rounded-2xl border border-border/50 overflow-hidden ${className}`}
      >
        {/* Toolbar */}
        <div className='p-6 border-b border-border/50'>
          <div className='flex items-center justify-between gap-4'>
            {/* Search */}
            {searchable && (
              <div className='relative flex-1 max-w-sm'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <input
                  type='text'
                  placeholder='Search...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
                />
              </div>
            )}

            <div className='flex items-center gap-2'>
              {/* Filter toggle */}
              {filterable && filterableColumns.length > 0 && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setShowFilters(!showFilters)}
                  className={`gap-2 ${showFilters ? 'bg-muted' : ''}`}
                >
                  <Filter className='w-4 h-4' />
                  Filters
                  {hasActiveFilters && (
                    <Badge
                      variant='secondary'
                      className='ml-1 h-5 w-5 p-0 text-xs'
                    >
                      {Object.values(filters).filter((v) => v !== '').length}
                    </Badge>
                  )}
                </Button>
              )}

              {/* Clear filters */}
              {hasActiveFilters && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearFilters}
                  className='gap-2 text-muted-foreground hover:text-foreground'
                >
                  <X className='w-4 h-4' />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          {filterable && showFilters && filterableColumns.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='mt-4 pt-4 border-t border-border/50'
            >
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {filterableColumns.map((column) => (
                  <div key={String(column.key)} className='space-y-2'>
                    <label className='text-sm font-medium text-muted-foreground'>
                      {column.header}
                    </label>
                    <input
                      type='text'
                      placeholder={`Filter by ${column.header.toLowerCase()}...`}
                      value={filters[String(column.key)] || ''}
                      onChange={(e) =>
                        handleFilterChange(String(column.key), e.target.value)
                      }
                      className='w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm'
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Table */}
        <div className='overflow-x-auto'>
          <table className='w-full' role='table' aria-label='Data table'>
            <thead>
              <tr className='border-b border-border/50' role='row'>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    role='columnheader'
                    aria-sort={
                      sortConfig?.key === String(column.key)
                        ? sortConfig.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : column.sortable !== false && sortable
                        ? 'none'
                        : undefined
                    }
                    className={`
                    px-6 py-4 text-left text-sm font-medium text-muted-foreground
                    ${
                      column.sortable !== false && sortable
                        ? 'cursor-pointer hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20'
                        : ''
                    }
                    ${column.width ? column.width : ''}
                  `}
                    onClick={() =>
                      column.sortable !== false &&
                      handleSort(String(column.key))
                    }
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Enter' || e.key === ' ') &&
                        column.sortable !== false &&
                        sortable
                      ) {
                        e.preventDefault();
                        handleSort(String(column.key));
                      }
                    }}
                    tabIndex={column.sortable !== false && sortable ? 0 : -1}
                  >
                    <div className='flex items-center gap-2'>
                      {column.header}
                      {column.sortable !== false &&
                        sortable &&
                        getSortIcon(String(column.key))}
                    </div>
                  </th>
                ))}
                {rowActions.length > 0 && (
                  <th
                    role='columnheader'
                    className='px-6 py-4 text-right text-sm font-medium text-muted-foreground w-16'
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode='wait'>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)}
                    >
                      {emptyState || (
                        <EmptyState
                          message={
                            hasActiveFilters
                              ? 'No results match your current filters. Try adjusting your search criteria.'
                              : 'No data available to display.'
                          }
                          hasFilters={hasActiveFilters}
                          onClearFilters={
                            hasActiveFilters ? clearFilters : undefined
                          }
                        />
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <motion.tr
                      key={index}
                      role='row'
                      className={`
                      border-b border-border/30 hover:bg-muted/30 transition-colors
                      ${
                        onRowClick
                          ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20'
                          : ''
                      }
                    `}
                      onClick={() => onRowClick?.(row)}
                      onKeyDown={(e) => {
                        if (
                          (e.key === 'Enter' || e.key === ' ') &&
                          onRowClick
                        ) {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }}
                      tabIndex={onRowClick ? 0 : -1}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      whileHover={{
                        backgroundColor: 'rgba(var(--muted), 0.5)',
                        transition: { duration: 0.2 },
                      }}
                    >
                      {columns.map((column) => {
                        const value = column.accessor
                          ? column.accessor(row)
                          : row[column.key as keyof T];

                        return (
                          <td
                            key={String(column.key)}
                            role='cell'
                            className='px-6 py-4 text-sm'
                          >
                            {column.render
                              ? column.render(value, row)
                              : String(value)}
                          </td>
                        );
                      })}
                      {rowActions.length > 0 && (
                        <td role='cell' className='px-6 py-4 text-right'>
                          <div className='flex items-center justify-end'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-8 w-8 p-0'
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Actions for row ${index + 1}`}
                                >
                                  <MoreHorizontal className='w-4 h-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end' className='w-48'>
                                {rowActions.map((action) => (
                                  <DropdownMenuItem
                                    key={action.action}
                                    onClick={(e) =>
                                      handleRowAction(action.action, row, e)
                                    }
                                    className='flex items-center gap-2 cursor-pointer'
                                  >
                                    {action.icon}
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className='flex items-center justify-between px-6 py-4 border-t border-border/50'>
            <div
              className='text-sm text-muted-foreground'
              aria-live='polite'
              aria-atomic='true'
            >
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
              {sortedData.length} results
            </div>

            <nav
              className='flex items-center gap-2'
              aria-label='Table pagination'
            >
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className='p-2'
                aria-label='Go to first page'
              >
                <ChevronsLeft className='w-4 h-4' />
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className='p-2'
                aria-label='Go to previous page'
              >
                <ChevronLeft className='w-4 h-4' />
              </Button>

              <div className='flex items-center gap-1'>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => handlePageChange(page)}
                      aria-label={`Go to page ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                      className='px-3 py-2 text-sm'
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className='p-2'
                aria-label='Go to next page'
              >
                <ChevronRight className='w-4 h-4' />
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className='p-2'
                aria-label='Go to last page'
              >
                <ChevronsRight className='w-4 h-4' />
              </Button>
            </nav>
          </div>
        )}
      </div>
    );
  }
) as <T extends Record<string, any>>(
  props: DataTableProps<T>
) => React.JSX.Element;

(DataTable as any).displayName = 'DataTable';

export default DataTable;
