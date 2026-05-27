import { Plus, Grid3x3, List, FileSpreadsheet, FileText, Calendar as CalendarIcon, Search, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onNewOrder: () => void;
  onBulkDateChange: () => void;
  showArchive: boolean;
  onShowArchiveChange: (v: boolean) => void;
  showCancelled: boolean;
  onShowCancelledChange: (v: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
}

export function OrdersTopBar({
  viewMode, onViewModeChange, onNewOrder, onBulkDateChange,
  showArchive, onShowArchiveChange,
  showCancelled, onShowCancelledChange,
  searchQuery, onSearchQueryChange,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-[#cbd5e1] px-3 py-3 md:px-4 flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-lg md:text-xl font-bold text-[#0f172a] mr-auto">Objednávky</span>

      {/* Vyhľadávanie podľa čísla objednávky */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchQueryChange(e.target.value)}
          placeholder="MR-001..."
          className="h-9 pl-8 pr-7 rounded-lg border border-[#cbd5e1] text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#16a34a] w-[120px] focus:w-[160px] transition-all"
        />
        {searchQuery && (
          <button onClick={() => onSearchQueryChange('')} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-[#94a3b8] hover:text-[#475569]" />
          </button>
        )}
      </div>

      <button
        onClick={onBulkDateChange}
        title="Zmena termínu"
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#cbd5e1] text-[#475569] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-colors"
      >
        <CalendarIcon className="w-5 h-5" />
      </button>

      <button className="hidden md:flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[#cbd5e1] text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
        <FileSpreadsheet className="w-4 h-4" />
        Export
      </button>

      <button
        title="PDF"
        className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] transition-colors"
      >
        <FileText className="w-5 h-5" />
      </button>

      <div className="hidden md:block w-px h-5 bg-[#cbd5e1]" />

      {/* View switcher — viditeľný aj na mobile */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onViewModeChange('grid')}
          title="Karty"
          aria-label="Zobraziť ako karty"
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
            viewMode === 'grid' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#475569]'
          }`}
        >
          <Grid3x3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          title="Zoznam"
          aria-label="Zobraziť ako zoznam"
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
            viewMode === 'list' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#475569]'
          }`}
        >
          <List className="w-5 h-5" />
        </button>
      </div>

      <div className="hidden md:block w-px h-5 bg-[#cbd5e1]" />

      <div className="hidden md:flex items-center gap-3 border-l border-[#cbd5e1] pl-3">
        <div className="flex items-center gap-1.5">
          <Switch id="topbar-archive" checked={showArchive} onCheckedChange={onShowArchiveChange} />
          <Label htmlFor="topbar-archive" className="text-xs text-[#374151] cursor-pointer whitespace-nowrap">Doručené</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch id="topbar-cancelled" checked={showCancelled} onCheckedChange={onShowCancelledChange} />
          <Label htmlFor="topbar-cancelled" className="text-xs text-[#374151] cursor-pointer whitespace-nowrap">Zrušené</Label>
        </div>
      </div>

      <div className="hidden md:block w-px h-5 bg-[#cbd5e1]" />

      <button
        onClick={onNewOrder}
        className="flex items-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg px-3 md:px-4 py-2.5 text-sm font-semibold transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span className="hidden sm:inline">Nová objednávka</span>
        <span className="sm:hidden">Nová</span>
      </button>
    </div>
  );
}
