// src/shared/providers/AuthProvider.tsx
// Listens to Supabase auth state changes and syncs with userStore.

import React, { useEffect, createContext, useContext, useState, type ReactNode } from 'react';
import { supabase } from '@/src/shared/lib/supabase';
import { useUserStore } from '@/src/shared/stores/userStore';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const setAuth = useUserStore((s) => s.setAuth);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuth(s?.user?.id ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuth(s?.user?.id ?? null);
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

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signUp, signIn, signOut }}>
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
