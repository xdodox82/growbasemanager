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
    <div className="bg-white rounded-xl border border-[#e2e8f0] px-4 py-3 flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-xl font-bold text-[#0f172a] mr-auto">Objednávky</span>

      {/* Vyhľadávanie podľa čísla objednávky */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchQueryChange(e.target.value)}
          placeholder="MR-001..."
          className="h-9 pl-8 pr-7 rounded-lg border border-[#e2e8f0] text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#16a34a] w-[120px] focus:w-[160px] transition-all"
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
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-colors"
      >
        <CalendarIcon className="w-5 h-5" />
      </button>

      <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[#e2e8f0] text-sm font-medium text-[#64748b] hover:bg-[#f8fafc] transition-colors">
        <FileSpreadsheet className="w-4.5 h-4.5" />
        Export
      </button>

      <button
        title="PDF"
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] transition-colors"
      >
        <FileText className="w-5 h-5" />
      </button>

      <div className="w-px h-5 bg-[#e2e8f0]" />

      <div className="hidden md:flex items-center gap-0.5">
        <button
          onClick={() => onViewModeChange('grid')}
          title="Mriežka"
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
            viewMode === 'grid' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#64748b]'
          }`}
        >
          <Grid3x3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          title="Zoznam"
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
            viewMode === 'list' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#64748b]'
          }`}
        >
          <List className="w-5 h-5" />
        </button>
      </div>

      <div className="w-px h-5 bg-[#e2e8f0]" />

      <div className="hidden md:flex items-center gap-3 border-l border-[#e2e8f0] pl-3">
        <div className="flex items-center gap-1.5">
          <Switch id="topbar-archive" checked={showArchive} onCheckedChange={onShowArchiveChange} />
          <Label htmlFor="topbar-archive" className="text-xs text-[#374151] cursor-pointer whitespace-nowrap">Doručené</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch id="topbar-cancelled" checked={showCancelled} onCheckedChange={onShowCancelledChange} />
          <Label htmlFor="topbar-cancelled" className="text-xs text-[#374151] cursor-pointer whitespace-nowrap">Zrušené</Label>
        </div>
      </div>

      <div className="w-px h-5 bg-[#e2e8f0]" />

      <button
        onClick={onNewOrder}
        className="flex items-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
      >
        <Plus className="w-5 h-5" />
        Nová objednávka
      </button>
    </div>
  );
}
