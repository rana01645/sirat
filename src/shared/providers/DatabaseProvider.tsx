// src/shared/providers/DatabaseProvider.tsx
// Provides SQLite database context to the app tree.
// Uses pre-built quran.db asset — no runtime seeding needed.

import React, { createContext, useContext } from 'react';
import { View, Text } from 'react-native';
import { useDatabase } from '@/src/shared/hooks/useDatabase';
import { SplashSeeder } from '@/src/shared/components/SplashSeeder';
import type * as SQLite from 'expo-sqlite';

interface DatabaseContextValue {
  db: SQLite.SQLiteDatabase;
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
