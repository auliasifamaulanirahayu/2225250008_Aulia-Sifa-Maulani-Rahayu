// Penyimpanan lokal IndexedDB dengan cadangan memori bila IndexedDB tidak tersedia (mis. mode privat).

import { openDB } from 'idb';

const DB_NAME = 'math-mission';
const VERSION = 1;
const STORES = {
  kv: null, // profile, stats, settings, teacher, teamCache
  progress: 'id',
  daily: 'day',
  outbox: 'client_id',
};

const memory = Object.fromEntries(Object.keys(STORES).map((s) => [s, new Map()]));
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = (typeof indexedDB === 'undefined'
      ? Promise.resolve(null)
      : openDB(DB_NAME, VERSION, {
          upgrade(db) {
            for (const [name, keyPath] of Object.entries(STORES)) {
              if (!db.objectStoreNames.contains(name)) {
                db.createObjectStore(name, keyPath ? { keyPath } : undefined);
              }
            }
          },
        })
    ).catch(() => null);
  }
  return dbPromise;
}

const memKey = (store, value, key) => key ?? value[STORES[store]];

export async function get(store, key) {
  const db = await open();
  if (db) {
    try {
      return await db.get(store, key);
    } catch {
      /* jatuh ke memori */
    }
  }
  return memory[store].get(key);
}

export async function getAll(store) {
  const db = await open();
  if (db) {
    try {
      return await db.getAll(store);
    } catch {
      /* jatuh ke memori */
    }
  }
  return [...memory[store].values()];
}

export async function put(store, value, key) {
  const plain = JSON.parse(JSON.stringify(value)); // pastikan bisa disimpan (tanpa class/Fraction)
  memory[store].set(memKey(store, plain, key), plain);
  const db = await open();
  if (!db) return;
  try {
    if (STORES[store]) await db.put(store, plain);
    else await db.put(store, plain, key);
  } catch {
    /* tetap tersimpan di memori */
  }
}

export async function del(store, key) {
  memory[store].delete(key);
  const db = await open();
  if (!db) return;
  try {
    await db.delete(store, key);
  } catch {
    /* abaikan */
  }
}

export async function clearAll() {
  for (const s of Object.keys(STORES)) memory[s].clear();
  const db = await open();
  if (!db) return;
  for (const s of Object.keys(STORES)) {
    try {
      await db.clear(s);
    } catch {
      /* abaikan */
    }
  }
}

export async function count(store) {
  const db = await open();
  if (db) {
    try {
      return await db.count(store);
    } catch {
      /* jatuh ke memori */
    }
  }
  return memory[store].size;
}
