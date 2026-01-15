import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ viewMode, onViewModeChange, className }: ViewToggleProps) {
  return (
    <div className={cn("flex items-center border rounded-lg p-1 bg-muted/50", className)}>
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => onViewModeChange('grid')}
        title="Zobrazenie kariet"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => onViewModeChange('list')}
        title="Zobrazenie zoznamu"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
