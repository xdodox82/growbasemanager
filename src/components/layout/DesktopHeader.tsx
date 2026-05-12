import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

export function DesktopHeader() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="hidden md:flex fixed top-4 right-6 z-40 items-center gap-2">
      <button
        onClick={toggleTheme}
        className="w-9 h-9 rounded-xl border border-[#e2e8f0] bg-white flex items-center justify-center text-[#475569] hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-colors shadow-sm"
        title={isDarkMode ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
      >
        {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <NotificationCenter />
    </div>
  );
}
