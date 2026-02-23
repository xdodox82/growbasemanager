import { Sprout } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useLanguage } from '@/i18n/LanguageContext';

export function MobileHeader() {
  const { t } = useLanguage();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-sidebar/95 backdrop-blur-sm border-b border-sidebar-border flex items-center justify-between px-4 pl-16">
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