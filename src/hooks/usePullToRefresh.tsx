import { useState, useEffect, useCallback, useRef } from 'react';
import { useIsMobile } from './use-mobile';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!containerRef.current) return;
    
    // Only trigger if at top of scroll
    if (containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!containerRef.current || startY.current === 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    // Only pull down, not up
    if (diff > 0 && containerRef.current.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    if (!isMobile || !containerRef.current) return;

    const container = containerRef.current;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isPulling: pullDistance > 0,
  };
}
