import { Button } from '@/components/ui/button';
import { Home, Utensils, Store } from 'lucide-react';

interface CustomerTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
  showLabel?: boolean;
}

export function CustomerTypeFilter({ value, onChange, showLabel = true }: CustomerTypeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      {showLabel && <span className="text-sm text-gray-600 font-medium">Typ:</span>}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <Button
          variant={value === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('all')}
          className={value === 'all' ? 'h-8 bg-[#10b981] hover:bg-[#059669]' : 'h-8'}
        >
          Všetci
        </Button>
        <Button
          variant={value === 'home' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('home')}
          className={value === 'home' ? 'h-8 bg-[#10b981] hover:bg-[#059669]' : 'h-8'}
        >
          <Home className="h-4 w-4 mr-1" />
          Domáci
        </Button>
        <Button
          variant={value === 'gastro' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('gastro')}
          className={value === 'gastro' ? 'h-8 bg-[#10b981] hover:bg-[#059669]' : 'h-8'}
        >
          <Utensils className="h-4 w-4 mr-1" />
          Gastro
        </Button>
        <Button
          variant={value === 'wholesale' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('wholesale')}
          className={value === 'wholesale' ? 'h-8 bg-[#10b981] hover:bg-[#059669]' : 'h-8'}
        >
          <Store className="h-4 w-4 mr-1" />
          VO
        </Button>
      </div>
    </div>
  );
}
