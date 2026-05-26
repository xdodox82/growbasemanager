import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Sprout,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import {
  NAV_GROUPS,
  isNavItemActive,
  isNavItemVisible,
} from './navigation';

interface SidebarProps {
  onToggle?: () => void;
}

export function Sidebar({ onToggle }: SidebarProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navRef = useRef<HTMLElement>(null);
  const [sidebarSettings, setSidebarSettings] = useState<Record<string, boolean>>({});
  const [pendingCount, setPendingCount] = useState(0);

  // Otvorenie skupiny — default podľa aktuálnej cesty
  const isPathInGroup = (groupId: string) => {
    const group = NAV_GROUPS.find(g => g.id === groupId);
    if (!group) return false;
    return group.items.some(item => isNavItemActive(item, location.pathname));
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach(group => {
      const saved = localStorage.getItem(`sidebar-${group.id}`);
      initial[group.id] = saved !== null ? saved === 'true' : isPathInGroup(group.id);
    });
    // Ak nie je nikde aktívna, default otvor "sprava"
    const anyActive = NAV_GROUPS.some(g => isPathInGroup(g.id));
    if (!anyActive && localStorage.getItem('sidebar-sprava') === null) {
      initial.sprava = true;
    }
    return initial;
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = !prev[groupId];
      localStorage.setItem(`sidebar-${groupId}`, String(next));
      return { ...prev, [groupId]: next };
    });
  };

  // Pending objednávky badge
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

  // Scroll persistence
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('sidebar-scroll-position');
    if (savedScrollPos && navRef.current) {
      navRef.current.scrollTop = parseInt(savedScrollPos, 10);
    }
  }, []);

  const handleScroll = () => {
    if (navRef.current) {
      sessionStorage.setItem('sidebar-scroll-position', navRef.current.scrollTop.toString());
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
          {NAV_GROUPS.map((group, idx) => {
            const isOpen = openGroups[group.id];
            const visibleItems = group.items.filter(item => isNavItemVisible(item, sidebarSettings));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.id}>
                {idx > 0 && <div className="my-2 border-t border-sidebar-border/60" />}

                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center gap-1 px-3 mb-1 hover:text-sidebar-foreground transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 text-muted-foreground transition-transform duration-200',
                      isOpen && 'rotate-90'
                    )}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </span>
                </button>
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    isOpen ? 'max-h-[600px]' : 'max-h-0'
                  )}
                >
                  <div className="space-y-0.5 pb-1">
                    {visibleItems.map(item => {
                      const isActive = isNavItemActive(item, location.pathname);
                      const badge = item.id === 'orders' ? pendingCount : 0;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium transition-all duration-200',
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.name}
                          {badge > 0 && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1.5 text-[10px] font-bold text-white">
                              {badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-1">
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
