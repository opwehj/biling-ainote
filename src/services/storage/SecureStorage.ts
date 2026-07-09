import AsyncStorage from '@react-native-async-storage/async-storage';
import { SECURE_KEY } from '../../types/ai';
import logger from '../../utils/logger';

export class SecureStorage {
  static async getApiKey(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`secure_${key}`);
    } catch (err) {
      logger.error('Storage.getApiKey failed', err);
      return null;
    }
  }
  static async setApiKey(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`secure_${key}`, value);
    } catch (err) {
      logger.error('Storage.setApiKey failed', err);
      throw err;
    }
  }
  static async deleteApiKey(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`secure_${key}`);
    } catch (err) {
      logger.error('Storage.deleteApiKey failed', err);
    }
  }
  static async getLlmKey(): Promise<string | null> { return this.getApiKey(SECURE_KEY.LLM_API_KEY); }
  static async setLlmKey(value: string): Promise<void> { return this.setApiKey(SECURE_KEY.LLM_API_KEY, value); }
  static async getAsrKey(): Promise<string | null> { return this.getApiKey(SECURE_KEY.ASR_API_KEY); }
  static async setAsrKey(value: string): Promise<void> { return this.setApiKey(SECURE_KEY.ASR_API_KEY, value); }
  static async deleteLlmKey(): Promise<void> { return this.deleteApiKey(SECURE_KEY.LLM_API_KEY); }
  static async deleteAsrKey(): Promise<void> { return this.deleteApiKey(SECURE_KEY.ASR_API_KEY); }
  static async isAvailable(): Promise<boolean> { return true; }
}
export default SecureStorage;
