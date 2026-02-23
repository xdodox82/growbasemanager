import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Download, Upload, Loader2, Database, FileJson } from 'lucide-react';
import { format } from 'date-fns';

const TABLES = [
  'crops',
  'customers', 
  'suppliers',
  'blends',
  'orders',
  'planting_plans',
  'seeds',
  'packagings',
  'substrates',
  'other_inventory',
  'tasks',
] as const;

export function DataExportBackup() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    if (!user) {
      toast({
        title: 'Chyba',
        description: 'Musíte byť prihlásený',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);
    try {
      const exportData: Record<string, any[]> = {};

      for (const table of TABLES) {
        const { data, error } = await supabase
          .from(table)
          .select('*');
        
        if (error) {
          console.error(`Error exporting ${table}:`, error);
          continue;
        }
        exportData[table] = data || [];
      }

      const backup = {
        version: 2,
        exportDate: new Date().toISOString(),
        tables: exportData,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mikrozelenina-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export dokončený',
        description: `Exportovaných ${Object.keys(exportData).length} tabuliek.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Chyba exportu',
        description: 'Nepodarilo sa exportovať dáta.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!user) return;

    setExporting(true);
    try {
      // Export as CSV - only main tables
      const mainTables = ['crops', 'customers', 'orders', 'planting_plans'] as const;
      
      for (const table of mainTables) {
        const { data, error } = await supabase
          .from(table)
          .select('*');
        
        if (error || !data || data.length === 0) continue;
        
        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(';'),
          ...data.map(row => 
            headers.map(h => {
              const val = row[h as keyof typeof row];
              if (val === null || val === undefined) return '';
              if (typeof val === 'object') return JSON.stringify(val);
              return String(val).replace(/;/g, ',');
            }).join(';')
          )
        ];
        
        const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${table}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
      }

      toast({
        title: 'CSV export dokončený',
        description: 'Stiahnuté CSV súbory pre hlavné tabuľky.',
      });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa exportovať CSV.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    try {
      const content = await file.text();
      const backup = JSON.parse(content);

      if (!backup.version || !backup.tables) {
        throw new Error('Neplatný formát zálohy');
      }

      let imported = 0;
      let skipped = 0;

      for (const [table, records] of Object.entries(backup.tables)) {
        if (!TABLES.includes(table as any) || !Array.isArray(records) || records.length === 0) {
          continue;
        }

        // Remove id and created_at to allow auto-generation
        const cleanRecords = records.map((record: any) => {
          const { id, created_at, updated_at, ...rest } = record;
          return rest;
        });

        const { error } = await supabase
          .from(table as any)
          .insert(cleanRecords);

        if (error) {
          console.error(`Error importing ${table}:`, error);
          skipped += cleanRecords.length;
        } else {
          imported += cleanRecords.length;
        }
      }

      toast({
        title: 'Import dokončený',
        description: `Importovaných ${imported} záznamov, preskočených ${skipped}.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Chyba importu',
        description: 'Nepodarilo sa importovať dáta. Skontrolujte formát súboru.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Záloha a export dát
        </CardTitle>
        <CardDescription>
          Exportujte alebo importujte dáta z databázy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={handleExport} 
            disabled={exporting || !user}
            variant="outline"
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileJson className="h-4 w-4" />
            )}
            Export JSON
          </Button>
          
          <Button 
            onClick={handleExportCSV} 
            disabled={exporting || !user}
            variant="outline"
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </Button>

          <label>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              disabled={importing || !user}
            />
            <Button 
              variant="outline" 
              className="gap-2"
              disabled={importing || !user}
              asChild
            >
              <span>
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Import zálohy
              </span>
            </Button>
          </label>
        </div>

        <p className="text-sm text-muted-foreground">
          JSON záloha obsahuje všetky dáta. CSV export je určený pre prezeranie v Exceli.
        </p>
      </CardContent>
    </Card>
  );
}
