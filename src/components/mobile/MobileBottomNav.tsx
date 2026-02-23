import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ListChecks, Calendar, Menu } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
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
  FileBarChart,
  Settings,
  Wheat,
  Package,
  Layers,
  Fuel,
  Droplets,
  Droplet,
  Zap,
  ChevronDown,
  ChevronRight,
  LogOut,
  Shield,
  Euro,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MobileBottomNav() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCostsOpen, setIsCostsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const { t } = useLanguage();
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    navigate('/auth');
  };

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Úlohy', href: '/today', icon: ListChecks },
    { name: 'Kalendár', href: '/calendar', icon: Calendar },
  ];

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Dnešné úlohy', href: '/today', icon: CheckSquare },
    { name: 'Zákazníci', href: '/customers', icon: Users },
    { name: 'Dodávatelia', href: '/suppliers', icon: Building2 },
    { name: 'Plodiny', href: '/crops', icon: Sprout },
    { name: 'Mixy', href: '/blends', icon: Blend },
    { name: 'Ceny', href: '/prices', icon: DollarSign },
    { name: 'Objednávky', href: '/orders', icon: ShoppingCart },
    { name: 'Plán sadenia', href: '/planting', icon: CalendarDays },
    { name: 'Príprava na sadenie', href: '/prep-planting', icon: Box },
    { name: 'Príprava obalov', href: '/prep-packaging', icon: Tag },
    { name: 'Zber a balenie', href: '/harvest-packing', icon: Scissors },
    { name: 'Rozvoz', href: '/delivery', icon: Truck },
  ];

  const costsItems = [
    { name: 'Pohonné hmoty', href: '/costs/fuel', icon: Fuel },
    { name: 'AdBlue', href: '/costs/adblue', icon: Droplets },
    { name: 'Voda', href: '/costs/water', icon: Droplet },
    { name: 'Elektrina', href: '/costs/electricity', icon: Zap },
    { name: 'Ostatné náklady', href: '/costs/other', icon: Receipt },
  ];

  const inventoryItems = [
    { name: 'Osivo', href: '/inventory/seeds', icon: Wheat },
    { name: 'Obalový materiál', href: '/inventory/packaging', icon: Package },
    { name: 'Substrát', href: '/inventory/substrate', icon: Layers },
    { name: 'Etikety', href: '/inventory/labels', icon: Tag },
    { name: 'Spotrebný materiál', href: '/inventory/consumables', icon: Box },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                  isMenuOpen
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Menu className="h-5 w-5" />
                <span className="text-xs font-medium">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-0">
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                    <Sprout className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{t('app.name')}</h2>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {menuItems.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={cn(
                            'flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/50 hover:bg-muted text-foreground'
                          )}
                        >
                          <item.icon className="h-6 w-6" />
                          <span className="text-xs font-medium text-center">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Costs section */}
                  <div className="mb-6">
                    <button
                      onClick={() => setIsCostsOpen(!isCostsOpen)}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-muted/50 mb-2"
                    >
                      <div className="flex items-center gap-3">
                        <Euro className="h-5 w-5" />
                        <span className="font-medium">Náklady</span>
                      </div>
                      {isCostsOpen ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    {isCostsOpen && (
                      <div className="grid grid-cols-3 gap-3">
                        {costsItems.map((item) => {
                          const isActive = location.pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setIsMenuOpen(false)}
                              className={cn(
                                'flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted/30 hover:bg-muted text-foreground'
                              )}
                            >
                              <item.icon className="h-5 w-5" />
                              <span className="text-xs font-medium text-center">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Inventory section */}
                  <div className="mb-6">
                    <button
                      onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-muted/50 mb-2"
                    >
                      <div className="flex items-center gap-3">
                        <Warehouse className="h-5 w-5" />
                        <span className="font-medium">{t('nav.inventory')}</span>
                      </div>
                      {isInventoryOpen ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    {isInventoryOpen && (
                      <div className="grid grid-cols-3 gap-3">
                        {inventoryItems.map((item) => {
                          const isActive = location.pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setIsMenuOpen(false)}
                              className={cn(
                                'flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted/30 hover:bg-muted text-foreground'
                              )}
                            >
                              <item.icon className="h-5 w-5" />
                              <span className="text-xs font-medium text-center">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reports */}
                  <Link
                    to="/reports"
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl mb-2',
                      location.pathname === '/reports'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-muted'
                    )}
                  >
                    <FileBarChart className="h-5 w-5" />
                    <span className="font-medium">{t('nav.reports')}</span>
                  </Link>
                </div>

                {/* Footer */}
                <div className="border-t border-border px-4 py-4 space-y-2">
                  {isAdmin && (
                    <Link
                      to="/users"
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl',
                        location.pathname === '/users'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 hover:bg-muted'
                      )}
                    >
                      <Shield className="h-5 w-5" />
                      <span className="font-medium">Používatelia</span>
                    </Link>
                  )}
                  <Link
                    to="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl',
                      location.pathname === '/settings'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-muted'
                    )}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">{t('nav.settings')}</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Odhlásiť sa</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      {/* Spacer for content */}
      <div className="md:hidden h-16" />
    </>
  );
}