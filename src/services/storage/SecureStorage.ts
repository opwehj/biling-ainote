/**
 * @file services/storage/SecureStorage.ts
 * @description API Key 加密存储封装。基于 expo-secure-store。
 *              iOS Keychain / Android EncryptedSharedPreferences，敏感密钥不落 SQLite。
 */

import * as SecureStore from 'expo-secure-store';
import { SECURE_KEY } from '../../types/ai';
import logger from '../../utils/logger';

/**
 * 安全存储服务（API Key）。
 */
export class SecureStorage {
  /**
   * 读取 API Key。
   * @param key SecureStore 键名
   * @returns 密钥字符串，不存在时返回 null
   */
  static async getApiKey(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value ?? null;
    } catch (err) {
      logger.error('SecureStorage.getApiKey failed', err);
      return null;
    }
  }

  /**
   * 保存 API Key。
   * @param key SecureStore 键名
   * @param value 密钥
   */
  static async setApiKey(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
        requireAuthentication: false,
      });
      logger.debug('API key saved:', key);
    } catch (err) {
      logger.error('SecureStorage.setApiKey failed', err);
      throw err;
    }
  }

  /**
   * 删除 API Key。
   */
  static async deleteApiKey(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      logger.debug('API key deleted:', key);
    } catch (err) {
      logger.error('SecureStorage.deleteApiKey failed', err);
    }
  }

  /** 便捷：读取 LLM Key */
  static async getLlmKey(): Promise<string | null> {
    return this.getApiKey(SECURE_KEY.LLM_API_KEY);
  }

  /** 便捷：保存 LLM Key */
  static async setLlmKey(value: string): Promise<void> {
    return this.setApiKey(SECURE_KEY.LLM_API_KEY, value);
  }

  /** 便捷：读取 ASR Key */
  static async getAsrKey(): Promise<string | null> {
    return this.getApiKey(SECURE_KEY.ASR_API_KEY);
  }

  /** 便捷：保存 ASR Key */
  static async setAsrKey(value: string): Promise<void> {
    return this.setApiKey(SECURE_KEY.ASR_API_KEY, value);
  }

  /** 便捷：删除 LLM Key */
  static async deleteLlmKey(): Promise<void> {
    return this.deleteApiKey(SECURE_KEY.LLM_API_KEY);
  }

  /** 便捷：删除 ASR Key */
  static async deleteAsrKey(): Promise<void> {
    return this.deleteApiKey(SECURE_KEY.ASR_API_KEY);
  }

  /**
   * 检测设备是否支持 SecureStore。
   */
  static async isAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }
}

export default SecureStorage;
