// src/shared/hooks/useDatabase.ts
// Hook to initialize and provide the SQLite database

import { useEffect, useState } from 'react';
import { getDatabase } from '@/src/shared/lib/database';
import type * as SQLite from 'expo-sqlite';

interface UseDatabaseResult {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
  error: Error | null;
}

export function useDatabase(): UseDatabaseResult {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const database = await getDatabase();
        if (!cancelled) {
          setDb(database);
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return { db, isReady, error };
}
