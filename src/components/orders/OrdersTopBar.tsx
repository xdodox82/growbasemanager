import { Button } from '@/components/ui/button';
import { Plus, Grid3x3, List, FileSpreadsheet, FileText, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onNewOrder: () => void;
  onBulkDateChange: () => void;
}

export function OrdersTopBar({ viewMode, onViewModeChange, onNewOrder, onBulkDateChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Objednávky</h1>
        <p className="text-xs text-gray-500">Spravujte objednávky od zákazníkov</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={onNewOrder} className="bg-[#10b981] hover:bg-[#059669] text-white h-9 text-sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nová objednávka
        </Button>
        <div className="hidden md:flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={onBulkDateChange} variant="outline" className="h-9 text-xs px-3 gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Zmena termínu</span>
        </Button>
        <Button variant="outline" className="h-9 text-xs px-3 gap-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Excel</span>
        </Button>
        <Button variant="outline" className="h-9 text-xs px-3 gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
      </div>
    </div>
  );
}
