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
import { Settings, Truck, Leaf, Users, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'delivery' | 'production' | 'team' | 'system';

const SettingsPage = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('delivery');

  const tabs: { id: Tab; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'delivery', label: 'Rozvoz', icon: Truck },
    { id: 'production', label: 'Produkcia', icon: Leaf },
    { id: 'team', label: 'Tím', icon: Users, adminOnly: true },
    { id: 'system', label: 'Systém', icon: Shield },
  ];

  return (
    <MainLayout hideMobileHeader>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
          <Settings className="h-5 w-5 text-[#475569]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Nastavenia</h1>
          <p className="text-xs text-[#64748b]">Správa systému GrowBase</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-[#f1f5f9] p-1 rounded-xl border border-[#e2e8f0] mb-5">
        {tabs
          .filter(t => !t.adminOnly || isAdmin)
          .map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? 'bg-white border border-[#e2e8f0] text-[#0f172a] shadow-sm'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}>
                <Icon className={`h-4 w-4 ${active ? 'text-[#16a34a]' : ''}`} />
                {tab.label}
              </button>
            );
          })}
      </div>

      {/* Tab content */}
      <div className="space-y-3">

        {activeTab === 'delivery' && (
          <>
            <DeliverySettings />
            <DeliveryDaysSettings />
          </>
        )}

        {activeTab === 'production' && (
          <>
            <HarvestSettings />
            <DeliveryExceptionsSettings />
            <VATSettings />
          </>
        )}

        {activeTab === 'team' && isAdmin && (
          <>
            <UsersManagement />
            <WorkerPermissionsSettings />
            <SidebarManagement />
          </>
        )}

        {activeTab === 'system' && (
          <>
            <TwoFactorSettings />
          </>
        )}

      </div>
    </MainLayout>
  );
};

export default SettingsPage;
