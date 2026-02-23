import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PLANTING_STATUS_LABELS: Record<string, string> = {
  planned: 'Naplánované',
  sown: 'Zasiate',
  growing: 'Rastie',
  harvested: 'Zozbierané',
  wasted: 'Vyradené',
};

export const PLANTING_STATUS_COLORS: Record<string, string> = {
  planned: 'bg-muted text-muted-foreground border-muted',
  sown: 'bg-info/20 text-info border-info/30',
  growing: 'bg-success/20 text-success border-success/30',
  harvested: 'bg-primary/20 text-primary border-primary/30',
  wasted: 'bg-destructive/20 text-destructive border-destructive/30',
};

interface PlantingStatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PlantingStatusSelect = ({ 
  value, 
  onValueChange, 
  disabled = false,
  className = ''
}: PlantingStatusSelectProps) => {
  const displayValue = PLANTING_STATUS_LABELS[value] || PLANTING_STATUS_LABELS.planned;
  const colorClass = PLANTING_STATUS_COLORS[value] || PLANTING_STATUS_COLORS.planned;

  if (disabled) {
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
        <SelectItem value="planned">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            Naplánované
          </div>
        </SelectItem>
        <SelectItem value="sown">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-info" />
            Zasiate
          </div>
        </SelectItem>
        <SelectItem value="growing">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            Rastie
          </div>
        </SelectItem>
        <SelectItem value="harvested">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Zozbierané
          </div>
        </SelectItem>
        <SelectItem value="wasted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Vyradené
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
