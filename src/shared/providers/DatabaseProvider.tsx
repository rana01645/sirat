// src/shared/providers/DatabaseProvider.tsx
// Provides SQLite database context to the app tree.
// Uses pre-built quran.db asset — no runtime seeding needed.

import React, { createContext, useContext } from 'react';
import { View, Text, Platform, Linking, TouchableOpacity } from 'react-native';
import { useDatabase } from '@/src/shared/hooks/useDatabase';
import { SplashSeeder } from '@/src/shared/components/SplashSeeder';
import type { AppDatabase } from '@/src/shared/lib/database';

interface DatabaseContextValue {
  db: AppDatabase;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function useDatabaseContext(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
}

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const { db, isReady, error } = useDatabase();

  // expo-sqlite on web requires HTTPS (OPFS needs secure context)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
    const httpsUrl = window.location.href.replace('http:', 'https:');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F14', padding: 30 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🕌</Text>
        <Text style={{ color: '#E8D5B0', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
          সিরাত — صراط
        </Text>
        <Text style={{ color: '#9A8B7A', fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
          এই অ্যাপটি চালাতে নিরাপদ সংযোগ (HTTPS) প্রয়োজন।{'\n'}
          Please use HTTPS to access this app.
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openURL(httpsUrl)}
          style={{ backgroundColor: '#9A6B2F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#FFF', fontSize: 16 }}>Open with HTTPS →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#9A6B2F', textAlign: 'center', padding: 20 }}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!isReady || !db) {
    return <SplashSeeder />;
  }

  return (
    <DatabaseContext.Provider value={{ db }}>
      {children}
    </DatabaseContext.Provider>
  );
}
