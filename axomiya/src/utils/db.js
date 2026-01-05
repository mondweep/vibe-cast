import { openDB } from 'idb';

const DB_NAME = 'axomiya-db';
const DB_VERSION = 1;
const TRANSLATIONS_STORE = 'translations';
const USAGE_STORE = 'usage';

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for cached translations
      if (!db.objectStoreNames.contains(TRANSLATIONS_STORE)) {
        const translationsStore = db.createObjectStore(TRANSLATIONS_STORE, {
          keyPath: 'id',
        });
        translationsStore.createIndex('english', 'english', { unique: false });
        translationsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Store for usage tracking (character count)
      if (!db.objectStoreNames.contains(USAGE_STORE)) {
        db.createObjectStore(USAGE_STORE, { keyPath: 'month' });
      }
    },
  });
}

// Translation cache functions
export async function getCachedTranslation(englishText) {
  const db = await initDB();
  const normalizedText = englishText.toLowerCase().trim();
  const tx = db.transaction(TRANSLATIONS_STORE, 'readonly');
  const store = tx.objectStore(TRANSLATIONS_STORE);
  const index = store.index('english');
  const result = await index.get(normalizedText);
  await tx.done;
  return result;
}

export async function cacheTranslation(englishText, assameseText, phonetic) {
  const db = await initDB();
  const normalizedText = englishText.toLowerCase().trim();
  const id = btoa(normalizedText).replace(/[^a-zA-Z0-9]/g, '');

  const translation = {
    id,
    english: normalizedText,
    englishOriginal: englishText,
    assamese: assameseText,
    phonetic,
    timestamp: Date.now(),
  };

  const tx = db.transaction(TRANSLATIONS_STORE, 'readwrite');
  await tx.objectStore(TRANSLATIONS_STORE).put(translation);
  await tx.done;

  return translation;
}

export async function getRecentTranslations(limit = 10) {
  const db = await initDB();
  const tx = db.transaction(TRANSLATIONS_STORE, 'readonly');
  const store = tx.objectStore(TRANSLATIONS_STORE);
  const index = store.index('timestamp');

  const all = await index.getAll();
  await tx.done;

  // Sort by timestamp descending and return limited results
  return all
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export async function clearTranslationCache() {
  const db = await initDB();
  const tx = db.transaction(TRANSLATIONS_STORE, 'readwrite');
  await tx.objectStore(TRANSLATIONS_STORE).clear();
  await tx.done;
}

// Usage tracking functions
export async function getMonthlyUsage() {
  const db = await initDB();
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const tx = db.transaction(USAGE_STORE, 'readonly');
  const result = await tx.objectStore(USAGE_STORE).get(currentMonth);
  await tx.done;
  return result?.characters || 0;
}

export async function incrementUsage(characters) {
  const db = await initDB();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const tx = db.transaction(USAGE_STORE, 'readwrite');
  const store = tx.objectStore(USAGE_STORE);

  const existing = await store.get(currentMonth);
  const newCount = (existing?.characters || 0) + characters;

  await store.put({ month: currentMonth, characters: newCount });
  await tx.done;

  return newCount;
}

export async function resetMonthlyUsage() {
  const db = await initDB();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const tx = db.transaction(USAGE_STORE, 'readwrite');
  await tx.objectStore(USAGE_STORE).put({ month: currentMonth, characters: 0 });
  await tx.done;
}
