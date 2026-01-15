import { useMemo } from 'react';
import { usePlantingPlans, useCrops } from '@/hooks/useSupabaseData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sprout, Calendar } from 'lucide-react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { sk } from 'date-fns/locale';

export const ProductionOverview = () => {
  const { data: plantingPlans } = usePlantingPlans();
  const { data: crops } = useCrops();
  const today = startOfDay(new Date());

  // Active growing trays
  const activeGrowing = useMemo(() => {
    return plantingPlans
      .filter(plan => plan.status !== 'harvested')
      .map(plan => {
        const crop = crops.find(c => c.id === plan.crop_id);
        const sowDate = startOfDay(new Date(plan.sow_date));
        const harvestDate = plan.expected_harvest_date 
          ? startOfDay(new Date(plan.expected_harvest_date))
          : startOfDay(new Date(plan.sow_date));
        const totalDays = differenceInDays(harvestDate, sowDate) || 1;
        const daysPassed = differenceInDays(today, sowDate);
        const progress = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);
        const daysRemaining = differenceInDays(harvestDate, today);

        return {
          ...plan,
          cropName: crop?.name || 'Neznáma plodina',
          cropColor: crop?.color || '#22c55e',
          progress,
          daysRemaining,
          totalDays,
          trays: plan.tray_count || 1,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [plantingPlans, crops, today]);

  // Summary stats
  const totalTrays = activeGrowing.reduce((sum, p) => sum + p.trays, 0);
  const readyToHarvest = activeGrowing.filter(p => p.daysRemaining <= 0).length;
  const harvestingSoon = activeGrowing.filter(p => p.daysRemaining > 0 && p.daysRemaining <= 2).length;

  const getStatusBadge = (daysRemaining: number) => {
    if (daysRemaining <= 0) {
      return <Badge variant="destructive" className="text-xs">Zbierať!</Badge>;
    } else if (daysRemaining <= 2) {
      return <Badge variant="default" className="text-xs bg-warning text-warning-foreground">O {daysRemaining} dni</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{daysRemaining} dní</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Prehľad produkcie</h2>
            <p className="text-sm text-muted-foreground">
              {totalTrays} tácov v produkcii
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {readyToHarvest > 0 && (
            <Badge variant="destructive">{readyToHarvest} na zber</Badge>
          )}
          {harvestingSoon > 0 && (
            <Badge variant="default" className="bg-warning text-warning-foreground">{harvestingSoon} čoskoro</Badge>
          )}
        </div>
      </div>

      {activeGrowing.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Žiadna aktívna produkcia. Naplánujte výsev v sekcii Výsadba.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[350px] overflow-y-auto">
          {activeGrowing.slice(0, 10).map((plan) => (
            <div
              key={plan.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-4 transition-all hover:bg-secondary/50"
            >
              <div 
                className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${plan.cropColor}20` }}
              >
                <Sprout className="h-5 w-5" style={{ color: plan.cropColor }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">{plan.cropName}</p>
                  {getStatusBadge(plan.daysRemaining)}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span>{plan.trays} {plan.trays === 1 ? 'tác' : plan.trays < 5 ? 'tácy' : 'tácov'}</span>
                  <span>•</span>
                  <span>Zber: {plan.expected_harvest_date ? format(new Date(plan.expected_harvest_date), 'd.M.yyyy', { locale: sk }) : 'Neurčený'}</span>
                </div>
                <Progress value={plan.progress} className="h-2" />
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold" style={{ color: plan.cropColor }}>
                  {Math.round(plan.progress)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan.daysRemaining <= 0 ? 'Hotovo' : `${plan.daysRemaining}/${plan.totalDays} dní`}
                </p>
              </div>
            </div>
          ))}
          
          {activeGrowing.length > 10 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              + {activeGrowing.length - 10} ďalších
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
