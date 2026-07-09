/**
 * @file constants/providers.ts
 * @description 三家 LLM/ASR 提供商的静态配置（与 ProviderFactory 对应）。
 *              此处为常量描述，供 UI（设置页 ProviderSelector）展示。
 */

import type { LLMProviderId } from '../types';

/** 提供商元信息（用于 UI 展示与文档说明） */
export interface ProviderMeta {
  id: LLMProviderId;
  name: string;
  description: string;
  /** 默认文本模型 */
  defaultModel: string;
  /** 默认视觉模型 */
  defaultVisionModel: string;
  /** 是否支持原生音频模型（决定 ASR 路由） */
  supportsAudio: boolean;
  /** 音频模型名（无则空串） */
  defaultAudioModel: string;
  /** 官网申请 Key 地址 */
  keyUrl: string;
  /** 是否需要独立的 ASR Key（不支持音频模型时为 true） */
  needsAsrKey: boolean;
}

/** 三家提供商配置 */
export const PROVIDERS: Record<LLMProviderId, ProviderMeta> = {
  qwen: {
    id: 'qwen',
    name: '通义千问',
    description: '阿里云 DashScope，支持图文与原生音频，复用 LLM Key 即可转写语音。',
    defaultModel: 'qwen-plus',
    defaultVisionModel: 'qwen-vl-plus',
    supportsAudio: true,
    defaultAudioModel: 'qwen2-audio-instruct',
    keyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    needsAsrKey: false,
  },
  glm: {
    id: 'glm',
    name: '智谱GLM',
    description: '智谱 AI 开放平台，支持图文，语音转写将使用通义千问 paraformer（需独立 ASR Key）。',
    defaultModel: 'glm-4-plus',
    defaultVisionModel: 'glm-4v-plus',
    supportsAudio: false,
    defaultAudioModel: '',
    keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    needsAsrKey: true,
  },
  ernie: {
    id: 'ernie',
    name: '文心一言',
    description: '百度千帆 v2，支持图文，语音转写将使用通义千问 paraformer（需独立 ASR Key）。',
    defaultModel: 'ernie-4.0-8k',
    defaultVisionModel: 'ernie-4.5-vl-preview',
    supportsAudio: false,
    defaultAudioModel: '',
    keyUrl: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application',
    needsAsrKey: true,
  },
};

/** 提供商列表（用于遍历渲染） */
export const PROVIDER_LIST: ProviderMeta[] = [PROVIDERS.qwen, PROVIDERS.glm, PROVIDERS.ernie];
