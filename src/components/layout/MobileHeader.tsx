import { useEffect, useRef, useState } from 'react';
import { Sprout } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * Mobile header s auto-hide on scroll.
 *
 * Správanie:
 * - Pri otvorení stránky vždy viditeľný
 * - Scroll dole > THRESHOLD → schová sa hore (smooth)
 * - Scroll hore → zase sa zjaví
 * - V hornej časti stránky (< 20px) → vždy viditeľný (pull-to-refresh friendly)
 *
 * Sleduje scroll na main elemente (selektor 'main') — main je hlavný scroll container
 * v MainLayout. Window scroll nepoužívame, lebo MainLayout používa `h-screen overflow-y-auto`.
 */

const SCROLL_THRESHOLD = 10;     // koľko px pohybu spustí akciu
const TOP_FORCE_VISIBLE = 20;    // v tejto zóne je vždy viditeľný

export function MobileHeader() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const currentScrollY = mainEl.scrollTop;
        const diff = currentScrollY - lastScrollY.current;

        // Vždy viditeľný blízko vrchu
        if (currentScrollY < TOP_FORCE_VISIBLE) {
          setIsVisible(true);
        } else if (diff > SCROLL_THRESHOLD) {
          // Scroll dole — schovaj
          setIsVisible(false);
        } else if (diff < -SCROLL_THRESHOLD) {
          // Scroll hore — ukáž
          setIsVisible(true);
        }

        lastScrollY.current = currentScrollY;
        ticking = false;
      });
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'md:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-sidebar/95 backdrop-blur-sm border-b border-sidebar-border flex items-center justify-between px-4 pl-16',
        'transition-transform duration-200 ease-out',
        isVisible ? 'translate-y-0' : '-translate-y-full'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary glow-primary">
          <Sprout className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-sidebar-foreground">{t('app.name')}</span>
      </div>
      <NotificationCenter />
    </header>
  );
}
