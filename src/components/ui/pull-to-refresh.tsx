import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const { containerRef, isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh,
    threshold: 80,
  });

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-all duration-200",
          isPulling || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          top: Math.max(8, pullDistance - 40),
          transform: `translateX(-50%) rotate(${pullDistance * 2}deg)`
        }}
      >
        <div className={cn(
          "h-10 w-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center",
          isRefreshing && "animate-spin"
        )}>
          <RefreshCw className={cn(
            "h-5 w-5 text-primary",
            isRefreshing && "animate-spin"
          )} />
        </div>
      </div>
      
      {/* Content */}
      <div 
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
