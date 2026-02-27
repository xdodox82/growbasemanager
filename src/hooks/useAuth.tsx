import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'worker';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as AppRole | null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            // Defer role fetching with setTimeout to avoid deadlock
            if (session?.user) {
              setTimeout(() => {
                fetchUserRole(session.user.id).then((role) => {
                  if (mounted) setUserRole(role);
                });
              }, 0);
            } else {
              setUserRole(null);
            }
          }
        );

        // THEN check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) setLoading(false);
          return () => subscription.unsubscribe();
        }

        if (!mounted) return () => subscription.unsubscribe();

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (mounted) {
            setUserRole(role);
            setLoading(false);
          }
        } else {
          if (mounted) setLoading(false);
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) setLoading(false);
      }
    };

    const cleanup = initAuth();

    return () => {
      mounted = false;
      cleanup.then(unsub => unsub?.());
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Track login if successful
    if (!error && data.user) {
      supabase.functions.invoke('track-login', {
        body: {
          user_id: data.user.id,
          user_agent: navigator.userAgent,
        },
      }).catch(console.error);
    }
    
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        isAdmin: userRole === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
