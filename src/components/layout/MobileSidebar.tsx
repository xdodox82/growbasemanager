import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Leaf,
  Users,
  ShoppingCart,
  Calendar,
  Blend,
  Settings,
  Sprout,
  Warehouse,
  Wheat,
  Package,
  ChevronDown,
  ChevronRight,
  Truck,
  Building2,
  Scissors,
  FileBarChart,
  Layers,
  Box,
  Menu,
  Tag,
  LogOut,
  Shield,
  ListChecks,
  Euro,
  Fuel,
  Droplet,
  Zap,
  Droplets,
  Wrench,
  Receipt
} from 'lucide-react';

interface MobileSidebarProps {
  onClose?: () => void;
}

export function MobileSidebar({ onClose }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, signOut, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(
    location.pathname.startsWith('/inventory')
  );
  const [isCostsOpen, setIsCostsOpen] = useState(
    location.pathname.startsWith('/costs')
  );

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    navigate('/auth');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Dnešné úlohy', href: '/today', icon: ListChecks },
    { name: 'Zákazníci', href: '/customers', icon: Users },
    { name: 'Dodávatelia', href: '/suppliers', icon: Building2 },
    { name: 'Objednávky', href: '/orders', icon: ShoppingCart },
    { name: 'Plodiny', href: '/crops', icon: Leaf },
    { name: 'Zmesi', href: '/blends', icon: Blend },
    { name: 'Plánovanie pestovania', href: '/planting', icon: Calendar },
    { name: 'Zber úrody', href: '/harvest', icon: Scissors },
    { name: 'Dodávka', href: '/delivery', icon: Truck },
    { name: 'Kalendár', href: '/calendar', icon: Calendar },
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
    { name: 'Spotrebný materiál', href: '/inventory/consumables', icon: Package },
  ];

  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isCostsActive = location.pathname.startsWith('/costs');

  const handleLinkClick = () => {
    // Keep sidebar open after clicking a link
    // User can manually close it using the close button
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-50 bg-sidebar/80 backdrop-blur-sm">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
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
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}

            {/* Costs submenu - ALWAYS VISIBLE */}
            <div>
              <button
                onClick={() => setIsCostsOpen(!isCostsOpen)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                  isCostsActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Euro className="h-5 w-5" />
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
                        onClick={handleLinkClick}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
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

            {/* Inventory submenu - ALWAYS VISIBLE */}
            <div>
              <button
                onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
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
                        onClick={handleLinkClick}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
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

            {/* Prices */}
            <Link
              to="/prices"
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                location.pathname === '/prices'
                  ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Euro className="h-5 w-5" />
              Ceny
            </Link>

            {/* Reports */}
            <Link
              to="/reports"
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                location.pathname === '/reports'
                  ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <FileBarChart className="h-5 w-5" />
              Reporty
            </Link>
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4 space-y-1">
            {isAdmin && (
              <Link
                to="/users"
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
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
              onClick={handleLinkClick}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Odhlásiť sa
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}