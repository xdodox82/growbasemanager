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

export function Sidebar() {
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

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', href: '/', icon: Home },
    { id: 'today', name: 'Dnešné úlohy', href: '/today', icon: CheckSquare },
    { id: 'customers', name: 'Zákazníci', href: '/customers', icon: Users },
    { id: 'suppliers', name: 'Dodávatelia', href: '/suppliers', icon: Building2 },
    { id: 'crops', name: 'Plodiny', href: '/crops', icon: Sprout },
    { id: 'blends', name: 'Mixy', href: '/blends', icon: Blend },
    { id: 'prices', name: 'Ceny', href: '/prices', icon: DollarSign },
    { id: 'orders', name: 'Objednávky', href: '/orders', icon: ShoppingCart },
    { id: 'planting', name: 'Plán sadenia', href: '/planting', icon: CalendarDays },
    { id: 'prep-planting', name: 'Príprava na sadenie', href: '/prep-planting', icon: Box },
    { id: 'prep-packaging', name: 'Príprava obalov', href: '/prep-packaging', icon: Tag },
    { id: 'harvest-packing', name: 'Zber a balenie', href: '/harvest-packing', icon: Scissors },
    { id: 'delivery', name: 'Rozvoz', href: '/delivery', icon: Truck },
  ].filter(item => isItemVisible(item.id));

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary glow-primary">
            <Sprout className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">{t('app.name')}</h1>
            <p className="text-xs text-muted-foreground">{t('app.manager')}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav ref={navRef} onScroll={handleScroll} className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}

          {/* 14. Sklad s submenu */}
          <div>
            <button
              onClick={() => setIsInventoryOpen(!isInventoryOpen)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isInventoryActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Warehouse className="h-5 w-5" />
              Sklad
              {isInventoryOpen ? (
                <ChevronDown className="ml-auto h-4 w-4" />
              ) : (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </button>
            {isInventoryOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {inventoryItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* 15. Náklady s submenu */}
          <div>
            <button
              onClick={() => setIsCostsOpen(!isCostsOpen)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isCostsActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Receipt className="h-5 w-5" />
              Náklady
              {isCostsOpen ? (
                <ChevronDown className="ml-auto h-4 w-4" />
              ) : (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </button>
            {isCostsOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {costsItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* 16. Kalendár */}
          <Link
            to="/calendar"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              location.pathname === '/calendar'
                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Calendar className="h-5 w-5" />
            Kalendár
          </Link>

          {/* 17. Reporty */}
          <Link
            to="/reports"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              location.pathname === '/reports'
                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <FileText className="h-5 w-5" />
            Reporty
          </Link>
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
