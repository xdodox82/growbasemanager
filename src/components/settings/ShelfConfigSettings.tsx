import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Sun,
  Moon,
  Loader2,
  StickyNote,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===================== TYPES =====================

interface ShelfConfig {
  id: string;
  name: string;
  zone: 'dark' | 'light';
  shelves: number;
  positions_per_shelf: number;
  notes: string | null;
  is_active: boolean;
  created_at?: string;
}

interface ShelfFormData {
  name: string;
  zone: 'dark' | 'light';
  shelves: number;
  positions_per_shelf: number;
  notes: string;
  is_active: boolean;
}

const EMPTY_FORM: ShelfFormData = {
  name: '',
  zone: 'light',
  shelves: 5,
  positions_per_shelf: 4,
  notes: '',
  is_active: true,
};

// ===================== MAIN COMPONENT =====================

export const ShelfConfigSettings = () => {
  const { toast } = useToast();

  const [shelves, setShelves] = useState<ShelfConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<ShelfConfig | null>(null);
  const [formData, setFormData] = useState<ShelfFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ShelfConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle saving per id (pre is_active toggle)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // ===================== FETCH =====================

  const fetchShelves = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shelf_config')
        .select('*')
        .order('name');
      if (error) throw error;
      setShelves((data as ShelfConfig[]) || []);
    } catch (err: any) {
      console.error('Error fetching shelves:', err);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať regály.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchShelves();
  }, [fetchShelves]);

  // ===================== DERIVED =====================

  const capacityTotals = useMemo(() => {
    let dark = 0;
    let light = 0;
    shelves.forEach(s => {
      if (!s.is_active) return;
      const cap = (s.shelves || 0) * (s.positions_per_shelf || 0);
      if (s.zone === 'dark') dark += cap;
      else if (s.zone === 'light') light += cap;
    });
    return { dark, light };
  }, [shelves]);

  // ===================== HANDLERS =====================

  const openAddDialog = () => {
    setEditingShelf(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (shelf: ShelfConfig) => {
    setEditingShelf(shelf);
    setFormData({
      name: shelf.name,
      zone: shelf.zone,
      shelves: shelf.shelves,
      positions_per_shelf: shelf.positions_per_shelf,
      notes: shelf.notes || '',
      is_active: shelf.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingShelf(null);
    setFormData(EMPTY_FORM);
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Vyplňte názov regálu.';
    if (formData.shelves < 1 || formData.shelves > 20) return 'Počet políc musí byť 1–20.';
    if (formData.positions_per_shelf < 1 || formData.positions_per_shelf > 10) return 'Pozícií na policu musí byť 1–10.';
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast({ title: 'Chyba validácie', description: validationError, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        zone: formData.zone,
        shelves: formData.shelves,
        positions_per_shelf: formData.positions_per_shelf,
        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
      };

      if (editingShelf) {
        const { error } = await supabase
          .from('shelf_config')
          .update(payload)
          .eq('id', editingShelf.id);
        if (error) throw error;
        toast({ title: 'Uložené', description: `Regál ${payload.name} bol aktualizovaný.` });
      } else {
        const { error } = await supabase
          .from('shelf_config')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Pridané', description: `Regál ${payload.name} bol pridaný.` });
      }
      closeDialog();
      await fetchShelves();
    } catch (err: any) {
      console.error('Save error:', err);
      toast({
        title: 'Chyba pri ukladaní',
        description: err.message || 'Skús to znova.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('shelf_config')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Zmazané', description: `Regál ${deleteTarget.name} bol odstránený.` });
      setDeleteTarget(null);
      await fetchShelves();
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({
        title: 'Chyba pri mazaní',
        description: err.message || 'Skús to znova.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (shelf: ShelfConfig) => {
    if (togglingIds.has(shelf.id)) return;
    setTogglingIds(prev => {
      const next = new Set(prev);
      next.add(shelf.id);
      return next;
    });
    try {
      const newValue = !shelf.is_active;
      const { error } = await supabase
        .from('shelf_config')
        .update({ is_active: newValue })
        .eq('id', shelf.id);
      if (error) throw error;
      // Optimistic update — neprekonávame celý refresh kvôli jednému toggle
      setShelves(prev => prev.map(s => s.id === shelf.id ? { ...s, is_active: newValue } : s));
      toast({
        title: newValue ? 'Aktivované' : 'Deaktivované',
        description: `Regál ${shelf.name} ${newValue ? 'sa započítava' : 'sa nezapočítava'} do kapacity.`,
      });
    } catch (err: any) {
      console.error('Toggle error:', err);
      toast({
        title: 'Chyba',
        description: err.message || 'Nepodarilo sa zmeniť stav.',
        variant: 'destructive',
      });
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(shelf.id);
        return next;
      });
    }
  };

  // ===================== RENDER =====================

  return (
    <>
      <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
        {/* Header sekcie */}
        <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between gap-3 bg-[#f8fafc]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
              <Layers className="h-4 w-4 text-[#16a34a]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#0f172a]">Regály a kapacita</h2>
              <p className="text-[11px] text-[#475569]">Pestovacie regály pre plán sadenia</p>
            </div>
          </div>
          <button
            onClick={openAddDialog}
            className="flex-shrink-0 h-9 px-3 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Pridať regál</span>
          </button>
        </div>

        {/* Súhrn kapacity */}
        {!loading && shelves.length > 0 && (
          <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="h-3.5 w-3.5 text-[#475569]" />
              <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide">Aktuálna kapacita</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-lg border border-[#e2e8f0] p-2.5 flex items-center gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-md bg-[#eff6ff] flex items-center justify-center">
                  <Moon className="h-3.5 w-3.5 text-[#2563eb]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wide font-semibold">Klíčenie</p>
                  <p className="text-base font-bold text-[#0f172a]">
                    {capacityTotals.dark} <span className="text-xs font-normal text-[#475569]">pozícií</span>
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-[#e2e8f0] p-2.5 flex items-center gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-md bg-[#f0fdf4] flex items-center justify-center">
                  <Sun className="h-3.5 w-3.5 text-[#16a34a]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wide font-semibold">Svetlo</p>
                  <p className="text-base font-bold text-[#0f172a]">
                    {capacityTotals.light} <span className="text-xs font-normal text-[#475569]">pozícií</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zoznam regálov */}
        <div className="divide-y divide-[#e2e8f0]">
          {loading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </>
          ) : shelves.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-2">
                <Layers className="h-6 w-6 text-[#94a3b8]" />
              </div>
              <h3 className="text-sm font-bold text-[#0f172a] mb-1">Žiadne regály</h3>
              <p className="text-xs text-[#475569] max-w-sm">
                Pridaj prvý regál tlačidlom hore. Kapacita sa použije v pláne sadenia.
              </p>
            </div>
          ) : (
            shelves.map(shelf => {
              const totalPositions = (shelf.shelves || 0) * (shelf.positions_per_shelf || 0);
              const isToggling = togglingIds.has(shelf.id);
              const isDark = shelf.zone === 'dark';
              return (
                <div
                  key={shelf.id}
                  className={cn(
                    'px-4 py-3 flex items-start gap-3 transition-colors',
                    !shelf.is_active && 'bg-[#fafafa] opacity-70'
                  )}
                >
                  {/* Zone ikona */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border',
                      isDark
                        ? 'bg-[#eff6ff] border-[#bfdbfe]'
                        : 'bg-[#f0fdf4] border-[#bbf7d0]'
                    )}
                  >
                    {isDark ? (
                      <Moon className="h-4 w-4 text-[#2563eb]" />
                    ) : (
                      <Sun className="h-4 w-4 text-[#16a34a]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#0f172a]">{shelf.name}</span>
                      <span
                        className={cn(
                          'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold',
                          isDark
                            ? 'bg-[#eff6ff] text-[#2563eb]'
                            : 'bg-[#f0fdf4] text-[#16a34a]'
                        )}
                      >
                        {isDark ? 'Klíčenie' : 'Svetlo'}
                      </span>
                      {!shelf.is_active && (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold bg-[#f1f5f9] text-[#94a3b8]">
                          NEAKTÍVNY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#475569] mt-0.5">
                      <span className="font-semibold text-[#0f172a]">{shelf.shelves}</span> políc × <span className="font-semibold text-[#0f172a]">{shelf.positions_per_shelf}</span> pozícií = <span className="font-bold text-[#16a34a]">{totalPositions} pozícií</span>
                    </p>
                    {shelf.notes && (
                      <div className="flex items-start gap-1 mt-1">
                        <StickyNote className="h-3 w-3 text-[#94a3b8] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[#475569] leading-snug">{shelf.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-3">
                    {/* Active toggle (skutočný posuvný prepínač) */}
                    <button
                      onClick={() => handleToggleActive(shelf)}
                      disabled={isToggling}
                      title={shelf.is_active ? 'Vypnúť (nezapočíta sa do kapacity)' : 'Zapnúť'}
                      className={cn(
                        'relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer border-2 flex-shrink-0 disabled:opacity-50',
                        shelf.is_active
                          ? 'bg-[#16a34a] border-[#16a34a]'
                          : 'bg-[#e2e8f0] border-[#e2e8f0]'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
                          shelf.is_active ? 'translate-x-5' : 'translate-x-0.5'
                        )}
                      />
                      {isToggling && (
                        <Loader2 className="absolute inset-0 m-auto h-2.5 w-2.5 animate-spin text-white" />
                      )}
                    </button>

                    {/* Edit + Delete (zoskupené v gap-2 v rámci gap-3 wrappera) */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditDialog(shelf)}
                        title="Upraviť"
                        className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(shelf)}
                        title="Zmazať"
                        className="w-7 h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===================== ADD / EDIT DIALOG ===================== */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a] flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#16a34a]" />
              {editingShelf ? 'Upraviť regál' : 'Pridať nový regál'}
            </DialogTitle>
            <DialogDescription className="text-[#475569]">
              {editingShelf
                ? `Uprav nastavenia regálu ${editingShelf.name}.`
                : 'Vyplň údaje o novom regáli. Kapacita sa použije v pláne sadenia.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave}>
            <div className="space-y-3">
              {/* Názov */}
              <div>
                <Label htmlFor="shelf-name" className="text-xs font-semibold text-[#475569]">
                  Názov *
                </Label>
                <Input
                  id="shelf-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="napr. Regál E"
                  required
                  maxLength={50}
                  className="text-sm h-9 mt-1.5 border-[#e2e8f0]"
                />
              </div>

              {/* Zóna */}
              <div>
                <Label className="text-xs font-semibold text-[#475569]">Zóna *</Label>
                <Select
                  value={formData.zone}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, zone: v as 'dark' | 'light' }))}
                >
                  <SelectTrigger className="h-9 text-sm mt-1.5 border-[#e2e8f0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-3.5 w-3.5 text-[#2563eb]" />
                        <span>Klíčenie</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-3.5 w-3.5 text-[#16a34a]" />
                        <span>Svetlo</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Polica + Pozícií grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="shelves-count" className="text-xs font-semibold text-[#475569]">
                    Počet políc *
                  </Label>
                  <Input
                    id="shelves-count"
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={formData.shelves}
                    onChange={(e) => setFormData(prev => ({ ...prev, shelves: parseInt(e.target.value) || 1 }))}
                    required
                    className="text-sm h-9 mt-1.5 border-[#e2e8f0]"
                  />
                </div>
                <div>
                  <Label htmlFor="positions-count" className="text-xs font-semibold text-[#475569]">
                    Pozícií na policu *
                  </Label>
                  <Input
                    id="positions-count"
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    value={formData.positions_per_shelf}
                    onChange={(e) => setFormData(prev => ({ ...prev, positions_per_shelf: parseInt(e.target.value) || 1 }))}
                    required
                    className="text-sm h-9 mt-1.5 border-[#e2e8f0]"
                  />
                </div>
              </div>

              {/* Preview celkových pozícií */}
              <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5 flex items-center justify-between">
                <span className="text-xs text-[#475569]">Celkom pozícií:</span>
                <span className="text-sm font-bold text-[#16a34a]">
                  {formData.shelves * formData.positions_per_shelf} pozícií
                </span>
              </div>

              {/* Poznámka */}
              <div>
                <Label htmlFor="shelf-notes" className="text-xs font-semibold text-[#475569]">
                  Poznámka <span className="text-[#94a3b8] font-normal">(voliteľné)</span>
                </Label>
                <Textarea
                  id="shelf-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="napr. Klíčenie + záloha svetlo"
                  rows={2}
                  maxLength={200}
                  className="resize-none text-sm mt-1.5 border-[#e2e8f0]"
                />
              </div>

              {/* Aktívny — native checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-[#0f172a]">Aktívny</span>
                <span className="text-xs text-[#475569]">(započítava sa do kapacity)</span>
              </label>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingShelf ? 'Uložiť' : 'Pridať'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================== DELETE CONFIRM ===================== */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Zmazať regál {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Kapacita plánovania sadenia sa zmení. Táto akcia je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Mažem...
                </>
              ) : (
                'Zmazať'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ShelfConfigSettings;
