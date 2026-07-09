/**
 * @file services/ai/providers/ErnieProvider.ts
 * @description 文心一言（百度千帆 v2 OpenAI 兼容模式，Bearer 鉴权）。
 *              无原生音频模型，ASR 回退到 DashScope paraformer（需独立 ASR Key）。
 */

import { BaseLLMProvider } from '../BaseLLMProvider';
import type { LLMProviderId } from '../../../types';

export class ErnieProvider extends BaseLLMProvider {
  readonly id: LLMProviderId = 'ernie';
  readonly name = '文心一言';
  readonly baseURL = 'https://qianfan.baidubce.com/v2';
  readonly defaultModel = 'ernie-4.0-8k';
  readonly defaultVisionModel = 'ernie-4.5-vl-preview';
  /** 无原生音频模型，回退 paraformer */
  readonly supportsAudio = false;
  readonly defaultAudioModel = '';
}
