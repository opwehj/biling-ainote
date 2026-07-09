import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../../utils/logger';

const DB_KEY = 'biling_db';
let initialized = false;

export async function initDatabase(): Promise<void> {
  if (initialized) return;
  try {
    await AsyncStorage.getItem(DB_KEY);
    initialized = true;
    logger.info('Database initialized');
  } catch (err) {
    logger.error('Database init failed', err);
    throw err;
  }
}

export async function getData<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${DB_KEY}_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function setData<T>(key: string, value: T): Promise<void> {
  try { await AsyncStorage.setItem(`${DB_KEY}_${key}`, JSON.stringify(value)); }
  catch (err) { logger.error('setData failed', err); }
}

export async function removeData(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(`${DB_KEY}_${key}`); }
  catch (err) { logger.error('removeData failed', err); }
}

export async function getAllKeys(): Promise<string[]> {
  try {
    const all = await AsyncStorage.getAllKeys();
    return all.filter(k => k.startsWith(DB_KEY)).map(k => k.replace(`${DB_KEY}_`, ''));
  } catch { return []; }
}

export async function clearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const dbKeys = keys.filter(k => k.startsWith(DB_KEY));
    if (dbKeys.length > 0) await AsyncStorage.multiRemove(dbKeys);
  } catch (err) { logger.error('clearAll failed', err); }
}
