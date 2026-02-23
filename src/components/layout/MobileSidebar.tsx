import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
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
  Menu,
  LogOut,
  Shield
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

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    navigate('/auth');
  };

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
    { name: 'Sklad', href: '/inventory/seeds', icon: Warehouse },
    { name: 'Náklady', href: '/costs/fuel', icon: Receipt },
    { name: 'Kalendár', href: '/calendar', icon: Calendar },
    { name: 'Reporty', href: '/reports', icon: FileText },
  ];

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
            {menuItems.map((item) => {
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