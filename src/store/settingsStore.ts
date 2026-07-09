/**
 * @file store/settingsStore.ts
 * @description 设置状态管理：AI 设置、主题、排序偏好、API Key 管理。
 *              非敏感配置落 SQLite，密钥存 SecureStore。
 */

import { create } from 'zustand';
import type { AISetting, LLMProviderId, ThemeMode, SortOrder, AppError } from '../types';
import { settingsRepository } from '../services/db/SettingsRepository';
import { SecureStorage } from '../services/storage/SecureStorage';
import { ProviderFactory } from '../services/ai/ProviderFactory';
import { DEFAULT_AI_SETTING, INPUT_LIMITS } from '../constants/config';
import { createAppError } from '../services/ai/httpClient';
import logger from '../utils/logger';

interface SettingsState {
  setting: AISetting;
  llmApiKey: string;
  asrApiKey: string;
  hasOnboarded: boolean;
  loaded: boolean;
  testing: boolean;
  testResult: 'idle' | 'success' | 'fail';
  testMessage: string;

  /** 从持久层加载设置与密钥 */
  loadSetting: () => Promise<void>;
  /** 保存设置（落库 + 内存） */
  saveSetting: (partial: Partial<AISetting>) => Promise<void>;
  /** 切换提供商（同时更新模型为该提供商默认值） */
  changeProvider: (providerId: LLMProviderId) => Promise<void>;
  /** 保存 LLM Key */
  saveLlmApiKey: (key: string) => Promise<void>;
  /** 保存 ASR Key */
  saveAsrApiKey: (key: string) => Promise<void>;
  /** 清除 LLM Key */
  clearLlmApiKey: () => Promise<void>;
  /** 清除 ASR Key */
  clearAsrApiKey: () => Promise<void>;
  /** 连通性测试 */
  testConnection: () => Promise<boolean>;
  /** 完成引导 */
  completeOnboarding: () => void;
  /** 重置测试状态 */
  resetTest: () => void;
}

const initialSetting: AISetting = { ...DEFAULT_AI_SETTING };

export const useSettingsStore = create<SettingsState>((set, get) => ({
  setting: initialSetting,
  llmApiKey: '',
  asrApiKey: '',
  hasOnboarded: false,
  loaded: false,
  testing: false,
  testResult: 'idle',
  testMessage: '',

  loadSetting: async () => {
    try {
      const setting = await settingsRepository.get();
      const llmApiKey = (await SecureStorage.getLlmKey()) ?? '';
      const asrApiKey = (await SecureStorage.getAsrKey()) ?? '';
      // 已配置 Key 视为已完成引导
      const hasOnboarded = llmApiKey.length > 0;
      set({ setting, llmApiKey, asrApiKey, hasOnboarded, loaded: true });
      logger.info('Settings loaded');
    } catch (err) {
      logger.error('loadSetting failed', err);
      set({ setting: { ...DEFAULT_AI_SETTING }, loaded: true });
    }
  },

  saveSetting: async (partial) => {
    const next = { ...get().setting, ...partial };
    // 温度/maxTokens 边界校验
    next.temperature = Math.max(0, Math.min(2, next.temperature));
    next.maxTokens = Math.max(256, Math.min(8192, next.maxTokens));
    set({ setting: next });
    try {
      await settingsRepository.save(next);
      logger.debug('Setting saved to DB');
    } catch (err) {
      logger.error('saveSetting persist failed', err);
    }
  },

  changeProvider: async (providerId) => {
    const provider = ProviderFactory.create(providerId);
    await get().saveSetting({
      llmProvider: providerId,
      llmModel: provider.defaultModel,
      visionModel: provider.defaultVisionModel,
    });
  },

  saveLlmApiKey: async (key) => {
    await SecureStorage.setLlmKey(key);
    set({ llmApiKey: key, hasOnboarded: key.length > 0 });
  },

  saveAsrApiKey: async (key) => {
    await SecureStorage.setAsrKey(key);
    set({ asrApiKey: key });
  },

  clearLlmApiKey: async () => {
    await SecureStorage.deleteLlmKey();
    set({ llmApiKey: '', hasOnboarded: false });
  },

  clearAsrApiKey: async () => {
    await SecureStorage.deleteAsrKey();
    set({ asrApiKey: '' });
  },

  testConnection: async () => {
    const { setting, llmApiKey } = get();
    if (!llmApiKey) {
      set({ testResult: 'fail', testMessage: '请先配置 API Key' });
      return false;
    }
    set({ testing: true, testResult: 'idle', testMessage: '' });
    try {
      const provider = ProviderFactory.create(setting.llmProvider);
      const ok = await provider.testConnection(llmApiKey, setting.llmModel);
      set({
        testing: false,
        testResult: ok ? 'success' : 'fail',
        testMessage: ok ? '连接成功' : '连接失败，请检查 API Key 与网络',
      });
      return ok;
    } catch (err) {
      const appErr = err as AppError;
      set({
        testing: false,
        testResult: 'fail',
        testMessage: appErr?.message || '连接失败',
      });
      return false;
    }
  },

  completeOnboarding: () => set({ hasOnboarded: true }),

  resetTest: () => set({ testing: false, testResult: 'idle', testMessage: '' }),
}));

/**
 * 校验 temperature / maxTokens 输入。
 */
export function validateTemperature(v: number): number {
  if (Number.isNaN(v)) return 0.7;
  return Math.max(0, Math.min(2, Math.round(v * 10) / 10));
}

export function validateMaxTokens(v: number): number {
  if (Number.isNaN(v)) return 2000;
  return Math.max(256, Math.min(8192, Math.floor(v)));
}

export { INPUT_LIMITS };
