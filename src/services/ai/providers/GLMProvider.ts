/**
 * @file services/ai/providers/GLMProvider.ts
 * @description 智谱 GLM（BigModel OpenAI 兼容模式）。
 *              无原生音频模型，ASR 回退到 DashScope paraformer（需独立 ASR Key）。
 */

import { BaseLLMProvider } from '../BaseLLMProvider';
import type { LLMProviderId } from '../../../types';

export class GLMProvider extends BaseLLMProvider {
  readonly id: LLMProviderId = 'glm';
  readonly name = '智谱GLM';
  readonly baseURL = 'https://open.bigmodel.cn/api/paas/v4';
  readonly defaultModel = 'glm-4-plus';
  readonly defaultVisionModel = 'glm-4v-plus';
  /** 无原生音频模型，回退 paraformer */
  readonly supportsAudio = false;
  readonly defaultAudioModel = '';
}
