import React, { useEffect, useRef } from 'react';

interface AriaLiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  clearDelay?: number;
  className?: string;
}

const AriaLiveRegion: React.FC<AriaLiveRegionProps> = ({
  message,
  politeness = 'polite',
  clearDelay = 5000,
  className = '',
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (message && clearDelay > 0) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set a new timeout to clear the message
      timeoutRef.current = setTimeout(() => {
        // Message will be cleared by parent component
      }, clearDelay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearDelay]);

  if (!message) return null;

  return (
    <div
      aria-live={politeness}
      aria-atomic='true'
      className={`sr-only ${className}`}
      role='status'
    >
      {message}
    </div>
  );
};

export default AriaLiveRegion;
