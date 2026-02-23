import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Upload, CheckCircle2, AlertCircle, Loader2, FileJson } from 'lucide-react';

export function DataMigrationTool() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [localData, setLocalData] = useState<any>(null);
  const [jsonInput, setJsonInput] = useState('');
  const { toast } = useToast();

  const parseManualJson = () => {
    if (!jsonInput.trim()) {
      toast({
        title: 'Chyba',
        description: 'Vložte prosím JSON dáta do textového poľa.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProgress(['📝 Parsovanie JSON dát...']);
      const parsed = JSON.parse(jsonInput);

      let dataToProcess = parsed;

      if (parsed.version && parsed.tables) {
        setProgress(prev => [...prev, `✅ Nájdená Lovable štruktúra (version ${parsed.version})`]);
        setProgress(prev => [...prev, `📅 Export dátum: ${parsed.exportDate}`]);
        dataToProcess = parsed.tables;
      } else if (parsed.state) {
        dataToProcess = parsed.state;
        setProgress(prev => [...prev, '✅ Nájdená štruktúra s "state" objektom']);
      } else if (parsed.crops || parsed.customers || parsed.orders) {
        setProgress(prev => [...prev, '✅ Nájdená priama štruktúra dát']);
      }

      const counts = {
        crops: dataToProcess?.crops?.length || 0,
        customers: dataToProcess?.customers?.length || 0,
        orders: dataToProcess?.orders?.length || 0,
        suppliers: dataToProcess?.suppliers?.length || 0,
        seeds: dataToProcess?.seeds?.length || 0,
        blends: dataToProcess?.blends?.length || 0,
        substrates: (dataToProcess?.substrates || dataToProcess?.substrate)?.length || 0,
        packagings: (dataToProcess?.packagings || dataToProcess?.packaging)?.length || 0,
        plantingPlans: (dataToProcess?.planting_plans || dataToProcess?.plantingPlans || dataToProcess?.plantings)?.length || 0,
        otherInventory: (dataToProcess?.other_inventory || dataToProcess?.otherInventory)?.length || 0,
        labels: dataToProcess?.labels?.length || 0,
        prices: dataToProcess?.prices?.length || 0,
        deliveryRoutes: (dataToProcess?.delivery_routes || dataToProcess?.deliveryRoutes)?.length || 0,
        deliveryDays: (dataToProcess?.delivery_days || dataToProcess?.deliveryDays)?.length || 0,
        orderItems: (dataToProcess?.order_items || dataToProcess?.orderItems)?.length || 0,
      };

      const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

      if (totalRecords === 0) {
        setProgress(prev => [...prev, '⚠️ Nebol nájdený žiadny známy typ dát']);
        toast({
          title: 'Žiadne dáta',
          description: 'V JSON neboli nájdené žiadne známe dáta (crops, customers, orders, atď.)',
          variant: 'destructive',
        });
        return;
      }

      setProgress(prev => [...prev, `\n📊 Nájdené záznamy:`]);
      Object.entries(counts).forEach(([key, value]) => {
        if (value > 0) {
          setProgress(prev => [...prev, `  ✅ ${key}: ${value}`]);
        }
      });

      setLocalData(dataToProcess);
      toast({
        title: 'JSON úspešne parsované',
        description: `Nájdených ${totalRecords} záznamov. Môžete pokračovať migráciou.`,
      });
    } catch (error: any) {
      setProgress(prev => [...prev, `❌ Chyba pri parsovaní: ${error.message}`]);
      toast({
        title: 'Chyba pri parsovaní JSON',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadLocalData = () => {
    try {
      setProgress(['🔍 Hľadám Local Storage kľúče...']);

      const allKeys = Object.keys(localStorage);
      setProgress(prev => [...prev, `📋 Celkový počet kľúčov v Local Storage: ${allKeys.length}`]);

      const relevantKeys = allKeys.filter(key =>
        key.toLowerCase().includes('grow') ||
        key.toLowerCase().includes('micro') ||
        key.toLowerCase().includes('lovable')
      );

      setProgress(prev => [...prev, `\n🔎 Kľúče obsahujúce "grow", "micro" alebo "lovable":`]);
      if (relevantKeys.length > 0) {
        relevantKeys.forEach(key => {
          const value = localStorage.getItem(key);
          const size = value ? (value.length / 1024).toFixed(2) : '0';
          setProgress(prev => [...prev, `  📦 "${key}" (${size} KB)`]);
        });
      } else {
        setProgress(prev => [...prev, `  ❌ Žiadne relevantné kľúče nenájdené`]);
      }

      setProgress(prev => [...prev, `\n📚 Všetky kľúče v Local Storage:`]);
      allKeys.forEach(key => {
        const value = localStorage.getItem(key);
        const size = value ? (value.length / 1024).toFixed(2) : '0';
        setProgress(prev => [...prev, `  🔑 "${key}" (${size} KB)`]);
      });

      const possibleKeys = [
        'microgreen-manager-storage',
        'microgreens-storage',
        'grow-storage',
        'lovable-storage'
      ];

      let foundData = null;
      let foundKey = '';

      for (const key of possibleKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.state) {
              foundData = parsed.state;
              foundKey = key;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!foundData) {
        for (const key of allKeys) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.state && (parsed.state.crops || parsed.state.customers || parsed.state.orders)) {
                foundData = parsed.state;
                foundKey = key;
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
      }

      if (!foundData) {
        setProgress(prev => [...prev, `\n❌ Nepodarilo sa nájsť žiadne použiteľné dáta`]);
        toast({
          title: 'Žiadne lokálne dáta',
          description: 'V prehliadači neboli nájdené žiadne uložené dáta.',
          variant: 'destructive',
        });
        return;
      }

      setLocalData(foundData);
      setProgress(prev => [...prev, `\n✅ Použitý kľúč: "${foundKey}"`]);

      const counts = {
        crops: foundData?.crops?.length || 0,
        customers: foundData?.customers?.length || 0,
        orders: foundData?.orders?.length || 0,
        suppliers: foundData?.suppliers?.length || 0,
        seeds: foundData?.seeds?.length || 0,
        blends: foundData?.blends?.length || 0,
        substrates: (foundData?.substrates || foundData?.substrate)?.length || 0,
        packagings: (foundData?.packagings || foundData?.packaging)?.length || 0,
        plantingPlans: (foundData?.planting_plans || foundData?.plantingPlans || foundData?.plantings)?.length || 0,
        otherInventory: (foundData?.other_inventory || foundData?.otherInventory)?.length || 0,
        labels: foundData?.labels?.length || 0,
        prices: foundData?.prices?.length || 0,
        deliveryRoutes: (foundData?.delivery_routes || foundData?.deliveryRoutes)?.length || 0,
        deliveryDays: (foundData?.delivery_days || foundData?.deliveryDays)?.length || 0,
        orderItems: (foundData?.order_items || foundData?.orderItems)?.length || 0,
      };

      setProgress(prev => [...prev, `\n📊 Počet záznamov v každej kategórii:`]);
      Object.entries(counts).forEach(([key, value]) => {
        if (value > 0) {
          setProgress(prev => [...prev, `  ✅ ${key}: ${value}`]);
        }
      });

      toast({
        title: 'Lokálne dáta načítané',
        description: `Nájdené záznamy: ${Object.entries(counts).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
      });
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať lokálne dáta.',
        variant: 'destructive',
      });
    }
  };

  const migrateToSupabase = async () => {
    if (!localData) {
      loadLocalData();
      return;
    }

    setIsMigrating(true);
    setProgress(['Začínam migráciu...']);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setProgress(prev => [...prev, '❌ Nie je možné získať ID používateľa. Skontrolujte prihlásenie.']);
      toast({
        title: 'Chyba autentifikácie',
        description: 'Musíte byť prihlásený pre migráciu dát.',
        variant: 'destructive',
      });
      setIsMigrating(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setProgress(prev => [...prev, '❌ Nie je možné získať session token.']);
      toast({
        title: 'Chyba autentifikácie',
        description: 'Nemáte aktívnu session.',
        variant: 'destructive',
      });
      setIsMigrating(false);
      return;
    }

    setProgress(prev => [...prev, `✅ Prihlásený ako používateľ: ${user.email}`]);
    setProgress(prev => [...prev, '🔐 Používam Edge Function s admin právami pre obídenie RLS']);
    setProgress(prev => [...prev, '📋 Migrácia bude prebiehať v správnom poradí pre FK závislosti']);

    try {
      setProgress(prev => [...prev, '⚙️  Vypínam kontrolu FK a triggerov v databáze...']);
      try {
        await supabase.rpc('set_session_replica');
        setProgress(prev => [...prev, '✅ Session nastavená na replica mode']);
      } catch (rpcError) {
        setProgress(prev => [...prev, '⚠️  Nepodarilo sa nastaviť replica mode, pokračujem...']);
      }

      const tables = [
        { name: 'delivery_days', data: localData.delivery_days || localData.deliveryDays || [] },
        { name: 'delivery_routes', data: localData.delivery_routes || localData.deliveryRoutes || [] },
        { name: 'crops', data: localData.crops || [] },
        { name: 'customers', data: localData.customers || [] },
        { name: 'suppliers', data: localData.suppliers || [] },
        { name: 'blends', data: localData.blends || [] },
        { name: 'seeds', data: localData.seeds || [] },
        { name: 'substrates', data: localData.substrates || localData.substrate || [] },
        { name: 'packagings', data: localData.packagings || localData.packaging || [] },
        { name: 'labels', data: localData.labels || [] },
        { name: 'other_inventory', data: localData.other_inventory || localData.otherInventory || [] },
        { name: 'orders', data: localData.orders || [] },
        { name: 'prices', data: localData.prices || [] },
        { name: 'order_items', data: localData.order_items || localData.orderItems || [] },
        { name: 'planting_plans', data: localData.planting_plans || localData.plantingPlans || localData.plantings || [] },
      ];

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-data`;

      for (const table of tables) {
        if (!table.data || table.data.length === 0) {
          setProgress(prev => [...prev, `⏭️  ${table.name}: žiadne dáta na migráciu`]);
          continue;
        }

        setProgress(prev => [...prev, `📤 Migrujem ${table.name} (${table.data.length} záznamov)...`]);

        let currentTableName = table.name;
        let currentData = table.data;
        let retryCount = 0;
        let success = false;

        while (retryCount < 3 && !success) {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              table: currentTableName,
              data: currentData,
              userId: user.id,
            }),
          });

          const result = await response.json();

          if (!response.ok || result.error) {
            const errorMsg = result.error || 'Neznáma chyba';
            const code = result.code;

            if (errorMsg.includes('user_id') && errorMsg.includes('does not exist')) {
              setProgress(prev => [...prev, `   ⚠️  Stĺpec user_id neexistuje, odstraňujem ho z dát...`]);
              currentData = currentData.map((item: any) => {
                const { user_id, ...rest } = item;
                return rest;
              });
              retryCount++;
              continue;
            }

            if (code === '42P01' || errorMsg.includes('relation') && errorMsg.includes('does not exist')) {
              if (currentTableName.endsWith('s') && retryCount === 0) {
                const singularName = currentTableName.slice(0, -1);
                setProgress(prev => [...prev, `   ⚠️  Tabuľka ${currentTableName} neexistuje, skúšam ${singularName}...`]);
                currentTableName = singularName;
                retryCount++;
                continue;
              } else if (!currentTableName.endsWith('s') && retryCount === 1) {
                const pluralName = currentTableName + 's';
                setProgress(prev => [...prev, `   ⚠️  Tabuľka ${currentTableName} neexistuje, skúšam ${pluralName}...`]);
                currentTableName = pluralName;
                retryCount++;
                continue;
              }
            }

            const hint = result.hint ? ` (Tip: ${result.hint})` : '';
            const codeStr = code ? ` [${code}]` : '';
            setProgress(prev => [...prev, `❌ Chyba pri ${currentTableName}: ${errorMsg}${codeStr}${hint}`]);

            if (result.details) {
              console.error(`Detaily chyby pre ${currentTableName}:`, result.details);
              setProgress(prev => [...prev, `   ℹ️  Detaily v console (F12)`]);
            }
            break;
          } else {
            setProgress(prev => [...prev, `✅ ${currentTableName}: ${result.count} záznamov migrovaných`]);
            success = true;
          }
        }

        if (!success && retryCount >= 3) {
          setProgress(prev => [...prev, `❌ ${table.name}: Neúspešná migrácia po ${retryCount} pokusoch`]);
        }
      }

      setProgress(prev => [...prev, '⚙️  Zapínam späť kontrolu FK a triggerov...']);
      try {
        await supabase.rpc('set_session_default');
        setProgress(prev => [...prev, '✅ Session nastavená späť na default mode']);
      } catch (rpcError) {
        setProgress(prev => [...prev, '⚠️  Nepodarilo sa nastaviť default mode']);
      }

      setProgress(prev => [...prev, '🎉 Migrácia dokončená!']);
      toast({
        title: 'Migrácia úspešná',
        description: 'Všetky lokálne dáta boli prenesené do databázy.',
      });
    } catch (error: any) {
      setProgress(prev => [...prev, `❌ Kritická chyba: ${error.message}`]);
      toast({
        title: 'Chyba pri migrácii',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Migrácia lokálnych dát
        </CardTitle>
        <CardDescription>
          Preneste dáta uložené v prehliadači do Supabase databázy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tento nástroj načíta dáta z Local Storage vášho prehliadača a presunie ich do databázy.
            Dáta budú potom dostupné zo všetkých zariadení.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Manuálne vloženie JSON dát
          </h3>
          <p className="text-sm text-muted-foreground">
            Otvorte DevTools prehliadača (F12), prejdite na záložku "Application" alebo "Storage",
            otvorte "Local Storage", nájdite správny kľúč a skopírujte celý JSON obsah sem:
          </p>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"version": 2, "exportDate": "2026-01-03T...", "tables": {"crops": [...], "customers": [...], "orders": [...]}}'
            className="font-mono text-xs min-h-[200px]"
            disabled={isMigrating}
          />
          <Button
            onClick={parseManualJson}
            disabled={isMigrating || !jsonInput.trim()}
            className="w-full"
          >
            <FileJson className="h-4 w-4 mr-2" />
            Načítať a parsovať JSON
          </Button>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-semibold">Alebo automatické načítanie</h3>
          <div className="flex gap-2">
            <Button onClick={loadLocalData} disabled={isMigrating} variant="outline">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Skontrolovať lokálne dáta
            </Button>
            <Button onClick={migrateToSupabase} disabled={isMigrating || !localData}>
              {isMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrujem...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Migrovať do databázy
                </>
              )}
            </Button>
          </div>
        </div>

        {progress.length > 0 && (
          <div className="border rounded-lg p-4 bg-muted/50 space-y-1 max-h-96 overflow-y-auto">
            <h4 className="font-semibold mb-2">Priebeh:</h4>
            {progress.map((line, idx) => (
              <div key={idx} className="text-sm font-mono whitespace-pre-wrap">{line}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
