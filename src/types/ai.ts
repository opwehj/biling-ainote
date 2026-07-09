/**
 * @file types/ai.ts
 * @description AI 相关类型：提供商标识、AI 设置、NoteContent、生成请求与进度。
 *              密钥不进 SQLite，仅存 SecureStore。
 */

import type { Material } from './note';
import type { SortOrder } from './note';

/** LLM 提供商标识 */
export type LLMProviderId = 'qwen' | 'glm' | 'ernie';

/** 主题模式 */
export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * AI 设置（非敏感部分存 SQLite，密钥存 SecureStore）。
 */
export interface AISetting {
  llmProvider: LLMProviderId;
  llmModel: string;
  visionModel: string;
  asrEnabled: boolean;
  temperature: number;
  maxTokens: number;
  themeMode: ThemeMode;
  sortOrder: SortOrder;
}

/**
 * AI 输出的结构化笔记内容（LLM 返回 JSON，由 parseNoteContent 解析）。
 */
export interface NoteContent {
  title: string;
  summary: string;
  keyPoints: string[];
  /** Markdown 正文 */
  content: string;
  tags: string[];
}

/**
 * 生成笔记请求。
 */
export interface GenerateNoteRequest {
  /** 用户输入文本 */
  text: string;
  /** 图片文件 URI 列表 */
  imageUris: string[];
  /** 音频文件 URI 列表 */
  audioUris: string[];
  /** 已有素材（编辑重生成时使用） */
  materials: Material[];
}

/** 生成进度阶段 */
export type GenerationPhase =
  | 'idle'
  | 'transcribing'
  | 'recognizing'
  | 'generating'
  | 'done'
  | 'error';

/** 进度回调载荷 */
export interface GenerationProgress {
  phase: GenerationPhase;
  message: string;
  detail?: string;
}

/**
 * 统一错误类型。服务层抛出，UI 层捕获后 toast 提示。
 */
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * API Key 命名空间常量（SecureStore 键名前缀）。
 */
export const SECURE_KEY = {
  LLM_API_KEY: 'biling.llm_api_key',
  ASR_API_KEY: 'biling.asr_api_key',
} as const;

/** 生成笔记结果 */
export interface GenerateNoteResult {
  content: NoteContent;
  materials: Material[];
}
