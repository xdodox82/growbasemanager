import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlantingPlans, useCrops } from '@/hooks/useSupabaseData';
import { BarChart3, Sprout, TrendingUp } from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval, addWeeks, format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface CropYield {
  cropId: string;
  cropName: string;
  color: string;
  trayCount: number;
  expectedYield: number;
}

export function PlantingStats() {
  const { data: plantingPlans } = usePlantingPlans();
  const { data: crops } = useCrops();

  // Weekly tray statistics
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const nextWeekStart = addWeeks(thisWeekStart, 1);
    const nextWeekEnd = addWeeks(thisWeekEnd, 1);

    const thisWeekPlans = plantingPlans.filter(plan => {
      const sowDate = new Date(plan.sow_date);
      return isWithinInterval(sowDate, { start: thisWeekStart, end: thisWeekEnd });
    });

    const nextWeekPlans = plantingPlans.filter(plan => {
      const sowDate = new Date(plan.sow_date);
      return isWithinInterval(sowDate, { start: nextWeekStart, end: nextWeekEnd });
    });

    const thisWeekTrays = thisWeekPlans.reduce((sum, p) => sum + (p.tray_count || 1), 0);
    const nextWeekTrays = nextWeekPlans.reduce((sum, p) => sum + (p.tray_count || 1), 0);

    return {
      thisWeek: {
        trays: thisWeekTrays,
        plans: thisWeekPlans.length,
        dateRange: `${format(thisWeekStart, 'd.M.', { locale: sk })} - ${format(thisWeekEnd, 'd.M.', { locale: sk })}`,
      },
      nextWeek: {
        trays: nextWeekTrays,
        plans: nextWeekPlans.length,
        dateRange: `${format(nextWeekStart, 'd.M.', { locale: sk })} - ${format(nextWeekEnd, 'd.M.', { locale: sk })}`,
      },
    };
  }, [plantingPlans]);

  // Expected yield by crop (from active/growing plans)
  const yieldByCrop = useMemo(() => {
    const activePlans = plantingPlans.filter(p => 
      p.status !== 'harvested' && p.status !== 'cancelled'
    );

    const yieldMap = new Map<string, CropYield>();

    activePlans.forEach(plan => {
      if (plan.is_combined && plan.crop_components && Array.isArray(plan.crop_components)) {
        // Combined planting - calculate proportional yield
        plan.crop_components.forEach((component: { crop_id: string; percentage: number }) => {
          const crop = crops.find(c => c.id === component.crop_id);
          if (!crop) return;

          const proportionalTrays = (plan.tray_count || 1) * (component.percentage / 100);
          const proportionalYield = (crop.expected_yield || 0) * proportionalTrays;

          const existing = yieldMap.get(component.crop_id);
          if (existing) {
            existing.trayCount += proportionalTrays;
            existing.expectedYield += proportionalYield;
          } else {
            yieldMap.set(component.crop_id, {
              cropId: component.crop_id,
              cropName: crop.name,
              color: crop.color || '#22c55e',
              trayCount: proportionalTrays,
              expectedYield: proportionalYield,
            });
          }
        });
      } else if (plan.crop_id) {
        // Single crop planting
        const crop = crops.find(c => c.id === plan.crop_id);
        if (!crop) return;

        const trayCount = plan.tray_count || 1;
        const expectedYield = (crop.expected_yield || 0) * trayCount;

        const existing = yieldMap.get(plan.crop_id);
        if (existing) {
          existing.trayCount += trayCount;
          existing.expectedYield += expectedYield;
        } else {
          yieldMap.set(plan.crop_id, {
            cropId: plan.crop_id,
            cropName: crop.name,
            color: crop.color || '#22c55e',
            trayCount: trayCount,
            expectedYield: expectedYield,
          });
        }
      }
    });

    return Array.from(yieldMap.values())
      .sort((a, b) => b.expectedYield - a.expectedYield);
  }, [plantingPlans, crops]);

  const totalExpectedYield = yieldByCrop.reduce((sum, c) => sum + c.expectedYield, 0);
  const maxYield = Math.max(...yieldByCrop.map(c => c.expectedYield), 1);

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Štatistiky výsevov</h2>
          <p className="text-sm text-muted-foreground">
            Prehľad tácok a očakávanej úrody
          </p>
        </div>
      </div>

      {/* Weekly Tray Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg bg-secondary/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sprout className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">Tento týždeň</span>
          </div>
          <p className="text-2xl font-bold">{weeklyStats.thisWeek.trays}</p>
          <p className="text-xs text-muted-foreground">
            tácok • {weeklyStats.thisWeek.dateRange}
          </p>
        </div>

        <div className="rounded-lg bg-secondary/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-info" />
            <span className="text-xs text-muted-foreground">Budúci týždeň</span>
          </div>
          <p className="text-2xl font-bold">{weeklyStats.nextWeek.trays}</p>
          <p className="text-xs text-muted-foreground">
            tácok • {weeklyStats.nextWeek.dateRange}
          </p>
        </div>
      </div>

      {/* Expected Yield by Crop */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Plánovaná úroda podľa plodín</h3>
          <Badge variant="secondary" className="text-xs">
            {totalExpectedYield.toFixed(0)}g celkom
          </Badge>
        </div>

        {yieldByCrop.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Žiadne aktívne výsevy
          </div>
        ) : (
          <div className="space-y-3">
            {yieldByCrop.slice(0, 6).map((crop) => (
              <div key={crop.cropId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: crop.color }}
                    />
                    <span className="font-medium">{crop.cropName}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {crop.expectedYield.toFixed(0)}g
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${(crop.expectedYield / maxYield) * 100}%`,
                      backgroundColor: crop.color 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {crop.trayCount.toFixed(1)} tácok
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
