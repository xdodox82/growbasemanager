import { useSeeds, usePackagings, useLabels, useCrops } from '@/hooks/useSupabaseData';
import { 
  getMinSeedQuantity, 
  getMinPackagingQuantity, 
  getMinLabelQuantity 
} from '@/hooks/useInventoryConsumption';
import { AlertTriangle, Package, Leaf, Box, Tag } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

interface LowStockItem {
  id: string;
  name: string;
  type: 'seed' | 'packaging' | 'label' | 'substrate';
  currentStock: number;
  minStock: number;
  unit: string;
  link: string;
  urgency: 'critical' | 'warning' | 'low';
}

export const LowStockAlerts = () => {
  const { data: seeds } = useSeeds();
  const { data: packagings } = usePackagings();
  const { data: labels } = useLabels();
  const { data: crops } = useCrops();

  const lowStockItems: LowStockItem[] = [];

  // Check seeds - use custom min_stock if set, otherwise use dynamic minimums based on crop type
  seeds.forEach(seed => {
    const crop = crops.find(c => c.id === seed.crop_id);
    const cropName = crop?.name || '';
    const customMinStock = (seed as any).min_stock;
    
    // Use custom min_stock if set, otherwise calculate default
    let minQuantity: number;
    if (customMinStock !== null && customMinStock !== undefined) {
      // Custom min_stock is in the same unit as the seed
      minQuantity = seed.unit === 'kg' ? customMinStock * 1000 : customMinStock;
    } else {
      minQuantity = getMinSeedQuantity(cropName);
    }
    
    // Convert to grams for comparison
    const quantityInGrams = seed.unit === 'kg' ? seed.quantity * 1000 : seed.quantity;
    
    if (quantityInGrams < minQuantity) {
      const percentage = (quantityInGrams / minQuantity) * 100;
      let urgency: 'critical' | 'warning' | 'low' = 'low';
      if (percentage < 20) urgency = 'critical';
      else if (percentage < 50) urgency = 'warning';
      
      lowStockItems.push({
        id: seed.id,
        name: crop?.name || 'Neznáme semeno',
        type: 'seed',
        currentStock: seed.quantity,
        minStock: seed.unit === 'kg' ? minQuantity / 1000 : minQuantity,
        unit: seed.unit || 'g',
        link: '/seeds',
        urgency,
      });
    }
  });

  // Check packaging - use custom min_stock if set, otherwise use dynamic minimums based on packaging size
  packagings.forEach(pkg => {
    const customMinStock = (pkg as any).min_stock;
    const minQuantity = customMinStock !== null && customMinStock !== undefined 
      ? customMinStock 
      : getMinPackagingQuantity(pkg.size || '');
    
    if (pkg.quantity < minQuantity) {
      const percentage = (pkg.quantity / minQuantity) * 100;
      let urgency: 'critical' | 'warning' | 'low' = 'low';
      if (percentage < 20) urgency = 'critical';
      else if (percentage < 50) urgency = 'warning';
      
      lowStockItems.push({
        id: pkg.id,
        name: `${pkg.name} ${pkg.size || ''}`.trim(),
        type: 'packaging',
        currentStock: pkg.quantity,
        minStock: minQuantity,
        unit: 'ks',
        link: '/packaging',
        urgency,
      });
    }
  });

  // Check labels - use custom min_stock if set, otherwise use dynamic minimums based on label type
  labels.forEach(label => {
    const customMinStock = (label as any).min_stock;
    const minQuantity = customMinStock !== null && customMinStock !== undefined 
      ? customMinStock 
      : getMinLabelQuantity(label.type || 'standard');
    
    if (label.quantity < minQuantity) {
      const percentage = (label.quantity / minQuantity) * 100;
      let urgency: 'critical' | 'warning' | 'low' = 'low';
      if (percentage < 20) urgency = 'critical';
      else if (percentage < 50) urgency = 'warning';
      
      lowStockItems.push({
        id: label.id,
        name: label.name,
        type: 'label',
        currentStock: label.quantity,
        minStock: minQuantity,
        unit: 'ks',
        link: '/labels',
        urgency,
      });
    }
  });

  // Sort by urgency (critical first)
  lowStockItems.sort((a, b) => {
    const urgencyOrder = { critical: 0, warning: 1, low: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  if (lowStockItems.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'seed': return <Leaf className="h-4 w-4" />;
      case 'packaging': return <Package className="h-4 w-4" />;
      case 'label': return <Tag className="h-4 w-4" />;
      case 'substrate': return <Box className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'seed': return 'Semená';
      case 'packaging': return 'Obaly';
      case 'label': return 'Etikety';
      case 'substrate': return 'Substrát';
      default: return 'Zásoby';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-destructive/10 border-destructive/50 text-destructive';
      case 'warning': return 'bg-warning/10 border-warning/50 text-warning';
      default: return 'bg-muted border-muted-foreground/30 text-muted-foreground';
    }
  };

  const getProgressColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '[&>div]:bg-destructive';
      case 'warning': return '[&>div]:bg-warning';
      default: return '[&>div]:bg-muted-foreground';
    }
  };

  const criticalCount = lowStockItems.filter(i => i.urgency === 'critical').length;
  const warningCount = lowStockItems.filter(i => i.urgency === 'warning').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-foreground">Nízke zásoby</h3>
        {criticalCount > 0 && (
          <Badge variant="destructive" className="ml-1">{criticalCount} kritické</Badge>
        )}
        {warningCount > 0 && (
          <Badge variant="outline" className="border-warning text-warning">{warningCount} varovania</Badge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lowStockItems.slice(0, 9).map((item) => {
          const percentage = Math.round((item.currentStock / item.minStock) * 100);
          return (
            <Alert 
              key={item.id} 
              className={`${getUrgencyColor(item.urgency)} border`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <AlertTitle className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    <span className="truncate">{item.name}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{getTypeLabel(item.type)}</Badge>
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>
                        {item.currentStock} / {item.minStock} {item.unit}
                      </span>
                      <span className="font-medium">{percentage}%</span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-1.5 ${getProgressColor(item.urgency)}`}
                    />
                    <Link to={item.link}>
                      <Button variant="ghost" size="sm" className="h-6 text-xs mt-1 -ml-2">
                        Doplniť zásoby
                      </Button>
                    </Link>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          );
        })}
      </div>
      {lowStockItems.length > 9 && (
        <p className="text-sm text-muted-foreground">
          A ďalších {lowStockItems.length - 9} položiek s nízkymi zásobami...
        </p>
      )}
    </div>
  );
};
