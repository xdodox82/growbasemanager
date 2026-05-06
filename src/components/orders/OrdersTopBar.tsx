import { Plus, Grid3x3, List, FileSpreadsheet, FileText, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onNewOrder: () => void;
  onBulkDateChange: () => void;
}

export function OrdersTopBar({ viewMode, onViewModeChange, onNewOrder, onBulkDateChange }: Props) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] px-4 py-3 flex items-center gap-2 mb-4">
      <span className="text-xl font-bold text-[#0f172a] mr-auto">Objednávky</span>

      <button
        onClick={onBulkDateChange}
        title="Zmena termínu"
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-colors"
      >
        <CalendarIcon className="w-4 h-4" />
      </button>

      <button className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-[#e2e8f0] text-xs font-medium text-[#64748b] hover:bg-[#f8fafc] transition-colors">
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Export
      </button>

      <button
        title="PDF"
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] transition-colors"
      >
        <FileText className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-[#e2e8f0]" />

      <div className="hidden md:flex items-center gap-0.5">
        <button
          onClick={() => onViewModeChange('grid')}
          title="Mriežka"
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            viewMode === 'grid' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#64748b]'
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          title="Zoznam"
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            viewMode === 'list' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#64748b]'
          }`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-[#e2e8f0]" />

      <button
        onClick={onNewOrder}
        className="flex items-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nová objednávka
      </button>
    </div>
  );
}
