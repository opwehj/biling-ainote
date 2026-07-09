/**
 * @file services/ai/BaseLLMProvider.ts
 * @description LLM 提供商抽象基类。三家提供商的 Chat 接口均兼容 OpenAI 格式，
 *              因此基类实现通用逻辑（generateNote / testConnection / prompt 构造 /
 *              解析），子类仅提供配置。
 */

import type {
  LLMProviderId,
  GenerateNoteRequest,
  NoteContent,
} from '../../types';
import { SYSTEM_PROMPT, INPUT_LIMITS } from '../../constants/config';
import { postChatCompletion, type ChatMessage, type ChatContentPart, createAppError } from './httpClient';
import { FileService } from '../storage/FileService';
import logger from '../../utils/logger';

/**
 * LLM 提供商抽象基类。
 */
export abstract class BaseLLMProvider {
  abstract readonly id: LLMProviderId;
  abstract readonly name: string;
  abstract readonly baseURL: string;
  abstract readonly defaultModel: string;
  abstract readonly defaultVisionModel: string;
  /** 是否有原生音频模型（决定 ASR 路由） */
  abstract readonly supportsAudio: boolean;
  /** 音频模型名（无则空串） */
  abstract readonly defaultAudioModel: string;

  /**
   * 构造请求头（Bearer token）。
   */
  protected buildHeaders(apiKey: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
  }

  /**
   * 连通性测试：发一条极简请求。
   * @param apiKey API Key
   * @param model 模型名（可选，默认用 defaultModel）
   */
  async testConnection(apiKey: string, model?: string): Promise<boolean> {
    try {
      const resp = await postChatCompletion(
        this.baseURL,
        apiKey,
        {
          model: model || this.defaultModel,
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 16,
        },
        30_000,
      );
      return !!resp.choices && resp.choices.length > 0;
    } catch (err) {
      logger.warn(`${this.name} testConnection failed`, err);
      return false;
    }
  }

  /**
   * 生成结构化笔记（核心方法）。
   * 将 文本 + 图片(base64) + 转写文本 组装为 OpenAI 多模态消息，
   * 调用视觉模型，要求返回 NoteContent JSON。
   *
   * - 含图片时使用 visionModel；
   * - 纯文本时使用传入 model（更便宜更快）。
   *
   * @param request 生成请求
   * @param apiKey API Key
   * @param options 模型名与温度覆盖
   */
  async generateNote(
    request: GenerateNoteRequest,
    apiKey: string,
    options?: { model?: string; visionModel?: string; temperature?: number; maxTokens?: number },
  ): Promise<NoteContent> {
    const useVision = request.imageUris.length > 0;
    const model = useVision
      ? (options?.visionModel ?? this.defaultVisionModel)
      : (options?.model ?? this.defaultModel);
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 2000;

    // 拼接文本素材：用户文本 + 音频转写文本 + 已有素材文本
    const textSegments: string[] = [];
    if (request.text && request.text.trim()) {
      textSegments.push(request.text.trim());
    }
    // 已有素材中的文本/转写内容
    for (const m of request.materials ?? []) {
      if (m.type === 'text' && m.content) {
        textSegments.push(m.content);
      } else if (m.type === 'audio' && m.transcript) {
        textSegments.push(`【音频转写】\n${m.transcript}`);
      } else if (m.type === 'image' && m.ocrText) {
        textSegments.push(`【图片文字】\n${m.ocrText}`);
      }
    }

    const userText = textSegments.join('\n\n');
    const userContent = await this.buildUserContent(userText, request.imageUris);

    const messages: ChatMessage[] = [
      { role: 'system', content: this.buildSystemPrompt() },
      { role: 'user', content: userContent },
    ];

    logger.info(`${this.name} generating note, model=${model}, images=${request.imageUris.length}`);
    const resp = await postChatCompletion(
      this.baseURL,
      apiKey,
      {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      },
    );

    const raw = resp.choices?.[0]?.message?.content ?? '';
    return this.parseNoteContent(raw);
  }

  /**
   * 经 LLM 音频模型转写音频（Qwen qwen2-audio，OpenAI 兼容接口）。
   * @param audioUri 音频文件 URI
   * @param apiKey API Key
   * @param audioModel 音频模型名
   */
  async transcribeViaAudioModel(
    audioUri: string,
    apiKey: string,
    audioModel: string,
  ): Promise<string> {
    const mimeType = FileService.inferMimeType(audioUri);
    const dataUrl = await FileService.readAsDataUrl(audioUri, mimeType);

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: '请将这段音频转写为文字，只输出转写文本，不要添加额外说明。' },
          { type: 'audio_url', audio_url: { url: dataUrl } },
        ],
      },
    ];

    const resp = await postChatCompletion(
      this.baseURL,
      apiKey,
      {
        model: audioModel,
        messages,
        temperature: 0.2,
        max_tokens: 2000,
      },
    );
    return resp.choices?.[0]?.message?.content?.trim() ?? '';
  }

  /**
   * 构造系统提示词（约束输出 JSON 结构）。
   */
  protected buildSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  /**
   * 构造用户消息内容块（text + image_url[]）。
   * 纯文本时返回字符串；含图片时返回多模态内容数组。
   */
  protected async buildUserContent(
    text: string,
    imageUris: string[],
  ): Promise<string | ChatContentPart[]> {
    if (!imageUris || imageUris.length === 0) {
      return text || '（无文本内容，请基于图片生成笔记）';
    }

    const parts: ChatContentPart[] = [];
    if (text && text.trim()) {
      parts.push({ type: 'text', text });
    } else {
      parts.push({ type: 'text', text: '请根据以下图片生成结构化笔记。' });
    }

    // 限制图片数量
    const uris = imageUris.slice(0, INPUT_LIMITS.MAX_IMAGE_COUNT);
    for (const uri of uris) {
      try {
        const dataUrl = await this.imageToDataUrl(uri);
        parts.push({ type: 'image_url', image_url: { url: dataUrl } });
      } catch (err) {
        logger.warn('imageToDataUrl failed, skip image:', uri, err);
      }
    }
    return parts;
  }

  /**
   * 将图片 URI 读为 base64 data URL。
   */
  protected async imageToDataUrl(uri: string): Promise<string> {
    const mimeType = FileService.inferMimeType(uri);
    return FileService.readAsDataUrl(uri, mimeType);
  }

  /**
   * 解析 LLM 返回的 JSON 为 NoteContent（含容错）。
   * 1. 尝试直接 JSON.parse；
   * 2. 失败则用正则提取 {...} 块再解析；
   * 3. 仍失败则降级：原文作为 content，标题/摘要留空。
   */
  protected parseNoteContent(raw: string): NoteContent {
    const fallback: NoteContent = {
      title: '未命名笔记',
      summary: '',
      keyPoints: [],
      content: raw || '（生成内容为空）',
      tags: [],
    };

    if (!raw) return fallback;

    // 去除可能的 markdown 代码块标记
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    // 尝试直接解析
    try {
      return this.normalizeNoteContent(JSON.parse(cleaned));
    } catch {
      // 继续尝试正则提取
    }

    // 正则提取最外层 {...}
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return this.normalizeNoteContent(JSON.parse(match[0]));
      } catch {
        // 继续
      }
    }

    logger.warn('parseNoteContent: JSON parse failed, using fallback');
    return { ...fallback, content: raw };
  }

  /**
   * 规范化解析结果，确保字段类型与数量约束。
   */
  private normalizeNoteContent(obj: unknown): NoteContent {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('invalid note content');
    }
    const o = obj as Record<string, unknown>;
    const toStringArr = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
      if (typeof v === 'string') return v.split(/[、,，\n]/).map((s) => s.trim()).filter(Boolean);
      return [];
    };
    const tags = toStringArr(o.tags).slice(0, INPUT_LIMITS.MAX_TAGS);
    return {
      title: typeof o.title === 'string' && o.title ? o.title : '未命名笔记',
      summary: typeof o.summary === 'string' ? o.summary : '',
      keyPoints: toStringArr(o.keyPoints),
      content: typeof o.content === 'string' && o.content ? o.content : (typeof o.summary === 'string' ? o.summary : ''),
      tags,
    };
  }
}
