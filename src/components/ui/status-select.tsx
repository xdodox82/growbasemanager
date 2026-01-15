import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Čakajúca',
  growing: 'Pestuje sa',
  ready: 'Pripravená',
  delivered: 'Doručená',
  cancelled: 'Zrušená',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  growing: 'bg-info/20 text-info border-info/30',
  ready: 'bg-success/20 text-success border-success/30',
  delivered: 'bg-muted text-muted-foreground border-muted',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

interface StatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  skipped?: boolean;
  className?: string;
}

export const StatusSelect = ({ 
  value, 
  onValueChange, 
  disabled = false,
  skipped = false,
  className = ''
}: StatusSelectProps) => {
  const displayValue = skipped ? 'Preskočená' : STATUS_LABELS[value] || STATUS_LABELS.pending;
  const colorClass = STATUS_COLORS[value] || STATUS_COLORS.pending;

  if (disabled || skipped) {
    return (
      <Badge className={`${colorClass} border text-xs ${className}`}>
        {displayValue}
      </Badge>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger 
        className={`h-auto p-0 border-0 bg-transparent shadow-none hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Badge className={`${colorClass} border text-xs cursor-pointer hover:opacity-80 transition-opacity`}>
          {displayValue}
        </Badge>
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        <SelectItem value="pending">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning" />
            Čakajúca
          </div>
        </SelectItem>
        <SelectItem value="growing">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-info" />
            Pestuje sa
          </div>
        </SelectItem>
        <SelectItem value="ready">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            Pripravená
          </div>
        </SelectItem>
        <SelectItem value="delivered">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            Doručená
          </div>
        </SelectItem>
        <SelectItem value="cancelled">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Zrušená
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export { STATUS_LABELS, STATUS_COLORS };
