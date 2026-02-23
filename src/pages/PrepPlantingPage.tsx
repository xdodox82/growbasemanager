import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sprout, Box, Calendar, Check, Loader2 } from 'lucide-react';
import { format, startOfDay, getWeek, getYear, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { usePlantingPlans, useCrops } from '@/hooks/useSupabaseData';

const TRAY_SIZE_LABELS: Record<string, string> = {
  'S': 'Malá (S)',
  'M': 'Stredná (M)',
  'L': 'Veľká (L)',
  'XL': 'Extra veľká (XL)',
};

const SUBSTRATE_TYPE_LABELS: Record<string, string> = {
  'peat': 'Rašelina',
  'coco': 'Kokos',
  'mixed': 'Miešaný (Rašelina/Kokos)',
  'other': 'Iný',
};

export default function PrepPlantingPage() {
  const { data: plantingPlans, update: updatePlan } = usePlantingPlans();
  const { data: crops } = useCrops();
  const { toast } = useToast();

  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [substrateFilter, setSubstrateFilter] = useState<string>('all');
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

  const getCropName = (cropId: string | null) => {
    if (!cropId) return '-';
    const crop = crops.find(c => c.id === cropId);
    return crop?.name || '-';
  };

  const availableWeeks = useMemo(() => {
    const weeksMap = new Map<string, { start: Date; end: Date }>();
    plantingPlans.forEach(plan => {
      if (plan.sow_date && (plan.status === 'planned' || plan.status === 'ready_to_sow') && !plan.is_test_batch) {
        const date = new Date(plan.sow_date);
        const weekNum = getWeek(date, { weekStartsOn: 1, locale: sk });
        const year = getYear(date);
        const key = `${year}-W${weekNum.toString().padStart(2, '0')}`;
        if (!weeksMap.has(key)) {
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
          weeksMap.set(key, { start: weekStart, end: weekEnd });
        }
      }
    });
    return Array.from(weeksMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([key, range]) => ({
        key,
        weekNum: parseInt(key.split('-W')[1]),
        dateRange: `${format(range.start, 'd.M.')} - ${format(range.end, 'd.M.')}`
      }));
  }, [plantingPlans]);

  const plannedPlans = useMemo(() => {
    let filtered = plantingPlans.filter(plan => plan.status === 'planned' && !plan.is_test_batch);

    if (weekFilter !== 'all') {
      const [weekYear, weekNum] = weekFilter.split('-W');
      const year = parseInt(weekYear);
      const week = parseInt(weekNum);

      filtered = filtered.filter(plan => {
        const sowDate = new Date(plan.sow_date);
        const planWeek = getWeek(sowDate, { weekStartsOn: 1, locale: sk });
        const planYear = getYear(sowDate);
        return planYear === year && planWeek === week;
      });
    }

    if (cropFilter !== 'all') {
      filtered = filtered.filter(plan => {
        if (plan.is_combined && plan.crop_components) {
          return plan.crop_components.some((comp: any) => comp?.crop_id === cropFilter);
        }
        return plan.crop_id === cropFilter;
      });
    }

    if (substrateFilter !== 'all') {
      filtered = filtered.filter(plan => {
        const substrateType = (plan as any).substrate_type || 'mixed';
        return substrateType === substrateFilter;
      });
    }

    return filtered.sort((a, b) => new Date(a.sow_date).getTime() - new Date(b.sow_date).getTime());
  }, [plantingPlans, weekFilter, cropFilter, substrateFilter]);

  const markAsReady = async (planId: string) => {
    setSavingPlanId(planId);
    const { error } = await updatePlan(planId, { status: 'ready_to_sow' });

    if (!error) {
      toast({
        title: 'Tácka pripravená',
        description: 'Tácka bola označená ako pripravená na siatie.',
      });
    } else {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    }

    setSavingPlanId(null);
  };

  const getSubstrateDisplay = (plan: any) => {
    const substrateType = (plan as any).substrate_type || 'mixed';
    const substrateNote = (plan as any).substrate_note;
    const label = SUBSTRATE_TYPE_LABELS[substrateType] || 'Miešaný';

    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm">{label}</span>
        {substrateNote && (
          <span className="text-xs text-muted-foreground italic">{substrateNote}</span>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Príprava na sadenie"
          description="Pripravte tácky so substrátom podľa zvoleného obdobia"
          icon={<Box className="h-6 w-6" />}
        />

        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select value={weekFilter} onValueChange={setWeekFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vybrať týždeň" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetky týždne</SelectItem>
                    {availableWeeks.map(w => (
                      <SelectItem key={w.key} value={w.key}>
                        Týždeň {w.weekNum} ({w.dateRange})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select value={cropFilter} onValueChange={setCropFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Plodina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetky plodiny</SelectItem>
                    {crops.map(crop => (
                      <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={substrateFilter} onValueChange={setSubstrateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Typ substrátu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetky substráty</SelectItem>
                    <SelectItem value="peat">Rašelina</SelectItem>
                    <SelectItem value="coco">Kokos</SelectItem>
                    <SelectItem value="mixed">Miešaný (Rašelina/Kokos)</SelectItem>
                    <SelectItem value="other">Iný</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {plannedPlans.length === 0 ? (
          <EmptyState
            icon={<Sprout className="h-12 w-12" />}
            title="Žiadne plánované siatby"
            description="V zvolenom období nie sú naplánované žiadne siatby."
          />
        ) : (
          <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dátum siania</TableHead>
                <TableHead>Plodina</TableHead>
                <TableHead>Substrát</TableHead>
                <TableHead>Veľkosť tácky</TableHead>
                <TableHead className="text-right">Počet tácok</TableHead>
                <TableHead>Poznámka</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plannedPlans.map((plan) => {
                const isCombined = plan.is_combined;
                const isSaving = savingPlanId === plan.id;

                return (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(plan.sow_date), 'd. MMM yyyy', { locale: sk })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isCombined ? (
                        <Badge variant="outline">Mix</Badge>
                      ) : (
                        <span className="font-medium">{getCropName(plan.crop_id)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getSubstrateDisplay(plan)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {TRAY_SIZE_LABELS[plan.tray_size || 'XL'] || plan.tray_size}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-lg">{plan.tray_count || 1}</span>
                    </TableCell>
                    <TableCell>
                      {plan.notes ? (
                        <span className="text-sm text-muted-foreground">{plan.notes}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => markAsReady(plan.id)}
                        disabled={isSaving}
                        className="w-full"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Hotovo
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

            <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Inštrukcie:</strong> Zoznam ukazuje plánované siatby v zvolenom období. Pripravte tácky so substrátom podľa počtu, veľkosti a typu substrátu. Po dokončení prípravy kliknite na tlačidlo "Hotovo".
              </p>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
