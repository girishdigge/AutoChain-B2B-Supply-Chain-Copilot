import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Play,
  Pause,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Download,
  X,
  ChevronDown,
} from 'lucide-react';
import { LogEntry } from '../types';
import { cn } from '../lib/utils';

export interface LogStreamProps {
  logs: LogEntry[];
  maxHeight?: number;
  autoScroll?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  virtualized?: boolean;
  className?: string;
  onLogClick?: (log: LogEntry) => void;
  title?: string;
  showControls?: boolean;
}

interface LogFilters {
  levels: Set<string>;
  search: string;
  showClarificationOnly: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

const LOG_LEVEL_COLORS = {
  debug: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  warn: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
} as const;

// Special styling for clarification events
const getClarificationStyling = (log: LogEntry) => {
  if (log.metadata?.type === 'clarification_request') {
    return {
      containerClass:
        'bg-amber-500/5 border-l-4 border-l-amber-500 hover:bg-amber-500/10',
      iconClass: 'text-amber-500',
      icon: '🤔',
      badgeClass: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
    };
  }
  if (log.metadata?.type === 'clarification_response') {
    return {
      containerClass:
        'bg-emerald-500/5 border-l-4 border-l-emerald-500 hover:bg-emerald-500/10',
      iconClass: 'text-emerald-500',
      icon: '✅',
      badgeClass: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
    };
  }
  if (log.metadata?.type === 'workflow_resume') {
    return {
      containerClass:
        'bg-blue-500/5 border-l-4 border-l-blue-500 hover:bg-blue-500/10',
      iconClass: 'text-blue-500',
      icon: '🚀',
      badgeClass: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    };
  }
  return null;
};

const LOG_LEVEL_ICONS = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
} as const;

// Virtual scrolling hook for performance with large datasets
const useVirtualScroll = (
  items: LogEntry[],
  containerHeight: number,
  itemHeight: number = 60,
  enabled: boolean = true
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    if (!enabled) return { start: 0, end: items.length };

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 5, items.length); // Buffer

    return { start: Math.max(0, start - 5), end }; // Buffer
  }, [scrollTop, containerHeight, itemHeight, items.length, enabled]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleRange,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

const LogStream: React.FC<LogStreamProps> = React.memo(
  ({
    logs,
    maxHeight = 600,
    autoScroll = true,
    filterable = true,
    searchable = true,
    virtualized = true,
    className = '',
    onLogClick,
    title = 'Log Stream',
    showControls = true,
  }) => {
    const [filters, setFilters] = useState<LogFilters>({
      levels: new Set(['info', 'warn', 'error', 'debug']),
      search: '',
      showClarificationOnly: false,
    });
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScroll);
    const [showFilters, setShowFilters] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Filter logs based on current filters
    const filteredLogs = useMemo(() => {
      return logs.filter((log) => {
        // Clarification filter
        if (filters.showClarificationOnly) {
          const isClarificationEvent =
            log.metadata?.type === 'clarification_request' ||
            log.metadata?.type === 'clarification_response' ||
            log.metadata?.type === 'workflow_resume';
          if (!isClarificationEvent) return false;
        }

        // Level filter
        if (!filters.levels.has(log.level)) return false;

        // Search filter
        if (
          filters.search &&
          !log.message.toLowerCase().includes(filters.search.toLowerCase())
        ) {
          return false;
        }

        return true;
      });
    }, [logs, filters]);

    // Virtual scrolling setup
    const { visibleRange, totalHeight, offsetY, setScrollTop } =
      useVirtualScroll(filteredLogs, maxHeight, 60, virtualized);

    const visibleLogs = virtualized
      ? filteredLogs.slice(visibleRange.start, visibleRange.end)
      : filteredLogs;

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
      if (isAutoScrollEnabled && isAtBottom && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
      }
    }, [logs, isAutoScrollEnabled, isAtBottom]);

    // Handle scroll events
    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const { scrollTop, scrollHeight, clientHeight } = target;

        setScrollTop(scrollTop);

        // Check if user is at bottom
        const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
        setIsAtBottom(atBottom);

        // Disable auto-scroll if user scrolls up
        if (!atBottom && isAutoScrollEnabled) {
          setIsAutoScrollEnabled(false);
        }
      },
      [isAutoScrollEnabled]
    );

    // Format timestamp
    const formatTimestamp = (timestamp: string): string => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      });
    };

    // Toggle log level filter
    const toggleLogLevel = (level: string) => {
      setFilters((prev) => {
        const newLevels = new Set(prev.levels);
        if (newLevels.has(level)) {
          newLevels.delete(level);
        } else {
          newLevels.add(level);
        }
        return { ...prev, levels: newLevels };
      });
    };

    // Scroll to bottom
    const scrollToBottom = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
        setIsAutoScrollEnabled(true);
      }
    };

    // Scroll to top
    const scrollToTop = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
        setIsAutoScrollEnabled(false);
      }
    };

    // Clear search and filters
    const clearFilters = () => {
      setFilters({
        levels: new Set(['info', 'warn', 'error', 'debug']),
        search: '',
        showClarificationOnly: false,
      });
    };

    // Export logs (placeholder)
    const exportLogs = () => {
      const logText = filteredLogs
        .map(
          (log) =>
            `[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()}: ${
              log.message
            }`
        )
        .join('\n');

      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
      <motion.div
        ref={containerRef}
        className={cn(
          'bg-card rounded-2xl border border-border/50 overflow-hidden',
          'shadow-xl backdrop-blur-sm',
          className
        )}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-sky-500/5 via-cyan-400/5 to-fuchsia-500/5'>
          <div className='flex items-center gap-3'>
            <h3 className='text-lg font-semibold text-foreground'>{title}</h3>
            <div className='text-sm text-muted-foreground'>
              {filteredLogs.length}{' '}
              {filteredLogs.length === 1 ? 'entry' : 'entries'}
            </div>
          </div>

          {showControls && (
            <div className='flex items-center gap-2'>
              {/* Auto-scroll toggle */}
              <button
                onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
                className={cn(
                  'p-2 rounded-lg border transition-colors',
                  isAutoScrollEnabled
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'border-border hover:bg-muted/50'
                )}
                title={
                  isAutoScrollEnabled
                    ? 'Disable auto-scroll'
                    : 'Enable auto-scroll'
                }
              >
                {isAutoScrollEnabled ? (
                  <Pause className='w-4 h-4' />
                ) : (
                  <Play className='w-4 h-4' />
                )}
              </button>

              {/* Scroll to bottom */}
              <button
                onClick={scrollToBottom}
                className='p-2 rounded-lg border border-border hover:bg-muted/50'
                title='Scroll to bottom'
              >
                <ArrowDown className='w-4 h-4' />
              </button>

              {/* Scroll to top */}
              <button
                onClick={scrollToTop}
                className='p-2 rounded-lg border border-border hover:bg-muted/50'
                title='Scroll to top'
              >
                <ArrowUp className='w-4 h-4' />
              </button>

              {/* Export logs */}
              <button
                onClick={exportLogs}
                className='p-2 rounded-lg border border-border hover:bg-muted/50'
                title='Export logs'
              >
                <Download className='w-4 h-4' />
              </button>

              {/* Toggle filters */}
              {filterable && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'p-2 rounded-lg border transition-colors',
                    showFilters
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'border-border hover:bg-muted/50'
                  )}
                  title='Toggle filters'
                >
                  <Filter className='w-4 h-4' />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='border-b border-border/50 bg-muted/20'
            >
              <div className='p-4 space-y-4'>
                {/* Search */}
                {searchable && (
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                    <input
                      type='text'
                      placeholder='Search logs...'
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          search: e.target.value,
                        }))
                      }
                      className='w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    />
                    {filters.search && (
                      <button
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, search: '' }))
                        }
                        className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    )}
                  </div>
                )}

                {/* Clarification Filter */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-foreground'>
                    Event Filters
                  </label>
                  <div className='flex items-center gap-3'>
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          showClarificationOnly: !prev.showClarificationOnly,
                        }))
                      }
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                        filters.showClarificationOnly
                          ? 'bg-amber-500/20 text-amber-700 border-amber-500/30'
                          : 'text-muted-foreground bg-muted/50 border-border hover:bg-muted'
                      )}
                    >
                      <span className='text-base'>🤔</span>
                      Clarification Events Only
                    </button>
                  </div>
                </div>

                {/* Log Level Filters */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-foreground'>
                    Log Levels
                  </label>
                  <div className='flex flex-wrap gap-2'>
                    {Object.keys(LOG_LEVEL_COLORS).map((level) => (
                      <button
                        key={level}
                        onClick={() => toggleLogLevel(level)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                          filters.levels.has(level)
                            ? LOG_LEVEL_COLORS[
                                level as keyof typeof LOG_LEVEL_COLORS
                              ]
                            : 'text-muted-foreground bg-muted/50 border-border hover:bg-muted'
                        )}
                      >
                        {LOG_LEVEL_ICONS[level as keyof typeof LOG_LEVEL_ICONS]}{' '}
                        {level.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <div className='flex justify-end'>
                  <button
                    onClick={clearFilters}
                    className='flex items-center gap-2 px-3 py-1 text-sm text-muted-foreground hover:text-foreground'
                  >
                    <RotateCcw className='w-3 h-3' />
                    Clear Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Log Content */}
        <div
          ref={scrollContainerRef}
          className='overflow-y-auto'
          style={{ maxHeight }}
          onScroll={handleScroll}
        >
          {filteredLogs.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4'>
                <Search className='w-8 h-8 text-muted-foreground/50' />
              </div>
              <h3 className='text-lg font-medium text-foreground mb-2'>
                No Logs Found
              </h3>
              <p className='text-muted-foreground max-w-sm'>
                {filters.search || filters.levels.size < 4
                  ? 'Try adjusting your filters to see more results.'
                  : 'No log entries available yet.'}
              </p>
            </div>
          ) : (
            <div
              style={{
                height: virtualized ? totalHeight : 'auto',
                position: 'relative',
              }}
            >
              <div
                style={{
                  transform: virtualized
                    ? `translateY(${offsetY}px)`
                    : undefined,
                  position: virtualized ? 'absolute' : undefined,
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              >
                <AnimatePresence mode='popLayout'>
                  {visibleLogs.map((log, index) => {
                    const actualIndex = virtualized
                      ? visibleRange.start + index
                      : index;
                    return (
                      <motion.div
                        key={`${log.timestamp}-${actualIndex}`}
                        className={cn(
                          'flex items-start gap-3 p-4 border-b border-border/30 transition-colors',
                          onLogClick && 'cursor-pointer',
                          getClarificationStyling(log)?.containerClass ||
                            'hover:bg-muted/30'
                        )}
                        onClick={() => onLogClick?.(log)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        layout
                      >
                        {/* Timestamp */}
                        <div className='text-xs text-muted-foreground font-mono min-w-[80px] mt-1'>
                          {formatTimestamp(log.timestamp)}
                        </div>

                        {/* Log Level Badge or Special Icon */}
                        {getClarificationStyling(log) ? (
                          <div className='flex items-center gap-2'>
                            <div
                              className={cn(
                                'text-lg',
                                getClarificationStyling(log)?.iconClass
                              )}
                            >
                              {getClarificationStyling(log)?.icon}
                            </div>
                            <div
                              className={cn(
                                'px-2 py-1 rounded-full text-xs font-medium border min-w-[80px] text-center',
                                getClarificationStyling(log)?.badgeClass
                              )}
                            >
                              {log.metadata?.type === 'clarification_request'
                                ? 'CLARIFY'
                                : log.metadata?.type ===
                                  'clarification_response'
                                ? 'RESOLVED'
                                : log.metadata?.type === 'workflow_resume'
                                ? 'RESUME'
                                : log.level.toUpperCase()}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium border min-w-[60px] text-center',
                              LOG_LEVEL_COLORS[log.level]
                            )}
                          >
                            {log.level.toUpperCase()}
                          </div>
                        )}

                        {/* Message */}
                        <div className='flex-1 min-w-0'>
                          <div className='text-sm text-foreground break-words'>
                            {log.message}
                          </div>

                          {/* Enhanced Metadata for Clarification Events */}
                          {log.metadata && (
                            <div className='mt-2'>
                              {/* Special display for clarification events */}
                              {(log.metadata.type === 'clarification_request' ||
                                log.metadata.type ===
                                  'clarification_response') && (
                                <div className='space-y-2'>
                                  {log.metadata.type ===
                                    'clarification_request' && (
                                    <div className='p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg'>
                                      <div className='flex items-center gap-2 mb-2'>
                                        <span className='text-amber-600 font-medium text-sm'>
                                          Clarification Details
                                        </span>
                                      </div>
                                      {log.metadata.clarificationId && (
                                        <div className='text-xs text-muted-foreground mb-1'>
                                          ID: {log.metadata.clarificationId}
                                        </div>
                                      )}
                                      {log.metadata.timeout && (
                                        <div className='text-xs text-amber-600 mb-1'>
                                          ⏰ Timeout: {log.metadata.timeout}s
                                        </div>
                                      )}
                                      {log.metadata.options &&
                                        log.metadata.options.length > 0 && (
                                          <div className='text-xs'>
                                            <span className='text-muted-foreground'>
                                              Options:{' '}
                                            </span>
                                            <span className='text-foreground'>
                                              {log.metadata.options.join(', ')}
                                            </span>
                                          </div>
                                        )}
                                      {log.metadata.required && (
                                        <div className='text-xs text-red-600 mt-1'>
                                          ⚠️ Response Required
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {log.metadata.type ===
                                    'clarification_response' && (
                                    <div className='p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg'>
                                      <div className='flex items-center gap-2 mb-2'>
                                        <span className='text-emerald-600 font-medium text-sm'>
                                          Response Details
                                        </span>
                                      </div>
                                      {log.metadata.clarificationId && (
                                        <div className='text-xs text-muted-foreground mb-1'>
                                          ID: {log.metadata.clarificationId}
                                        </div>
                                      )}
                                      {log.metadata.responseTimestamp && (
                                        <div className='text-xs text-muted-foreground'>
                                          Responded at:{' '}
                                          {new Date(
                                            log.metadata.responseTimestamp
                                          ).toLocaleTimeString()}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Standard metadata display for other events */}
                              <details className='mt-2'>
                                <summary className='text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1'>
                                  <ChevronDown className='w-3 h-3' />
                                  {log.metadata.type
                                    ? 'Additional Metadata'
                                    : 'Metadata'}
                                </summary>
                                <pre className='mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground overflow-x-auto'>
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Auto-scroll indicator */}
        <AnimatePresence>
          {!isAtBottom && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className='absolute bottom-4 right-4'
            >
              <button
                onClick={scrollToBottom}
                className='flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition-colors'
              >
                <ArrowDown className='w-4 h-4' />
                New logs
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

LogStream.displayName = 'LogStream';

export default LogStream;
