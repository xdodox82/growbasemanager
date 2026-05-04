import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Home,
  CheckSquare,
  Users,
  Building2,
  Sprout,
  Blend,
  DollarSign,
  ShoppingCart,
  CalendarDays,
  Box,
  Tag,
  Scissors,
  Truck,
  Warehouse,
  Receipt,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Shield,
  ChevronDown,
  ChevronRight,
  Wheat,
  Package,
  Layers,
  Fuel,
  Droplets,
  Droplet,
  Zap
} from 'lucide-react';

interface SidebarProps {
  onToggle?: () => void;
}

export function Sidebar({ onToggle }: SidebarProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, signOut, isAdmin } = useAuth();
  const navRef = useRef<HTMLElement>(null);
  const [sidebarSettings, setSidebarSettings] = useState<Record<string, boolean>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(
    location.pathname.startsWith('/inventory')
  );
  const [isCostsOpen, setIsCostsOpen] = useState(
    location.pathname.startsWith('/costs')
  );

  const PREHLAD_PATHS = ['/', '/today', '/calendar'];
  const PRODUKCIA_PATHS = ['/planting', '/prep-planting', '/prep-packaging', '/harvest-packing', '/delivery'];

  const [isPrehladOpen, setIsPrehladOpen] = useState(
    PREHLAD_PATHS.includes(location.pathname)
  );
  const [isProdukciaOpen, setIsProdukciaOpen] = useState(
    PRODUKCIA_PATHS.includes(location.pathname)
  );
  const [isSpravaOpen, setIsSpravaOpen] = useState(
    !PREHLAD_PATHS.includes(location.pathname) && !PRODUKCIA_PATHS.includes(location.pathname)
  );

  // Load sidebar settings from profiles
  useEffect(() => {
    const loadSidebarSettings = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('sidebar_settings')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.sidebar_settings) {
          setSidebarSettings(data.sidebar_settings as Record<string, boolean>);
        }
      } catch (error) {
        console.error('Error loading sidebar settings:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSidebarSettings();
  }, [user]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('sidebar-scroll-position');
    if (savedScrollPos && navRef.current) {
      navRef.current.scrollTop = parseInt(savedScrollPos, 10);
    }
  }, []);

  // Save scroll position
  const handleScroll = () => {
    if (navRef.current) {
      sessionStorage.setItem('sidebar-scroll-position', navRef.current.scrollTop.toString());
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Helper function to check if item should be visible
  const isItemVisible = (itemId: string) => {
    if (Object.keys(sidebarSettings).length === 0) return true; // Default: all visible
    return sidebarSettings[itemId] !== false;
  };


  const inventoryItems = [
    { name: 'Osivo', href: '/inventory/seeds', icon: Wheat },
    { name: 'Obalový materiál', href: '/inventory/packaging', icon: Package },
    { name: 'Substrát', href: '/inventory/substrate', icon: Layers },
    { name: 'Etikety', href: '/inventory/labels', icon: Tag },
    { name: 'Spotrebný materiál', href: '/inventory/consumables', icon: Package },
  ];

  const costsItems = [
    { name: 'Pohonné hmoty', href: '/costs/fuel', icon: Fuel },
    { name: 'AdBlue', href: '/costs/adblue', icon: Droplets },
    { name: 'Voda', href: '/costs/water', icon: Droplet },
    { name: 'Elektrina', href: '/costs/electricity', icon: Zap },
    { name: 'Ostatné náklady', href: '/costs/other', icon: Receipt },
  ];

  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isCostsActive = location.pathname.startsWith('/costs');

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <button
            onClick={onToggle}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary glow-primary hover:bg-primary/90 transition-colors cursor-pointer"
            title="Skryť menu"
            aria-label="Toggle sidebar"
          >
            <Sprout className="h-6 w-6 text-primary-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">{t('app.name')}</h1>
            <p className="text-xs text-muted-foreground">{t('app.manager')}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav ref={navRef} onScroll={handleScroll} className="flex-1 px-3 py-3 overflow-y-auto">

          {/* ── PREHĽAD ── */}
          <button
            onClick={() => setIsPrehladOpen(v => !v)}
            className="flex w-full items-center gap-1 px-3 mb-1 hover:text-sidebar-foreground transition-colors"
          >
            <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', isPrehladOpen && 'rotate-90')} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Prehľad</span>
          </button>
          <div className={cn('overflow-hidden transition-all duration-200', isPrehladOpen ? 'max-h-60' : 'max-h-0')}>
            <div className="space-y-0.5 pb-1">
              {[
                { id: 'dashboard', name: 'Dashboard', href: '/', icon: Home },
                { id: 'today', name: 'Dnešné úlohy', href: '/today', icon: CheckSquare },
                { id: 'calendar', name: 'Kalendár', href: '/calendar', icon: Calendar },
              ].filter(item => isItemVisible(item.id)).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="my-2 border-t border-sidebar-border/60" />

          {/* ── PRODUKCIA ── */}
          <button
            onClick={() => setIsProdukciaOpen(v => !v)}
            className="flex w-full items-center gap-1 px-3 mb-1 hover:text-sidebar-foreground transition-colors"
          >
            <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', isProdukciaOpen && 'rotate-90')} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Produkcia</span>
          </button>
          <div className={cn('overflow-hidden transition-all duration-200', isProdukciaOpen ? 'max-h-60' : 'max-h-0')}>
            <div className="space-y-0.5 pb-1">
              {[
                { id: 'planting', name: 'Plán sadenia', href: '/planting', icon: CalendarDays },
                { id: 'prep-planting', name: 'Príprava na sadenie', href: '/prep-planting', icon: Box },
                { id: 'prep-packaging', name: 'Príprava obalov', href: '/prep-packaging', icon: Tag },
                { id: 'harvest-packing', name: 'Zber a balenie', href: '/harvest-packing', icon: Scissors },
                { id: 'delivery', name: 'Rozvoz', href: '/delivery', icon: Truck },
              ].filter(item => isItemVisible(item.id)).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="my-2 border-t border-sidebar-border/60" />

          {/* ── SPRÁVA ── */}
          <button
            onClick={() => setIsSpravaOpen(v => !v)}
            className="flex w-full items-center gap-1 px-3 mb-1 hover:text-sidebar-foreground transition-colors"
          >
            <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', isSpravaOpen && 'rotate-90')} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Správa</span>
          </button>
          <div className={cn('overflow-hidden transition-all duration-200', isSpravaOpen ? 'max-h-[600px]' : 'max-h-0')}>
            <div className="space-y-0.5 pb-1">
              {[
                { id: 'customers', name: 'Zákazníci', href: '/customers', icon: Users },
                { id: 'suppliers', name: 'Dodávatelia', href: '/suppliers', icon: Building2 },
                { id: 'orders', name: 'Objednávky', href: '/orders', icon: ShoppingCart },
                { id: 'crops', name: 'Plodiny', href: '/crops', icon: Sprout },
                { id: 'blends', name: 'Mixy', href: '/blends', icon: Blend },
                { id: 'prices', name: 'Ceny', href: '/prices', icon: DollarSign },
              ].filter(item => isItemVisible(item.id)).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}

              {/* Sklad s submenu */}
              {isItemVisible('inventory') && (
                <div>
                  <button
                    onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                      isInventoryActive
                        ? 'bg-primary/20 text-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Warehouse className="h-4 w-4 shrink-0" />
                    Sklad
                    <ChevronRight className={cn('ml-auto h-3.5 w-3.5 transition-transform duration-200', isInventoryOpen && 'rotate-90')} />
                  </button>
                  <div className={cn('overflow-hidden transition-all duration-200 ml-4', isInventoryOpen ? 'max-h-60' : 'max-h-0')}>
                    <div className="space-y-0.5 pt-0.5">
                      {inventoryItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Náklady s submenu */}
              {isItemVisible('costs') && (
                <div>
                  <button
                    onClick={() => setIsCostsOpen(!isCostsOpen)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                      isCostsActive
                        ? 'bg-primary/20 text-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Receipt className="h-4 w-4 shrink-0" />
                    Náklady
                    <ChevronRight className={cn('ml-auto h-3.5 w-3.5 transition-transform duration-200', isCostsOpen && 'rotate-90')} />
                  </button>
                  <div className={cn('overflow-hidden transition-all duration-200 ml-4', isCostsOpen ? 'max-h-60' : 'max-h-0')}>
                    <div className="space-y-0.5 pt-0.5">
                      {costsItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Reporty */}
              {isItemVisible('reports') && (
                <Link
                  to="/reports"
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                    location.pathname === '/reports'
                      ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  Reporty
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-1">
          {isAdmin && (
            <Link
              to="/users"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                location.pathname === '/users'
                  ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Shield className="h-5 w-5" />
              Používatelia
            </Link>
          )}
          <Link
            to="/settings"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              location.pathname === '/settings'
                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <Settings className="h-5 w-5" />
            Nastavenia
          </Link>
          
          <div className="pt-2 border-t border-sidebar-border mt-2">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate">{user?.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Odhlásiť sa
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
