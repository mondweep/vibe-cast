import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../../shared/lib/supabaseClient';
import * as authService from '../services/supabaseAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /**
   * Whether the signed-in user is a curator. Fetched from Supabase via the
   * `am_i_curator` RPC after sign-in. Null while the fetch is in flight, so
   * UI can show a non-curator default until the answer arrives. False for
   * signed-out users.
   */
  isCurator: boolean | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCurator, setIsCurator] = useState<boolean | null>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // After sign-in, fire-and-forget a profile-track call so the server
      // can capture the user's IP + IP-derived geo into the profiles row.
      // Idempotent on subsequent sign-ins — just updates the same fields.
      if (session?.access_token) {
        fetch('/api/profile/track', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => {
          // Best-effort. Geo tracking never blocks sign-in.
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Whenever the user changes, ask Supabase whether they're a curator.
  // Uses the SECURITY DEFINER RPC `am_i_curator` (introduced in
  // migration 013) so we don't have to read the full allowlist table.
  // Falls back to false if the RPC errors (older databases without the
  // function or RLS misconfiguration).
  useEffect(() => {
    if (!user) {
      setIsCurator(false);
      return;
    }
    let cancelled = false;
    setIsCurator(null); // "in flight"
    (async () => {
      try {
        const { data, error } = await supabase.rpc('am_i_curator');
        if (cancelled) return;
        if (error) {
          console.warn('[auth] am_i_curator RPC failed:', error.message);
          setIsCurator(false);
        } else {
          setIsCurator(Boolean(data));
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[auth] am_i_curator threw:', err);
          setIsCurator(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signUp = async (email: string, password: string) => {
    await authService.signUpWithEmail(email, password);
  };

  const signIn = async (email: string, password: string) => {
    await authService.signInWithEmail(email, password);
  };

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const signOut = async () => {
    await authService.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isCurator, signUp, signIn, signInWithGoogle, signOut }}>
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
