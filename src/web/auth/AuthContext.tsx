import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Session, User } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/constants';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        setIsLoading(true);
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Auth error'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        setUser(newSession?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    error,
    signUp: async (email: string, password: string) => {
      try {
        setError(null);
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign up failed');
        setError(error);
        throw error;
      }
    },
    signIn: async (email: string, password: string) => {
      try {
        setError(null);
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign in failed');
        setError(error);
        throw error;
      }
    },
    signOut: async () => {
      try {
        setError(null);
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign out failed');
        setError(error);
        throw error;
      }
    },
    resetPassword: async (email: string) => {
      try {
        setError(null);
        // Send the user back to THIS origin's /reset-password route (so the
        // link works in prod, not just localhost). The target must also be in
        // the Supabase Auth "Redirect URLs" allowlist, else Supabase falls back
        // to the project Site URL.
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: `${window.location.origin}/reset-password` },
        );
        if (resetError) throw resetError;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Reset failed');
        setError(error);
        throw error;
      }
    },
    updatePassword: async (newPassword: string) => {
      try {
        setError(null);
        // The recovery link establishes a temporary session (supabase-js parses
        // the URL hash on load), so updateUser applies to the recovering user.
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) throw updateError;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Password update failed');
        setError(error);
        throw error;
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { supabase };
