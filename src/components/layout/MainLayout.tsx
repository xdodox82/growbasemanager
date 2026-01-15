import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { DesktopHeader } from './DesktopHeader';
import { QuickActionFAB } from '@/components/mobile/QuickActionFAB';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Mobile header */}
      <MobileHeader />
      
      {/* Desktop notification center */}
      <DesktopHeader />
      
      {/* Main content */}
      <main className="md:pl-64 pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Quick Action FAB */}
      <div className="hidden md:block">
        <QuickActionFAB />
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
