import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QuickActionFAB } from '@/components/mobile/QuickActionFAB';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { Menu, Sun, Moon } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  /**
   * @deprecated MobileHeader sa teraz auto-skrýva pri scrolle.
   * Prop sa ignoruje, ponechaný len kvôli spätnej kompatibilite — pri TS chybách na stránkach,
   * ktoré ho ešte odovzdávajú. Po cleanupe (odstránenie z volajúcich stránok) ho zmaž.
   */
  hideMobileHeader?: boolean;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', sidebarOpen.toString());
    }
  }, [sidebarOpen]);

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
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className={`hidden md:block fixed left-0 top-0 h-full transition-transform duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'}`}>
        <Sidebar onToggle={() => setSidebarOpen(false)} />
      </div>

      {/* Floating button na otvorenie sidebaru */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex fixed top-4 left-4 z-50 items-center justify-center w-10 h-10 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all border border-gray-200"
          title="Zobraziť menu"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
      )}

      {/* Mobile header — vždy renderovaný, sám sa schováva pri scrolle */}
      <MobileHeader />

      {/* Main content — scrolluje celý obsah vrátane ikoniek */}
      <main className={`h-screen overflow-y-auto pt-16 md:pt-0 pb-20 md:pb-0 transition-all duration-300 ${sidebarOpen ? 'md:pl-64' : 'md:pl-0'}`}>

        {/* Desktop ikony — súčasť scroll oblasti, nezostávajú fixed */}
        <div className="hidden md:flex justify-end items-center gap-2 px-6 py-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl border border-[#e2e8f0] bg-white flex items-center justify-center text-[#475569] hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-colors shadow-sm"
            title={isDarkMode ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <NotificationCenter />
        </div>

        <div className="px-4 pb-4 md:px-6 md:pb-6 lg:px-8 lg:pb-8">
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
