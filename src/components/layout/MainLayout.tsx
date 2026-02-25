import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { DesktopHeader } from './DesktopHeader';
import { QuickActionFAB } from '@/components/mobile/QuickActionFAB';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', sidebarOpen.toString());
    }
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className={`hidden md:block fixed left-0 top-0 h-full transition-transform duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'}`}>
        <Sidebar onToggle={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile header */}
      <MobileHeader />

      {/* Desktop notification center */}
      <DesktopHeader />

      {/* Main content */}
      <main className={`pt-16 md:pt-0 pb-20 md:pb-0 transition-all duration-300 ${sidebarOpen ? 'md:pl-64' : 'md:pl-0'}`}>
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
