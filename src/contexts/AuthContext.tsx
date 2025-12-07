import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase';

type UserData = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: SupabaseUser | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setUserData(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('User account exists but no profile found. Please contact support.');
        setUserData(null);
      } else {
        // Check if user account is inactive
        if (!data.active) {
          console.warn('⚠️ [Auth] Inactive user attempted to access app:', data.email);
          setError('Your account is inactive. Please contact the shop owner.');
          setUserData(null);
          // Sign out inactive users immediately
          await supabase.auth.signOut();
          return;
        }

        setUserData(data);
        setError(null);

        // Check if JWT has role in app_metadata, if not, refresh the session
        const { data: { session } } = await supabase.auth.getSession();
        const jwtRole = session?.user?.app_metadata?.role;

        if (data.role && !jwtRole) {
          console.log('JWT missing role in app_metadata, refreshing session...');
          await supabase.auth.refreshSession();
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user profile');
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Check if the user account is active
    if (authData.user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('active')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error checking user status:', userError);
      }

      if (userData && !userData.active) {
        // Sign out immediately and throw error
        await supabase.auth.signOut();
        throw new Error('Your account is inactive. Please contact the shop owner.');
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
