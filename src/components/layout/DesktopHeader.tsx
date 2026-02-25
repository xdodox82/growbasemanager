import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Menu } from 'lucide-react';

interface DesktopHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function DesktopHeader({ sidebarOpen, setSidebarOpen }: DesktopHeaderProps) {
  return (
    <div className="hidden md:flex fixed top-4 left-4 right-8 z-40 justify-between items-center">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors bg-white shadow-sm border border-gray-200"
        aria-label="Toggle sidebar"
        title={sidebarOpen ? "Skryť menu" : "Zobraziť menu"}
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>
      <NotificationCenter />
    </div>
  );
}