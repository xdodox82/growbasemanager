import { MainLayout } from '@/components/layout/MainLayout';
import { DeliverySettings } from '@/components/settings/DeliverySettings';
import { HarvestSettings } from '@/components/settings/HarvestSettings';
import { DeliveryDaysSettings } from '@/components/settings/DeliveryDaysSettings';
import { VATSettings } from '@/components/settings/VATSettings';
import { DeliveryExceptionsSettings } from '@/components/settings/DeliveryExceptionsSettings';
import { TwoFactorSettings } from '@/components/auth/TwoFactorSettings';
import { WorkerPermissionsSettings } from '@/components/settings/WorkerPermissionsSettings';
import { SidebarManagement } from '@/components/settings/SidebarManagement';
import { UsersManagement } from '@/components/settings/UsersManagement';
import { Settings, Sun, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const SectionLabel = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 mt-2 mb-3">
    <div className="flex-1 h-px bg-[#e2e8f0]" />
    <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">{label}</span>
    <div className="flex-1 h-px bg-[#e2e8f0]" />
  </div>
);

const SettingsPage = () => {
  const { isAdmin } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
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
    <MainLayout hideMobileHeader>
      {/* GrowBase header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
          <Settings className="h-5 w-5 text-[#475569]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Nastavenia</h1>
          <p className="text-xs text-[#64748b]">Správa systému GrowBase</p>
        </div>
      </div>

      <div className="space-y-3">

        {/* ROZVOZ */}
        <SectionLabel label="Rozvoz" />
        <DeliverySettings />
        <DeliveryDaysSettings />
        <DeliveryExceptionsSettings />

        {/* ZBER */}
        <SectionLabel label="Zber a balenie" />
        <HarvestSettings />

        {/* FINANCIE */}
        <SectionLabel label="Financie" />
        <VATSettings />

        {/* PRACOVNÍCI — len admin */}
        {isAdmin && (
          <>
            <SectionLabel label="Pracovníci a prístupy" />
            <UsersManagement />
            <WorkerPermissionsSettings />
            <SidebarManagement />
          </>
        )}

        {/* BEZPEČNOSŤ */}
        <SectionLabel label="Bezpečnosť" />
        <TwoFactorSettings />

        {/* VZHĽAD */}
        <SectionLabel label="Vzhľad" />
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
                {isDarkMode ? <Moon className="h-4 w-4 text-[#475569]" /> : <Sun className="h-4 w-4 text-[#475569]" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-[#0f172a]">Tmavý režim</div>
                <div className="text-xs text-[#64748b]">Prepnúť na tmavé zobrazenie</div>
              </div>
            </div>
            <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default SettingsPage;
