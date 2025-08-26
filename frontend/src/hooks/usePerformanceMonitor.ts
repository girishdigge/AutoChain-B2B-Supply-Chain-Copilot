import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  threshold?: number; // Log if render time exceeds this (ms)
  onSlowRender?: (metrics: PerformanceMetrics) => void;
}

export const usePerformanceMonitor = (
  componentName: string,
  options: UsePerformanceMonitorOptions = {}
) => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    threshold = 16, // 16ms = 60fps
    onSlowRender,
  } = options;

  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  const startMeasure = useCallback(() => {
    if (!enabled) return;
    renderStartTime.current = performance.now();
  }, [enabled]);

  const endMeasure = useCallback(() => {
    if (!enabled || renderStartTime.current === 0) return;

    const renderTime = performance.now() - renderStartTime.current;
    renderCount.current += 1;

    const metrics: PerformanceMetrics = {
      renderTime,
      componentName,
      timestamp: Date.now(),
    };

    // Log slow renders
    if (renderTime > threshold) {
      console.warn(
        `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(
          2
        )}ms`,
        metrics
      );
      onSlowRender?.(metrics);
    }

    // Log performance metrics in development
    if (
      process.env.NODE_ENV === 'development' &&
      renderCount.current % 10 === 0
    ) {
      console.log(
        `📊 ${componentName} render #${
          renderCount.current
        }: ${renderTime.toFixed(2)}ms`
      );
    }

    renderStartTime.current = 0;
  }, [enabled, threshold, componentName, onSlowRender]);

  useEffect(() => {
    startMeasure();
    return endMeasure;
  });

  return { startMeasure, endMeasure };
};

// Hook for measuring specific operations
export const useOperationTimer = () => {
  const timers = useRef<Map<string, number>>(new Map());

  const start = useCallback((operationName: string) => {
    timers.current.set(operationName, performance.now());
  }, []);

  const end = useCallback((operationName: string) => {
    const startTime = timers.current.get(operationName);
    if (startTime) {
      const duration = performance.now() - startTime;
      timers.current.delete(operationName);

      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      }

      return duration;
    }
    return 0;
  }, []);

  return { start, end };
};

// Hook for monitoring memory usage
export const useMemoryMonitor = (intervalMs: number = 5000) => {
  const memoryInfo = useRef<any>(null);

  useEffect(() => {
    if (!('memory' in performance)) return;

    const updateMemoryInfo = () => {
      memoryInfo.current = (performance as any).memory;
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  const logMemoryUsage = useCallback(() => {
    if (memoryInfo.current && process.env.NODE_ENV === 'development') {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } =
        memoryInfo.current;
      console.log('🧠 Memory Usage:', {
        used: `${(usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
        usage: `${((usedJSHeapSize / jsHeapSizeLimit) * 100).toFixed(2)}%`,
      });
    }
  }, []);

  return { memoryInfo: memoryInfo.current, logMemoryUsage };
};
