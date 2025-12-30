import { LayerData } from '../types';
import { generateThumbnail } from './thumbnailService';

const DB_NAME = 'gemini-canvas-db';
const DB_VERSION = 2;
const LAYERS_STORE = 'layers';
const STATE_STORE = 'canvasState';

const MAX_HISTORY_STATES = 20;

let dbInstance: IDBDatabase | null = null;

function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(LAYERS_STORE)) {
        db.createObjectStore(LAYERS_STORE);
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE);
      }
    };
  });
}

export async function saveLayers(layers: LayerData[]): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LAYERS_STORE, 'readwrite');
      const store = tx.objectStore(LAYERS_STORE);
      store.put(layers, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to save layers:', error);
  }
}

export async function loadLayers(): Promise<LayerData[] | null> {
  try {
    const db = await initDB();
    const layers = await new Promise<LayerData[] | null>((resolve, reject) => {
      const tx = db.transaction(LAYERS_STORE, 'readonly');
      const store = tx.objectStore(LAYERS_STORE);
      const request = store.get('current');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!layers) return null;

    // Migrate layers without thumbnails (backward compatibility)
    let needsSave = false;
    const migratedLayers = await Promise.all(
      layers.map(async (layer) => {
        if (layer.type === 'image' && layer.src && !layer.thumbnail) {
          try {
            const thumbnail = await generateThumbnail(layer.src);
            needsSave = true;
            return { ...layer, thumbnail };
          } catch (e) {
            console.warn('Failed to generate thumbnail for layer', layer.id, e);
            return layer;
          }
        }
        return layer;
      })
    );

    // Save migrated layers back if any were updated
    if (needsSave) {
      await saveLayers(migratedLayers);
    }

    return migratedLayers;
  } catch (error) {
    console.error('Failed to load layers:', error);
    return null;
  }
}

export async function saveViewState(
  offset: { x: number; y: number },
  scale: number
): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, 'readwrite');
      const store = tx.objectStore(STATE_STORE);
      store.put({ offset, scale }, 'viewState');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to save view state:', error);
  }
}

export async function loadViewState(): Promise<{
  offset: { x: number; y: number };
  scale: number;
} | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, 'readonly');
      const store = tx.objectStore(STATE_STORE);
      const request = store.get('viewState');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load view state:', error);
    return null;
  }
}

export async function saveHistory(
  history: LayerData[][],
  historyIndex: number
): Promise<void> {
  try {
    const db = await initDB();
    // Limit history to last MAX_HISTORY_STATES states to prevent unbounded growth
    const trimmedHistory = history.slice(-MAX_HISTORY_STATES);
    const adjustedIndex = Math.max(0, historyIndex - (history.length - trimmedHistory.length));

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, 'readwrite');
      const store = tx.objectStore(STATE_STORE);
      store.put({ history: trimmedHistory, index: adjustedIndex }, 'history');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

export async function loadHistory(): Promise<{
  history: LayerData[][];
  index: number;
} | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, 'readonly');
      const store = tx.objectStore(STATE_STORE);
      const request = store.get('history');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load history:', error);
    return null;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([LAYERS_STORE, STATE_STORE], 'readwrite');
      tx.objectStore(LAYERS_STORE).clear();
      tx.objectStore(STATE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
}
