import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ShieldOff } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#16a34a]" />
          <p className="text-[#64748b] text-sm font-medium">Načítavam...</p>
        </div>
      </div>
    );
  }

  // Nie je prihlásený → login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Prihlásený ale nemá rolu → nemá prístup do GrowBase
  // (PWA zákazníci, neoverení používatelia)
  if (userRole === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center">
            <ShieldOff className="h-8 w-8 text-[#dc2626]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0f172a] mb-1">Prístup zamietnutý</h2>
            <p className="text-sm text-[#64748b]">
              Tento systém je určený len pre autorizovaných pracovníkov. 
              Kontaktujte správcu pre pridelenie prístupu.
            </p>
          </div>
          <button
            onClick={async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.auth.signOut();
              window.location.href = '/auth';
            }}
            className="h-9 px-6 rounded-xl bg-[#0f172a] text-white text-sm font-semibold hover:bg-[#1e293b] transition-colors"
          >
            Odhlásiť sa
          </button>
        </div>
      </div>
    );
  }

  // Vyžaduje admin ale je len worker
  if (requireAdmin && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#fff7ed] border border-[#fed7aa] flex items-center justify-center">
            <ShieldOff className="h-8 w-8 text-[#d97706]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0f172a] mb-1">Nedostatočné oprávnenia</h2>
            <p className="text-sm text-[#64748b]">
              Táto sekcia vyžaduje administrátorský prístup.
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="h-9 px-6 rounded-xl bg-[#0f172a] text-white text-sm font-semibold hover:bg-[#1e293b] transition-colors"
          >
            Späť
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
