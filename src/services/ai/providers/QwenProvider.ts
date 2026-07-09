/**
 * @file services/ai/providers/QwenProvider.ts
 * @description 通义千问（DashScope OpenAI 兼容模式）。
 *              支持原生音频模型 qwen2-audio，复用 LLM Key 即可转写语音。
 */

import { BaseLLMProvider } from '../BaseLLMProvider';
import type { LLMProviderId } from '../../../types';

export class QwenProvider extends BaseLLMProvider {
  readonly id: LLMProviderId = 'qwen';
  readonly name = '通义千问';
  readonly baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  readonly defaultModel = 'qwen-plus';
  readonly defaultVisionModel = 'qwen-vl-plus';
  /** qwen2-audio 原生支持音频 */
  readonly supportsAudio = true;
  readonly defaultAudioModel = 'qwen2-audio-instruct';
}
