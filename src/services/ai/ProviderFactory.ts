/**
 * @file services/ai/ProviderFactory.ts
 * @description 工厂模式创建 Provider。按 providerId 返回对应实例。
 */

import type { LLMProviderId } from '../../types';
import { BaseLLMProvider } from './BaseLLMProvider';
import { QwenProvider } from './providers/QwenProvider';
import { GLMProvider } from './providers/GLMProvider';
import { ErnieProvider } from './providers/ErnieProvider';
import { createAppError } from './httpClient';

/**
 * Provider 工厂。
 */
export class ProviderFactory {
  /** 缓存实例（无状态，可复用） */
  private static cache: Partial<Record<LLMProviderId, BaseLLMProvider>> = {};

  /**
   * 按 providerId 创建 Provider 实例。
   */
  static create(providerId: LLMProviderId): BaseLLMProvider {
    const cached = this.cache[providerId];
    if (cached) return cached;

    let instance: BaseLLMProvider;
    switch (providerId) {
      case 'qwen':
        instance = new QwenProvider();
        break;
      case 'glm':
        instance = new GLMProvider();
        break;
      case 'ernie':
        instance = new ErnieProvider();
        break;
      default:
        throw createAppError('INVALID_PROVIDER', `未知的提供商: ${providerId as string}`);
    }
    this.cache[providerId] = instance;
    return instance;
  }

  /**
   * 获取全部 Provider 实例（用于遍历）。
   */
  static getAll(): BaseLLMProvider[] {
    return [
      this.create('qwen'),
      this.create('glm'),
      this.create('ernie'),
    ];
  }
}
