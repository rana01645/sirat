// src/shared/hooks/useDatabase.ts
// Hook to initialize and provide the SQLite database

import { useEffect, useState } from 'react';
import { getDatabase, type AppDatabase } from '@/src/shared/lib/database';

interface UseDatabaseResult {
  db: AppDatabase | null;
  isReady: boolean;
  error: Error | null;
}

export function useDatabase(): UseDatabaseResult {
  const [db, setDb] = useState<AppDatabase | null>(null);
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
