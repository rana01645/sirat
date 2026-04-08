// src/shared/lib/web-database.ts
// sql.js-based SQLite for web — replaces expo-sqlite's broken OPFS approach.
// Persists to IndexedDB so data survives page reloads.

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

const IDB_NAME = 'sirat_sqljs';
const IDB_STORE = 'databases';

// ── IndexedDB helpers ──────────────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB(key: string): Promise<Uint8Array | null> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => idb.close();
  });
}

async function saveToIDB(key: string, data: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(data, key);
    tx.oncomplete = () => { idb.close(); resolve(); };
    tx.onerror = () => { idb.close(); reject(tx.error); };
  });
}

async function deleteFromIDB(key: string): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.delete(key);
    tx.oncomplete = () => { idb.close(); resolve(); };
    tx.onerror = () => { idb.close(); reject(tx.error); };
  });
}

// ── Debounced persist ──────────────────────────────────────────────

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(sqlDb: SqlJsDatabase, dbName: string) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const data = sqlDb.export();
    saveToIDB(dbName, data).catch(e => console.warn('[WebDB] persist error:', e));
  }, 500);
}

// ── WebSQLiteDatabase — same interface as expo-sqlite ──────────────

export interface SQLiteRunResult {
  changes: number;
  lastInsertRowId: number;
}

export class WebSQLiteDatabase {
  private sqlDb: SqlJsDatabase;
  private dbName: string;

  constructor(sqlDb: SqlJsDatabase, dbName: string) {
    this.sqlDb = sqlDb;
    this.dbName = dbName;
  }

  /** Execute raw SQL (no results). Supports multiple statements separated by `;` */
  async execAsync(sql: string): Promise<void> {
    this.sqlDb.run(sql);
    schedulePersist(this.sqlDb, this.dbName);
  }

  /** Run a single statement with params. Returns changes + lastInsertRowId. */
  async runAsync(sql: string, ...params: unknown[]): Promise<SQLiteRunResult> {
    // Flatten if first arg is an array (expo-sqlite accepts both styles)
    const flatParams = (params.length === 1 && Array.isArray(params[0]))
      ? params[0]
      : params;
    this.sqlDb.run(sql, flatParams as (string | number | null | Uint8Array)[]);
    const changesRow = this.sqlDb.exec('SELECT changes() as c, last_insert_rowid() as r');
    const changes = changesRow[0]?.values[0]?.[0] as number ?? 0;
    const lastInsertRowId = changesRow[0]?.values[0]?.[1] as number ?? 0;
    schedulePersist(this.sqlDb, this.dbName);
    return { changes, lastInsertRowId };
  }

  /** Get all rows matching a query. */
  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const flatParams = (params.length === 1 && Array.isArray(params[0]))
      ? params[0]
      : params;
    const stmt = this.sqlDb.prepare(sql);
    stmt.bind(flatParams as (string | number | null | Uint8Array)[]);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return rows;
  }

  /** Get first row matching a query, or null. */
  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const flatParams = (params.length === 1 && Array.isArray(params[0]))
      ? params[0]
      : params;
    const stmt = this.sqlDb.prepare(sql);
    stmt.bind(flatParams as (string | number | null | Uint8Array)[]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as T;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  /** Run callback inside a transaction. */
  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    this.sqlDb.run('BEGIN TRANSACTION');
    try {
      await callback();
      this.sqlDb.run('COMMIT');
      schedulePersist(this.sqlDb, this.dbName);
    } catch (err) {
      this.sqlDb.run('ROLLBACK');
      throw err;
    }
  }

  /** Close the database and persist final state. */
  async closeAsync(): Promise<void> {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const data = this.sqlDb.export();
    await saveToIDB(this.dbName, data);
    this.sqlDb.close();
  }
}

// ── Factory ────────────────────────────────────────────────────────

let sqlPromise: Promise<typeof import('sql.js').default extends (...args: infer _A) => infer R ? Awaited<R> : never> | null = null;

async function getSqlJs() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      // Host WASM locally to avoid CDN/MIME issues
      locateFile: () => '/sql-wasm.wasm',
    });
  }
  return sqlPromise;
}

export async function openWebDatabase(dbName: string): Promise<WebSQLiteDatabase> {
  const SQL = await getSqlJs();

  // Try to load existing DB from IndexedDB
  const existingData = await loadFromIDB(dbName);
  const sqlDb = existingData ? new SQL.Database(existingData) : new SQL.Database();

  return new WebSQLiteDatabase(sqlDb, dbName);
}

export async function deleteWebDatabase(dbName: string): Promise<void> {
  await deleteFromIDB(dbName);
}
