import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export function DesktopHeader() {
  return (
    <div className="hidden md:flex fixed top-4 right-8 z-40">
      <NotificationCenter />
    </div>
  );
}