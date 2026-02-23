import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-components';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { DataExportBackup } from '@/components/DataExportBackup';
import { DataMigrationTool } from '@/components/DataMigrationTool';
import { TwoFactorSettings } from '@/components/auth/TwoFactorSettings';
import { LoginHistory } from '@/components/auth/LoginHistory';
import { WorkerPermissionsSettings } from '@/components/settings/WorkerPermissionsSettings';
import { SidebarManagement } from '@/components/settings/SidebarManagement';
import { DeliverySettings } from '@/components/settings/DeliverySettings';
import { VATSettings } from '@/components/settings/VATSettings';
import { Globe, Moon, Sun } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const SettingsPage = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <MainLayout>
      <PageHeader 
        title={t('settings.title')} 
        description={t('settings.description')}
      />

      <div className="space-y-6">
        {/* Worker Permissions - Only for admins */}
        {isAdmin && <WorkerPermissionsSettings />}

        {/* Sidebar Management */}
        <SidebarManagement />

        {/* VAT Settings */}
        <VATSettings />

        {/* Delivery Settings */}
        <DeliverySettings />

        {/* Security - 2FA */}
        <TwoFactorSettings />

        {/* Login History */}
        <LoginHistory />

        {/* Theme Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Vzhľad</h2>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tmavý režim</Label>
              <p className="text-sm text-muted-foreground">Prepnúť na tmavý režim zobrazenia</p>
            </div>
            <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
          </div>
        </Card>

        {/* Language Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('settings.language')}</h2>
            </div>
          </div>
          
          <LanguageSelector />
        </Card>

        {/* Data Migration Tool */}
        <DataMigrationTool />

        {/* Data Management */}
        <DataExportBackup />
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
