import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { API_URL } from '../config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLocalDev: boolean;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A helper to detect if Supabase is unconfigured (placeholder variables)
const isSupabasePlaceholder = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return (
    !url || 
    !key || 
    url.includes('placeholder') || 
    key.includes('placeholder') ||
    url.includes('your_supabase') || 
    key.includes('your_supabase') ||
    url.includes('your-project-id') ||
    key.includes('your-anon-key')
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isLocalDev = isSupabasePlaceholder();

  useEffect(() => {
    if (isLocalDev) {
      // Mock user for local development without Supabase keys
      setUser({
        id: 'local-dev-user-id',
        email: 'dev@preptracker.local',
        user_metadata: { full_name: 'Developer Profile' }
      } as any);
      setLoading(false);
      return;
    }

    // Initialize session and listen to changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const result = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      result.data?.subscription?.unsubscribe();
    };
  }, [isLocalDev]);



  // Monkeypatch the global fetch to inject Supabase access token in API headers
  useEffect(() => {
    if (isLocalDev) return;

    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      
      // Inject bearer token only for backend API requests
      if (url.startsWith(API_URL)) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (token) {
            init = init || {};
            const headers = new Headers(init.headers || {});
            headers.set('Authorization', `Bearer ${token}`);
            init.headers = headers;
          }
        } catch (err) {
          console.error('[Global Fetch Interceptor] Token retrieval failed:', err);
        }
      }
      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch; // restore original on unmount
    };
  }, [isLocalDev]);

  const logout = async () => {
    if (isLocalDev) return;
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (isLocalDev) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, isLocalDev, logout, resetPassword }}>
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
