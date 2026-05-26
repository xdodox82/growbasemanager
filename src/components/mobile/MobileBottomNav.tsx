import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  ListChecks,
  ShoppingCart,
  Menu,
  Sprout,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  NAV_GROUPS,
  isNavItemActive,
  isNavItemVisible,
} from '@/components/layout/navigation';

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const [sidebarSettings, setSidebarSettings] = useState<Record<string, boolean>>({});
  const [pendingCount, setPendingCount] = useState(0);

  // Pending objednávky (badge na Objednávky v bare + v menu sheet)
  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval');
      setPendingCount(count || 0);
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60000);
    return () => clearInterval(interval);
  }, []);

  // Worker permissions
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
      }
    };
    loadSidebarSettings();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    navigate('/auth');
  };

  // Spodný bar — pevné 3 položky + Menu
  const bottomBarItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, badge: 0 },
    { name: 'Úlohy', href: '/today', icon: ListChecks, badge: 0 },
    { name: 'Objednávky', href: '/orders', icon: ShoppingCart, badge: pendingCount },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomBarItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
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
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                    <Sprout className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold">{t('app.name')}</h2>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Skupiny so položkami — každá skupina ako sekcia s grid kariet */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                  {NAV_GROUPS.map(group => {
                    const visibleItems = group.items.filter(item => isNavItemVisible(item, sidebarSettings));
                    if (visibleItems.length === 0) return null;
                    return (
                      <div key={group.id}>
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">
                          {group.label}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {visibleItems.map(item => {
                            const isActive = isNavItemActive(item, location.pathname);
                            const badge = item.id === 'orders' ? pendingCount : 0;
                            return (
                              <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={cn(
                                  'relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all min-h-[88px]',
                                  isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 hover:bg-muted text-foreground'
                                )}
                              >
                                <item.icon className="h-6 w-6 shrink-0" />
                                <span className="text-xs font-medium text-center leading-tight">{item.name}</span>
                                {badge > 0 && (
                                  <span className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1.5 text-[10px] font-bold text-white">
                                    {badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-4 py-4 space-y-2">
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
                    <span className="font-medium">Nastavenia</span>
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
