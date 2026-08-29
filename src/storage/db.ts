/**
 * db.ts
 *
 * IndexedDB wrapper for everything that needs to survive offline/across
 * sessions per the app's "no account required" / offline-first
 * requirements: saved worlds, waypoints, search history. Kept as a thin
 * typed layer over the raw IndexedDB API rather than pulling in a
 * dependency — the data model here is simple enough not to need one,
 * and it keeps the offline bundle smaller.
 */

const DB_NAME = 'ore-finder';
const DB_VERSION = 1;

export interface SavedWorld {
  id: string;
  name: string;
  seed: string; // stored as string (user's original input) — parsed to bigint at use time
  edition: 'java' | 'bedrock';
  version: string;
  dimension: string;
  lastPlayerX: number;
  lastPlayerY: number;
  lastPlayerZ: number;
  lastMapCenterX: number;
  lastMapCenterZ: number;
  lastZoom: number;
  createdAt: number;
  updatedAt: number;
}

export interface Waypoint {
  id: string;
  worldId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  favorite: boolean;
  createdAt: number;
}

export interface SearchHistoryEntry {
  id: string;
  worldId: string;
  oreType: string;
  centerX: number;
  centerZ: number;
  radius: number;
  resultCount: number;
  timestamp: number;
}

const STORES = {
  worlds: 'worlds',
  waypoints: 'waypoints',
  history: 'history',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.worlds)) {
        db.createObjectStore(STORES.worlds, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.waypoints)) {
        const store = db.createObjectStore(STORES.waypoints, { keyPath: 'id' });
        store.createIndex('worldId', 'worldId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.history)) {
        const store = db.createObjectStore(STORES.history, { keyPath: 'id' });
        store.createIndex('worldId', 'worldId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

function txAll<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T[]>): Promise<T[]> {
  return tx(storeName, mode, fn);
}

// ---- Worlds ----

export function saveWorld(world: SavedWorld): Promise<void> {
  return tx(STORES.worlds, 'readwrite', (store) => store.put(world)).then(() => undefined);
}

export function getAllWorlds(): Promise<SavedWorld[]> {
  return txAll(STORES.worlds, 'readonly', (store) => store.getAll());
}

export function deleteWorld(id: string): Promise<void> {
  return tx(STORES.worlds, 'readwrite', (store) => store.delete(id)).then(() => undefined);
}

// ---- Waypoints ----

export function saveWaypoint(waypoint: Waypoint): Promise<void> {
  return tx(STORES.waypoints, 'readwrite', (store) => store.put(waypoint)).then(() => undefined);
}

export function getWaypointsForWorld(worldId: string): Promise<Waypoint[]> {
  return openDb().then(
    (db) =>
      new Promise<Waypoint[]>((resolve, reject) => {
        const transaction = db.transaction(STORES.waypoints, 'readonly');
        const index = transaction.objectStore(STORES.waypoints).index('worldId');
        const request = index.getAll(worldId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

export function deleteWaypoint(id: string): Promise<void> {
  return tx(STORES.waypoints, 'readwrite', (store) => store.delete(id)).then(() => undefined);
}

// ---- Search history ----

const MAX_HISTORY_PER_WORLD = 50;

export async function addHistoryEntry(entry: SearchHistoryEntry): Promise<void> {
  await tx(STORES.history, 'readwrite', (store) => store.put(entry));

  // Trim old entries so history doesn't grow unbounded in offline storage.
  const all = await getHistoryForWorld(entry.worldId);
  if (all.length > MAX_HISTORY_PER_WORLD) {
    const toDelete = all.sort((a, b) => a.timestamp - b.timestamp).slice(0, all.length - MAX_HISTORY_PER_WORLD);
    const db = await openDb();
    const transaction = db.transaction(STORES.history, 'readwrite');
    const store = transaction.objectStore(STORES.history);
    for (const entry of toDelete) store.delete(entry.id);
  }
}

export function getHistoryForWorld(worldId: string): Promise<SearchHistoryEntry[]> {
  return openDb().then(
    (db) =>
      new Promise<SearchHistoryEntry[]>((resolve, reject) => {
        const transaction = db.transaction(STORES.history, 'readonly');
        const index = transaction.objectStore(STORES.history).index('worldId');
        const request = index.getAll(worldId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

// ---- CSV export (requirement #29) ----

export function oresToCsv(ores: { x: number; y: number; z: number; oreId: string }[]): string {
  const header = 'ore,x,y,z';
  const rows = ores.map((o) => `${o.oreId},${o.x},${o.y},${o.z}`);
  return [header, ...rows].join('\n');
}
