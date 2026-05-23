import { useState, useEffect, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Box,
  Sprout,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Layers,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===================== TYPES =====================

interface PrepPlan {
  id: string;
  crop_id: string;
  sow_date: string;
  tray_size: string;
  tray_count: number;
  seed_amount_grams: number | null;
  status: string;
  crops?: {
    id: string;
    name: string;
    color: string | null;
    default_substrate_type: string | null;
  } | null;
}

// ===================== HELPERS =====================

const SK_DAYS_SHORT = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const SK_MONTHS_GEN = [
  'januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
  'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra',
];

const getMonday = (d: Date): Date => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const formatWeekRange = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  if (sameMonth && sameYear) {
    return `${monday.getDate()}. – ${sunday.getDate()}. ${SK_MONTHS_GEN[monday.getMonth()]} ${monday.getFullYear()}`;
  }
  if (sameYear) {
    return `${monday.getDate()}. ${SK_MONTHS_GEN[monday.getMonth()]} – ${sunday.getDate()}. ${SK_MONTHS_GEN[sunday.getMonth()]} ${monday.getFullYear()}`;
  }
  return `${monday.getDate()}. ${SK_MONTHS_GEN[monday.getMonth()]} ${monday.getFullYear()} – ${sunday.getDate()}. ${SK_MONTHS_GEN[sunday.getMonth()]} ${sunday.getFullYear()}`;
};

const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Slovenské skloňovanie pre "tácka"
const trayWord = (count: number): string => {
  if (count === 1) return 'tácka';
  if (count >= 2 && count <= 4) return 'tácky';
  return 'tácok';
};

// Slovenské skloňovanie pre "výsev"
const sowingWord = (count: number): string => {
  if (count === 1) return 'výsev';
  if (count >= 2 && count <= 4) return 'výsevy';
  return 'výsevov';
};

// Zoradenie tray sizes: XL > L > M > S
const TRAY_SIZE_ORDER: Record<string, number> = { 'XL': 0, 'L': 1, 'M': 2, 'S': 3 };
const traySizeRank = (size: string): number =>
  TRAY_SIZE_ORDER[size] != null ? TRAY_SIZE_ORDER[size] : 99;

// Substrátové konfigurácie - label + badge štýly
type SubstrateKey = 'peat' | 'coco' | 'mixed' | 'unknown';

const SUBSTRATE_CFG: Record<SubstrateKey, { label: string; bg: string; fg: string; border: string; icon: any }> = {
  peat:    { label: 'Rašelina',       bg: '#dcfce7', fg: '#166534', border: '#bbf7d0', icon: Leaf },
  coco:    { label: 'Kokos',           bg: '#dbeafe', fg: '#1e40af', border: '#bfdbfe', icon: Sprout },
  mixed:   { label: 'Rašelina/Kokos',  bg: '#fef3c7', fg: '#92400e', border: '#fde68a', icon: Layers },
  unknown: { label: 'Zmiešaný',        bg: '#f1f5f9', fg: '#475569', border: '#e2e8f0', icon: Layers },
};

const normalizeSubstrate = (raw: string | null | undefined): SubstrateKey => {
  if (!raw) return 'unknown';
  const t = raw.toLowerCase().trim();
  if (t === 'peat' || t === 'rašelina' || t === 'raselina') return 'peat';
  if (t === 'coco' || t === 'kokos') return 'coco';
  if (t === 'mixed' || t === 'zmiesany' || t === 'zmiešaný') return 'mixed';
  return 'unknown';
};

// ===================== MAIN COMPONENT =====================

const PrepPlantingPage = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PrepPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  // Today - jednoduchá konštanta (stránka nepotrebuje polnočný refresh).
  const todayStr = useMemo(() => toIsoDate(new Date()), []);

  // Aktuálne zobrazený týždeň
  const monday = useMemo(() => {
    const m = getMonday(new Date());
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return toIsoDate(d);
    });
  }, [monday]);

  // ===================== FETCH =====================

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      // Fetchujeme dosť široký rozsah - aby week navigation mohla zobraziť
      // aj predchádzajúce/nasledujúce týždne bez opätovného fetchu.
      const start = new Date(monday);
      start.setDate(start.getDate() - 7);
      const end = new Date(monday);
      end.setDate(end.getDate() + 14);

      const { data, error } = await supabase
        .from('planting_plans')
        .select(`
          id, crop_id, sow_date, tray_size, tray_count, seed_amount_grams, status,
          crops:crop_id ( id, name, color, default_substrate_type )
        `)
        .eq('status', 'planned')
        .gte('sow_date', toIsoDate(start))
        .lte('sow_date', toIsoDate(end))
        .order('sow_date', { ascending: true });

      if (error) throw error;
      setPlans((data || []) as unknown as PrepPlan[]);
    } catch (error: any) {
      console.error('[PrepPlanting] fetch error:', error);
      toast({
        title: 'Chyba',
        description: error?.message || 'Nepodarilo sa načítať plány.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [monday, toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // ===================== DERIVED =====================

  // Filter plánov len pre aktuálne zobrazený týždeň
  const weekPlans = useMemo(() => {
    const mondayStr = weekDays[0];
    const sundayStr = weekDays[6];
    return plans.filter(p => p.sow_date >= mondayStr && p.sow_date <= sundayStr);
  }, [plans, weekDays]);

  // Skupiny po dňoch
  const plansByDay = useMemo(() => {
    const acc: Record<string, PrepPlan[]> = {};
    weekDays.forEach(d => { acc[d] = []; });
    weekPlans.forEach(p => {
      if (acc[p.sow_date]) acc[p.sow_date].push(p);
    });
    return acc;
  }, [weekPlans, weekDays]);

  // Sumár — tácky podľa veľkosti
  const traysBySize = useMemo(() => {
    const counts: Record<string, number> = {};
    weekPlans.forEach(p => {
      counts[p.tray_size] = (counts[p.tray_size] || 0) + (p.tray_count || 0);
    });
    // Zoradenie XL → L → M → S
    const order = ['XL', 'L', 'M', 'S'];
    return order
      .filter(s => counts[s] > 0)
      .map(s => ({ size: s, count: counts[s] }));
  }, [weekPlans]);

  // Sumár — tácky podľa substrátu
  const traysBySubstrate = useMemo(() => {
    const counts: Record<SubstrateKey, number> = { peat: 0, coco: 0, mixed: 0, unknown: 0 };
    weekPlans.forEach(p => {
      const key = normalizeSubstrate(p.crops?.default_substrate_type);
      counts[key] += (p.tray_count || 0);
    });
    return counts;
  }, [weekPlans]);

  const totalTrays = weekPlans.reduce((s, p) => s + (p.tray_count || 0), 0);
  const daysWithPlans = weekDays.filter(d => plansByDay[d].length > 0);

  // Pre každý deň: zoskupené riadky (plodina + tray_size + substrát) + denný súhrn.
  // Ak existujú 2 plány s rovnakou kombináciou (zriedkavo), zlúčia sa do jedného riadka so súčtom count.
  // Riadky sú zoradené: tray_size DESC (XL → L → M → S), potom meno plodiny ASC.
  type DayRow = {
    key: string;
    cropName: string;
    cropColor: string;
    traySize: string;
    substrateKey: SubstrateKey;
    count: number;
  };
  type DailyData = {
    rows: DayRow[];
    totalTrays: number;
    bySize: Record<string, number>;
    bySubstrate: Record<SubstrateKey, number>;
  };
  const dailyData = useMemo<Record<string, DailyData>>(() => {
    const acc: Record<string, DailyData> = {};
    daysWithPlans.forEach(dayStr => {
      const dayPlans = plansByDay[dayStr];
      const grouped = new Map<string, DayRow>();
      const bySize: Record<string, number> = {};
      const bySubstrate: Record<SubstrateKey, number> = { peat: 0, coco: 0, mixed: 0, unknown: 0 };
      let totalT = 0;

      dayPlans.forEach(p => {
        const substrateKey = normalizeSubstrate(p.crops?.default_substrate_type);
        const cropName = p.crops?.name || 'Neznáma plodina';
        const cropColor = p.crops?.color || '#16a34a';
        const key = `${p.crop_id}_${p.tray_size}_${substrateKey}`;
        const count = p.tray_count || 0;

        if (grouped.has(key)) {
          grouped.get(key)!.count += count;
        } else {
          grouped.set(key, { key, cropName, cropColor, traySize: p.tray_size, substrateKey, count });
        }
        bySize[p.tray_size] = (bySize[p.tray_size] || 0) + count;
        bySubstrate[substrateKey] += count;
        totalT += count;
      });

      const rows = Array.from(grouped.values()).sort((a, b) => {
        const sizeDiff = traySizeRank(a.traySize) - traySizeRank(b.traySize);
        if (sizeDiff !== 0) return sizeDiff;
        return a.cropName.localeCompare(b.cropName, 'sk');
      });

      acc[dayStr] = { rows, totalTrays: totalT, bySize, bySubstrate };
    });
    return acc;
  }, [daysWithPlans, plansByDay]);

  // ===================== RENDER =====================

  return (
    <MainLayout hideMobileHeader>
      <div className="min-h-screen pb-20 md:pb-6 space-y-3 md:space-y-4">

        {/* ===== HEADER ===== */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
            <Box className="h-5 w-5 text-[#16a34a]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-[#0f172a]">Príprava na sadenie</h1>
            <p className="text-xs md:text-sm text-[#475569]">Pripravte tácky so substrátom</p>
          </div>
        </div>

        {/* ===== WEEK NAVIGATION ===== */}
        <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm px-3 py-2 flex items-center justify-between gap-2">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="h-9 px-3 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Predchádzajúci</span>
          </button>
          <div className="flex flex-col items-center min-w-0 flex-1">
            <span className="text-sm font-bold text-[#0f172a] text-center truncate">
              {formatWeekRange(monday)}
            </span>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-[11px] text-[#16a34a] hover:underline font-semibold"
              >
                Späť na tento týždeň
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="h-9 px-3 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="hidden sm:inline">Nasledujúci</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ===== WEEK SUMMARY ===== */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-7 w-20" />
            </div>
          </div>
        ) : weekPlans.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-2">
              <CalendarDays className="h-6 w-6 text-[#94a3b8]" />
            </div>
            <p className="text-sm font-bold text-[#0f172a] mb-1">
              Tento týždeň nie sú naplánované žiadne výsevy
            </p>
            <p className="text-xs text-[#475569]">Skús iný týždeň cez navigáciu vyššie.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#f0fdf4] border-b border-[#bbf7d0]">
              <p className="text-xs font-bold text-[#0f172a]">
                Tento týždeň: <span className="text-[#16a34a]">{totalTrays}</span> {trayWord(totalTrays)} v <span className="text-[#16a34a]">{weekPlans.length}</span> {sowingWord(weekPlans.length)}
              </p>
            </div>
            <div className="px-4 py-3 space-y-3">
              {/* Tácky podľa veľkosti */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-1.5">Podľa veľkosti tácky</p>
                <div className="flex flex-wrap gap-1.5">
                  {traysBySize.map(({ size, count }) => (
                    <span
                      key={size}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-xs"
                    >
                      <span className="font-bold text-[#0f172a]">{count} × {size}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Tácky podľa substrátu */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-1.5">Podľa substrátu</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['peat', 'coco', 'mixed', 'unknown'] as SubstrateKey[]).map(key => {
                    const count = traysBySubstrate[key];
                    if (count === 0) return null;
                    const cfg = SUBSTRATE_CFG[key];
                    const Icon = cfg.icon;
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs border"
                        style={{ backgroundColor: cfg.bg, color: cfg.fg, borderColor: cfg.border }}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="font-bold">{cfg.label}: {count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== DAILY SECTIONS ===== */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : daysWithPlans.length === 0 ? null : (
          <div className="space-y-3 md:space-y-4">
            {daysWithPlans.map(dayStr => {
              const date = new Date(dayStr);
              const isToday = dayStr === todayStr;
              const dayName = SK_DAYS_SHORT[date.getDay()];
              const monthName = SK_MONTHS_GEN[date.getMonth()];
              const day = dailyData[dayStr];
              if (!day) return null;

              // Súhrn texty pre footer (zoradené XL → S)
              const sizeChips = (['XL', 'L', 'M', 'S'] as const)
                .filter(s => (day.bySize[s] || 0) > 0)
                .map(s => `${day.bySize[s]} × ${s}`)
                .join(' · ');
              const substrateChips = (['peat', 'coco', 'mixed', 'unknown'] as SubstrateKey[])
                .filter(k => day.bySubstrate[k] > 0)
                .map(k => `${SUBSTRATE_CFG[k].label}: ${day.bySubstrate[k]}`)
                .join(' · ');

              return (
                <div
                  key={dayStr}
                  className={cn(
                    'bg-white rounded-xl border shadow-sm overflow-hidden',
                    isToday ? 'border-[#bbf7d0] ring-1 ring-[#bbf7d0]' : 'border-[#cbd5e1]'
                  )}
                >
                  {/* Hlavička dňa */}
                  <div
                    className={cn(
                      'px-4 py-3 flex items-center justify-between gap-2 border-b',
                      isToday
                        ? 'bg-[#f0fdf4] border-[#bbf7d0]'
                        : 'bg-[#f8fafc] border-[#e2e8f0]'
                    )}
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className={cn(
                        'text-xs font-bold uppercase tracking-wide',
                        isToday ? 'text-[#16a34a]' : 'text-[#475569]'
                      )}>
                        {dayName}
                      </span>
                      <span className={cn(
                        'text-base md:text-lg font-bold',
                        isToday ? 'text-[#16a34a]' : 'text-[#0f172a]'
                      )}>
                        {date.getDate()}. {monthName}
                      </span>
                      {isToday && (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#16a34a] text-white text-[10px] font-bold">
                          DNES
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      'text-xs font-bold whitespace-nowrap flex-shrink-0',
                      isToday ? 'text-[#16a34a]' : 'text-[#475569]'
                    )}>
                      {day.totalTrays} {trayWord(day.totalTrays)}
                    </span>
                  </div>

                  {/* Desktop / tablet: tabuľka */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Plodina</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide w-24">Veľkosť</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide w-44">Substrát</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide w-20">Počet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        {day.rows.map(row => {
                          const sub = SUBSTRATE_CFG[row.substrateKey];
                          const SubIcon = sub.icon;
                          return (
                            <tr key={row.key} className="hover:bg-[#f8fafc] transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.cropColor }} />
                                  <span className="font-semibold text-[#0f172a]">{row.cropName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center h-6 px-2 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-xs font-bold text-[#0f172a]">
                                  {row.traySize}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-bold border"
                                  style={{ backgroundColor: sub.bg, color: sub.fg, borderColor: sub.border }}
                                >
                                  <SubIcon className="h-3 w-3" />
                                  {sub.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-[#16a34a]">
                                {row.count}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobil: karty */}
                  <div className="md:hidden divide-y divide-[#e2e8f0]">
                    {day.rows.map(row => {
                      const sub = SUBSTRATE_CFG[row.substrateKey];
                      const SubIcon = sub.icon;
                      return (
                        <div key={row.key} className="px-3 py-2.5 flex items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.cropColor }} />
                              <span className="text-sm font-bold text-[#0f172a] truncate">{row.cropName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-[11px] font-bold text-[#0f172a]">
                                {row.traySize}
                              </span>
                              <span
                                className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-bold border"
                                style={{ backgroundColor: sub.bg, color: sub.fg, borderColor: sub.border }}
                              >
                                <SubIcon className="h-2.5 w-2.5" />
                                {sub.label}
                              </span>
                            </div>
                          </div>
                          <span className="text-base font-bold text-[#16a34a] flex-shrink-0 mt-0.5">
                            {row.count}×
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Denný footer súhrn */}
                  <div className="px-4 py-2 bg-[#f8fafc] border-t border-[#e2e8f0]">
                    <p className="text-[11px] text-[#475569]">
                      <span className="font-semibold text-[#0f172a]">Spolu:</span>{' '}
                      {sizeChips}
                      {substrateChips && (
                        <>
                          {' — '}
                          {substrateChips}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default PrepPlantingPage;
