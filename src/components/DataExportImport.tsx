import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/store/appStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { Download, Upload, Database, Loader2, CheckCircle2, AlertCircle, CloudUpload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LocalStorageData {
  crops: any[];
  blends: any[];
  customers: any[];
  orders: any[];
  plantingPlans: any[];
  tasks: any[];
  seeds: any[];
  packagings: any[];
  suppliers: any[];
  substrates: any[];
  otherInventory: any[];
  deliveryRoutes: any[];
}

const DATA_CATEGORIES = [
  { key: 'crops', label: 'Plodiny', table: 'crops' },
  { key: 'blends', label: 'Zmesi', table: 'blends' },
  { key: 'customers', label: 'Zákazníci', table: 'customers' },
  { key: 'suppliers', label: 'Dodávatelia', table: 'suppliers' },
  { key: 'orders', label: 'Objednávky', table: 'orders' },
  { key: 'plantingPlans', label: 'Plány výsevu', table: 'planting_plans' },
  { key: 'tasks', label: 'Úlohy', table: 'tasks' },
  { key: 'seeds', label: 'Semená', table: 'seeds' },
  { key: 'packagings', label: 'Obaly', table: 'packagings' },
  { key: 'substrates', label: 'Substráty', table: 'substrates' },
  { key: 'otherInventory', label: 'Ostatný inventár', table: 'other_inventory' },
] as const;

export function DataExportImport() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const store = useAppStore();
  
  const [localData, setLocalData] = useState<LocalStorageData | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [migratedCategories, setMigratedCategories] = useState<string[]>([]);
  const [failedCategories, setFailedCategories] = useState<string[]>([]);
  const [showMigration, setShowMigration] = useState(false);

  const handleExport = () => {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      crops: store.crops,
      blends: store.blends,
      customers: store.customers,
      orders: store.orders,
      tasks: store.tasks,
      plantingPlans: store.plantingPlans,
      seeds: store.seeds,
      packaging: store.packagings,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrozelenina-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: t('settings.exportSuccess'),
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (!data.version || !data.crops || !data.customers) {
          throw new Error('Invalid data format');
        }

        if (data.crops) {
          data.crops.forEach((crop: any) => {
            if (!store.crops.find(c => c.id === crop.id)) {
              store.addCrop(crop);
            }
          });
        }
        
        if (data.blends) {
          data.blends.forEach((blend: any) => {
            if (!store.blends.find(b => b.id === blend.id)) {
              store.addBlend(blend);
            }
          });
        }
        
        if (data.customers) {
          data.customers.forEach((customer: any) => {
            if (!store.customers.find(c => c.id === customer.id)) {
              store.addCustomer(customer);
            }
          });
        }
        
        if (data.orders) {
          data.orders.forEach((order: any) => {
            if (!store.orders.find(o => o.id === order.id)) {
              store.addOrder(order);
            }
          });
        }
        
        if (data.plantingPlans) {
          data.plantingPlans.forEach((plan: any) => {
            if (!store.plantingPlans.find(p => p.id === plan.id)) {
              store.addPlantingPlan(plan);
            }
          });
        }
        
        if (data.seeds) {
          data.seeds.forEach((seed: any) => {
            if (!store.seeds.find(s => s.id === seed.id)) {
              store.addSeed(seed);
            }
          });
        }
        
        if (data.packaging) {
          data.packaging.forEach((pkg: any) => {
            if (!store.packagings.find(p => p.id === pkg.id)) {
              store.addPackaging(pkg);
            }
          });
        }

        toast({
          title: t('settings.importSuccess'),
        });
      } catch (error) {
        toast({
          title: t('settings.importError'),
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Migration functions
  const loadLocalData = () => {
    try {
      const stored = localStorage.getItem('microgreen-manager-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        const state = parsed.state as LocalStorageData;
        setLocalData(state);
        
        const categoriesWithData = DATA_CATEGORIES
          .filter(cat => {
            const data = state[cat.key as keyof LocalStorageData];
            return Array.isArray(data) && data.length > 0;
          })
          .map(cat => cat.key);
        setSelectedCategories(categoriesWithData);
        setShowMigration(true);
        
        toast({
          title: 'Dáta načítané',
          description: `Nájdených ${categoriesWithData.length} kategórií s dátami.`,
        });
      } else {
        toast({
          title: 'Žiadne dáta',
          description: 'V localStorage neboli nájdené žiadne dáta.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať lokálne dáta.',
        variant: 'destructive',
      });
    }
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key) 
        : [...prev, key]
    );
  };

  const transformCrop = (crop: any) => ({
    name: crop.name,
    variety: crop.variety || null,
    days_to_harvest: crop.daysToHarvest || crop.days_to_harvest || 7,
    seed_density: crop.seedDensity || crop.seed_density || null,
    seed_soaking: crop.seedSoaking || crop.seed_soaking || false,
    expected_yield: crop.expectedYield || crop.expected_yield || null,
    color: crop.color || '#22c55e',
  });

  const transformBlend = (blend: any) => ({
    name: blend.name,
    crop_ids: blend.cropIds || blend.crop_ids || [],
  });

  const transformCustomer = (customer: any) => ({
    name: customer.name,
    email: customer.email || null,
    phone: customer.phone || null,
    address: customer.address || null,
    delivery_notes: customer.deliveryNotes || customer.delivery_notes || null,
    delivery_day_ids: customer.deliveryDayIds || customer.delivery_day_ids || [],
  });

  const transformSupplier = (supplier: any) => ({
    name: supplier.name,
    contact_name: supplier.contactName || supplier.contact_name || null,
    email: supplier.email || null,
    phone: supplier.phone || null,
    address: supplier.address || null,
    notes: supplier.notes || null,
  });

  const transformOrder = (order: any) => ({
    customer_id: null,
    crop_id: null,
    blend_id: null,
    quantity: order.quantity || 0,
    unit: order.unit || 'g',
    order_date: order.orderDate || order.order_date || new Date().toISOString().split('T')[0],
    delivery_date: order.deliveryDate || order.delivery_date || null,
    status: order.status || 'pending',
    is_recurring: order.isRecurring || order.is_recurring || false,
    recurrence_pattern: order.recurrencePattern || order.recurrence_pattern || null,
    notes: order.notes || null,
  });

  const transformPlantingPlan = (plan: any) => ({
    crop_id: null,
    order_id: null,
    sow_date: plan.sowDate || plan.sow_date || new Date().toISOString().split('T')[0],
    expected_harvest_date: plan.expectedHarvestDate || plan.expected_harvest_date || null,
    actual_harvest_date: plan.actualHarvestDate || plan.actual_harvest_date || null,
    tray_count: plan.trayCount || plan.tray_count || 1,
    status: plan.status || 'planned',
    notes: plan.notes || null,
  });

  const transformTask = (task: any) => ({
    title: task.title,
    description: task.description || null,
    due_date: task.dueDate || task.due_date || null,
    completed: task.completed || false,
    category: task.category || null,
  });

  const transformSeed = (seed: any) => ({
    crop_id: null,
    supplier_id: null,
    quantity: seed.quantity || 0,
    unit: seed.quantityUnit || seed.unit || 'g',
    lot_number: seed.lotNumber || seed.lot_number || null,
    purchase_date: seed.purchaseDate || seed.purchase_date || null,
    expiry_date: seed.expirationDate || seed.expiry_date || null,
    notes: seed.notes || null,
  });

  const transformPackaging = (packaging: any) => ({
    name: packaging.name,
    type: packaging.type || null,
    size: packaging.size || null,
    quantity: packaging.quantity || 0,
    supplier_id: null,
    notes: packaging.notes || null,
  });

  const transformSubstrate = (substrate: any) => ({
    name: substrate.name,
    type: substrate.type || null,
    quantity: substrate.currentStock || substrate.quantity || 0,
    unit: substrate.unit || 'kg',
    supplier_id: null,
    notes: substrate.notes || null,
  });

  const transformOtherInventory = (item: any) => ({
    name: item.name,
    category: item.category || null,
    quantity: item.quantity || 0,
    unit: item.unit || null,
    notes: item.notes || null,
  });

  const migrateData = async () => {
    if (!localData || selectedCategories.length === 0) return;
    
    setMigrating(true);
    const migrated: string[] = [];
    const failed: string[] = [];

    for (const category of selectedCategories) {
      const categoryConfig = DATA_CATEGORIES.find(c => c.key === category);
      if (!categoryConfig) continue;

      const items = localData[category as keyof LocalStorageData];
      if (!items || !Array.isArray(items) || items.length === 0) continue;

      try {
        let transformedItems: any[] = [];
        
        switch (category) {
          case 'crops':
            transformedItems = items.map(transformCrop);
            break;
          case 'blends':
            transformedItems = items.map(transformBlend);
            break;
          case 'customers':
            transformedItems = items.map(transformCustomer);
            break;
          case 'suppliers':
            transformedItems = items.map(transformSupplier);
            break;
          case 'orders':
            transformedItems = items.map(transformOrder);
            break;
          case 'plantingPlans':
            transformedItems = items.map(transformPlantingPlan);
            break;
          case 'tasks':
            transformedItems = items.map(transformTask);
            break;
          case 'seeds':
            transformedItems = items.map(transformSeed);
            break;
          case 'packagings':
            transformedItems = items.map(transformPackaging);
            break;
          case 'substrates':
            transformedItems = items.map(transformSubstrate);
            break;
          case 'otherInventory':
            transformedItems = items.map(transformOtherInventory);
            break;
        }

        if (transformedItems.length > 0) {
          const { error } = await supabase
            .from(categoryConfig.table as any)
            .insert(transformedItems);

          if (error) {
            console.error(`Error migrating ${category}:`, error);
            failed.push(category);
          } else {
            migrated.push(category);
          }
        }
      } catch (error) {
        console.error(`Error migrating ${category}:`, error);
        failed.push(category);
      }
    }

    setMigratedCategories(migrated);
    setFailedCategories(failed);
    setMigrating(false);
    
    toast({
      title: 'Migrácia dokončená',
      description: `Úspešne: ${migrated.length}, Neúspešne: ${failed.length}`,
    });
  };

  const getCategoryCount = (key: string) => {
    if (!localData) return 0;
    const data = localData[key as keyof LocalStorageData];
    return Array.isArray(data) ? data.length : 0;
  };

  return (
    <div className="space-y-4">
      {/* Export/Import buttons */}
      <div className="flex gap-3">
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {t('action.export')}
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {t('action.import')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* Cloud Migration Section */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudUpload className="h-5 w-5 text-primary" />
            Migrácia do cloudu
          </CardTitle>
          <CardDescription>
            Preneste lokálne dáta do databázy pre synchronizáciu medzi zariadeniami.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showMigration ? (
            <Button onClick={loadLocalData} variant="outline" className="gap-2">
              <Database className="h-4 w-4" />
              Načítať lokálne dáta
            </Button>
          ) : (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Vyberte kategórie na migráciu:</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {DATA_CATEGORIES.map(category => {
                    const count = getCategoryCount(category.key);
                    const isMigrated = migratedCategories.includes(category.key);
                    const isFailed = failedCategories.includes(category.key);
                    
                    return (
                      <label
                        key={category.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedCategories.includes(category.key)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        } ${count === 0 ? 'opacity-50' : ''}`}
                      >
                        <Checkbox
                          checked={selectedCategories.includes(category.key)}
                          onCheckedChange={() => toggleCategory(category.key)}
                          disabled={count === 0 || migrating}
                        />
                        <span className="flex-1 text-sm">{category.label}</span>
                        <Badge variant={count > 0 ? 'default' : 'secondary'} className="text-xs">
                          {count}
                        </Badge>
                        {isMigrated && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {isFailed && <AlertCircle className="h-4 w-4 text-destructive" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={migrateData}
                  disabled={selectedCategories.length === 0 || migrating || !user}
                  className="gap-2"
                >
                  {migrating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4" />
                  )}
                  {migrating ? 'Migrujem...' : 'Spustiť migráciu'}
                </Button>
                <Button
                  variant="outline"
                  onClick={loadLocalData}
                  disabled={migrating}
                >
                  Znova načítať
                </Button>
              </div>

              {!user && (
                <p className="text-sm text-destructive">
                  Pre migráciu musíte byť prihlásený.
                </p>
              )}

              {(migratedCategories.length > 0 || failedCategories.length > 0) && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  {migratedCategories.length > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Úspešne: {migratedCategories.map(k => 
                        DATA_CATEGORIES.find(c => c.key === k)?.label
                      ).join(', ')}
                    </p>
                  )}
                  {failedCategories.length > 0 && (
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Neúspešne: {failedCategories.map(k => 
                        DATA_CATEGORIES.find(c => c.key === k)?.label
                      ).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
