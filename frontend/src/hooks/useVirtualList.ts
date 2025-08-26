import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface VirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside visible area
  enabled?: boolean;
}

interface VirtualListReturn<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    offsetTop: number;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions
): VirtualListReturn<T> {
  const { itemHeight, containerHeight, overscan = 5, enabled = true } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    if (!enabled) {
      return {
        startIndex: 0,
        endIndex: items.length - 1,
        totalHeight: items.length * itemHeight,
      };
    }

    const visibleStartIndex = Math.floor(scrollTop / itemHeight);
    const visibleEndIndex = Math.min(
      visibleStartIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      startIndex: Math.max(0, visibleStartIndex - overscan),
      endIndex: Math.min(items.length - 1, visibleEndIndex + overscan),
      totalHeight: items.length * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan, enabled]);

  const virtualItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetTop: i * itemHeight,
      });
    }
    return result;
  }, [startIndex, endIndex, items, itemHeight]);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (!scrollElementRef.current) return;

      const targetScrollTop = index * itemHeight;
      scrollElementRef.current.scrollTop = targetScrollTop;
      setScrollTop(targetScrollTop);
    },
    [itemHeight]
  );

  const scrollToTop = useCallback(() => {
    scrollToIndex(0);
  }, [scrollToIndex]);

  const scrollToBottom = useCallback(() => {
    scrollToIndex(items.length - 1);
  }, [scrollToIndex, items.length]);

  const handleScroll = useCallback((element: HTMLElement) => {
    setScrollTop(element.scrollTop);
  }, []);

  // Expose scroll element ref for external use
  const setScrollElement = useCallback(
    (element: HTMLElement | null) => {
      scrollElementRef.current = element;

      if (element) {
        const onScroll = () => handleScroll(element);
        element.addEventListener('scroll', onScroll, { passive: true });

        return () => {
          element.removeEventListener('scroll', onScroll);
        };
      }
    },
    [handleScroll]
  );

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
  };
}

/**
 * Hook for virtual grid (2D virtualization)
 */
interface VirtualGridOptions {
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  columnCount: number;
  overscan?: number;
  enabled?: boolean;
}

export function useVirtualGrid<T>(items: T[], options: VirtualGridOptions) {
  const {
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    columnCount,
    overscan = 5,
    enabled = true,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const rowCount = Math.ceil(items.length / columnCount);

  const { startRowIndex, endRowIndex, startColIndex, endColIndex } =
    useMemo(() => {
      if (!enabled) {
        return {
          startRowIndex: 0,
          endRowIndex: rowCount - 1,
          startColIndex: 0,
          endColIndex: columnCount - 1,
        };
      }

      const visibleStartRowIndex = Math.floor(scrollTop / itemHeight);
      const visibleEndRowIndex = Math.min(
        visibleStartRowIndex + Math.ceil(containerHeight / itemHeight),
        rowCount - 1
      );

      const visibleStartColIndex = Math.floor(scrollLeft / itemWidth);
      const visibleEndColIndex = Math.min(
        visibleStartColIndex + Math.ceil(containerWidth / itemWidth),
        columnCount - 1
      );

      return {
        startRowIndex: Math.max(0, visibleStartRowIndex - overscan),
        endRowIndex: Math.min(rowCount - 1, visibleEndRowIndex + overscan),
        startColIndex: Math.max(0, visibleStartColIndex - overscan),
        endColIndex: Math.min(columnCount - 1, visibleEndColIndex + overscan),
      };
    }, [
      scrollTop,
      scrollLeft,
      itemHeight,
      itemWidth,
      containerHeight,
      containerWidth,
      rowCount,
      columnCount,
      overscan,
      enabled,
    ]);

  const virtualItems = useMemo(() => {
    const result = [];
    for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex++) {
      for (let colIndex = startColIndex; colIndex <= endColIndex; colIndex++) {
        const itemIndex = rowIndex * columnCount + colIndex;
        if (itemIndex < items.length) {
          result.push({
            index: itemIndex,
            rowIndex,
            colIndex,
            item: items[itemIndex],
            offsetTop: rowIndex * itemHeight,
            offsetLeft: colIndex * itemWidth,
          });
        }
      }
    }
    return result;
  }, [
    startRowIndex,
    endRowIndex,
    startColIndex,
    endColIndex,
    items,
    columnCount,
    itemHeight,
    itemWidth,
  ]);

  return {
    virtualItems,
    totalHeight: rowCount * itemHeight,
    totalWidth: columnCount * itemWidth,
    setScrollTop,
    setScrollLeft,
  };
}
