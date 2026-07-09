import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AISetting } from '../../types';
import { DEFAULT_AI_SETTING } from '../../constants/config';
import logger from '../../utils/logger';
const KEY = 'biling_settings';
export class SettingsRepository {
  async get(): Promise<AISetting> {
    try { const raw = await AsyncStorage.getItem(KEY); return raw ? { ...DEFAULT_AI_SETTING, ...JSON.parse(raw) } : { ...DEFAULT_AI_SETTING }; }
    catch { return { ...DEFAULT_AI_SETTING }; }
  }
  async save(setting: AISetting): Promise<void> {
    try { await AsyncStorage.setItem(KEY, JSON.stringify(setting)); }
    catch (err) { logger.error('SettingsRepository.save failed', err); }
  }
}
export const settingsRepository = new SettingsRepository();
