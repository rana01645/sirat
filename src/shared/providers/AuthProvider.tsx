// src/shared/providers/AuthProvider.tsx
// Listens to Supabase auth state changes and syncs with userStore.

import React, { useEffect, createContext, useContext, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/src/shared/lib/supabase';
import { useUserStore } from '@/src/shared/stores/userStore';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isRecovery: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  clearRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  isRecovery: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  updatePassword: async () => ({ error: null }),
  clearRecovery: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const setAuth = useUserStore((s) => s.setAuth);

  useEffect(() => {
    // On web, handle hash tokens from Supabase email redirects
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // Supabase will pick this up via detectSessionInUrl or we handle manually
        const params = new URLSearchParams(hash.substring(1));
        const type = params.get('type');
        if (type === 'recovery') {
          setIsRecovery(true);
        }
        // Clean the URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuth(s?.user?.id ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setAuth(s?.user?.id ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [setAuth]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: translateError(error.message) };
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translateError(error.message) };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: translateError(error.message) };
    setIsRecovery(false);
    return { error: null };
  };

  const clearRecovery = () => setIsRecovery(false);

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, loading, isRecovery,
      signUp, signIn, signOut, updatePassword, clearRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'ইমেইল বা পাসওয়ার্ড ভুল';
  if (msg.includes('User already registered')) return 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে';
  if (msg.includes('Password should be at least')) return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে';
  if (msg.includes('Unable to validate email')) return 'সঠিক ইমেইল দিন';
  if (msg.includes('Email rate limit exceeded')) return 'অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর চেষ্টা করুন';
  return msg;
}
